import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  db,
  orders,
  orderItems,
  books,
  shippingRates,
  type NewBook,
} from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Money-sensitive integration tests for order *creation* (POST /store/orders).
// These verify the checkout amount actually charged matches the order total:
//   - prices are resolved server-side (a client-supplied price is ignored),
//   - the EGP total is converted to USD and recorded on the order,
//   - mixed-currency carts are rejected,
//   - digital books cannot be paid cash-on-delivery,
//   - shipping is added only when a paper item is present.
//
// Like the capture tests, these hit the REAL database (rows are seeded and
// cleaned up) but stub the external boundaries: PayPal (network), the
// EGP→USD conversion, and the auth middleware (user id + email).
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-create-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const TEST_CITY = "TestCreateCity";
const SHIPPING_PRICE = 50;

// Per-test-controllable mocks for the money boundaries. The route composes
// `const rate = await fetchEgpToUsdRate(); convertEgpToUsd(egp, rate)`
// (moved from apps/api/src/lib/currency.ts into
// @workspace/payment-gateways/src/exchange-rate.ts in Task 16). rateMock
// drives the rate-fetch step (and can be rejected to simulate "rate
// unavailable"); convertMock receives the real EGP amount and rate the route
// computed and returns the USD string synchronously, same as the real
// convertEgpToUsd.
const { createMock, rateMock, convertMock, medusaAdminMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  rateMock: vi.fn(),
  convertMock: vi.fn(),
  medusaAdminMock: vi.fn(),
}));

vi.mock("@workspace/payment-gateways", () => ({
  createPayPalOrder: createMock,
  capturePayPalOrder: vi.fn(),
  fetchEgpToUsdRate: rateMock,
  convertEgpToUsd: convertMock,
}));

// Medusa-native books (lookupBookProduct) resolve through the Admin API
// instead of the legacy `books` table — mock the HTTP boundary the same way
// PayPal/exchange-rate are mocked above. seedMedusaProduct below is the
// counterpart to seedBook for these tests.
vi.mock("../../lib/medusa-admin", () => ({
  medusaAdmin: medusaAdminMock,
}));

// Stub auth: trust an `x-test-user` header instead of a session. Absent → 401.
vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (
    req: express.Request & { userId?: string; userEmail?: string },
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = uid;
    req.userEmail = "buyer@example.com";
    next();
  },
}));

// Stub admin middleware (admin routes are not exercised here).
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (_req: express.Request, res: express.Response) =>
    res.status(403).json({ error: "Forbidden" }),
}));

// Stub object storage so importing the router doesn't require real GCS.
vi.mock("@workspace/object-store", () => ({
  ObjectStorageService: class {
    getPrivateObjectDir() {
      return "test-bucket/private";
    }
  },
  objectStorageClient: {
    bucket: () => ({ file: () => ({}) }),
  },
}));

// Import the router only AFTER the mocks are registered.
const { default: ordersRouter } = await import("./index");

function makeApp() {
  const app = express();
  app.use(express.json());
  const noopLog = { info() {}, warn() {}, error() {}, debug() {} };
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = noopLog;
    next();
  });
  app.use(ordersRouter);
  return app;
}

const app = makeApp();

// Track seeded book ids so we can clean them up (books use serial ids).
const seededBookIds: number[] = [];

async function seedBook(overrides: Partial<NewBook> = {}): Promise<number> {
  const [row] = await db
    .insert(books)
    .values({
      title: "Test Create Book",
      category: "management",
      status: "available",
      currency: "EGP",
      paperAvailable: true,
      paperPrice: "150.00",
      digitalAvailable: true,
      digitalPrice: "100.00",
      digitalFileUrl: "internal://book-pdfs/test-object-id",
      ...overrides,
    })
    .returning();
  seededBookIds.push(row.id);
  return row.id;
}

// Builds a fake Medusa Admin API product response and wires medusaAdminMock
// to return it for any /admin/products/:id request, matching the shape
// lib/medusa-book-variants.ts's fetchBookProduct expects. Mirrors how
// migrate-books.ts (and a hand-created Admin product) shape variants: one
// option ("Format"/"الحالة"), paper/digital priced in EGP.
function mockMedusaProduct(opts: {
  id: string;
  title?: string;
  paperPrice?: number;
  digitalPrice?: number;
  paperInStock?: boolean;
  digitalInStock?: boolean;
}) {
  const variants: Array<Record<string, unknown>> = [];
  if (opts.paperPrice !== undefined) {
    variants.push({
      id: `${opts.id}-variant-paper`,
      title: "Paper",
      metadata: { kind: "paper" },
      options: [{ value: "Paper" }],
      prices: [{ currency_code: "egp", amount: opts.paperPrice }],
      manage_inventory: opts.paperInStock === false,
      allow_backorder: false,
      inventory_quantity: opts.paperInStock === false ? 0 : null,
    });
  }
  if (opts.digitalPrice !== undefined) {
    variants.push({
      id: `${opts.id}-variant-digital`,
      title: "Digital",
      metadata: { kind: "digital" },
      options: [{ value: "Digital" }],
      prices: [{ currency_code: "egp", amount: opts.digitalPrice }],
      manage_inventory: opts.digitalInStock === false,
      allow_backorder: false,
      inventory_quantity: opts.digitalInStock === false ? 0 : null,
    });
  }
  medusaAdminMock.mockImplementation(async (path: string) => {
    if (path.startsWith(`/admin/products/${opts.id}`)) {
      return {
        product: {
          id: opts.id,
          title: opts.title ?? "Test Medusa Book",
          status: "published",
          thumbnail: null,
          metadata: {},
          variants,
        },
      };
    }
    // Order creation also fires a best-effort Medusa customer sync
    // (syncMedusaCustomer) — respond as "no existing customer, created one"
    // so it succeeds quietly here; medusa-customer-sync.test.ts covers its
    // find-vs-create behavior directly.
    if (path.startsWith("/admin/customers?")) return { customers: [] };
    if (path === "/admin/customers") return { customer: { id: "cus_test", email: "buyer@example.com" } };
    // Order sync (syncMedusaOrder) — best-effort; return minimal stubs so
    // create-order tests aren't noisy when the sync path fires.
    if (path.startsWith("/admin/regions")) return { regions: [{ id: "reg_test" }] };
    if (path.startsWith("/admin/sales-channels")) return { sales_channels: [{ id: "sc_test" }] };
    if (path === "/admin/draft-orders") return { draft_order: { id: "order_synced" } };
    if (path.includes("/convert-to-order")) return { order: { id: "order_synced" } };
    throw new Error(`Unexpected medusaAdmin call in test: ${path}`);
  });
}

async function getOrder(id: number) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row;
}

async function getItems(orderId: number) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

async function cleanup() {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  if (seededBookIds.length) {
    await db.delete(books).where(inArray(books.id, seededBookIds));
    seededBookIds.length = 0;
  }
  await db.delete(shippingRates).where(eq(shippingRates.city, TEST_CITY));
}

beforeAll(async () => {
  await cleanup();
  await db
    .insert(shippingRates)
    .values({
      city: TEST_CITY,
      price: String(SHIPPING_PRICE),
      currency: "EGP",
      isDefault: false,
    });
});

beforeEach(() => {
  // Default happy-path stubs; individual tests may override.
  rateMock.mockResolvedValue(0.0325);
  convertMock.mockReturnValue("3.25");
  createMock.mockResolvedValue({
    id: "PP-TEST-ORDER",
    approveUrl: "https://paypal.example/approve",
  });
});

afterEach(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  createMock.mockReset();
  rateMock.mockReset();
  convertMock.mockReset();
  medusaAdminMock.mockReset();
});

afterAll(async () => {
  await cleanup();
});

describe("POST /store/orders — price resolution", () => {
  it("ignores any client-supplied price and totals from the DB price", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          {
            productType: "book",
            productId: bookId,
            quantity: 2,
            format: "digital",
            // Malicious client price — must be ignored server-side.
            unitPrice: "0.01",
            price: "0.01",
          },
        ],
      });

    expect(res.status).toBe(201);
    const order = await getOrder(res.body.id);
    // 100.00 (DB digital price) * 2 = 200.00; no shipping for a digital item.
    expect(order.totalAmount).toBe("200.00");
    expect(order.shippingTotal).toBe("0.00");

    const items = await getItems(order.id);
    expect(items).toHaveLength(1);
    expect(items[0].unitPrice).toBe("100.00");

    // The authoritative EGP grand total is what gets converted.
    expect(convertMock).toHaveBeenCalledWith(200, 0.0325);
  });
});

describe("POST /store/orders — EGP→USD conversion recorded", () => {
  it("stores the converted USD amount and exchange rate on the order", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });
    rateMock.mockResolvedValue(0.0325);
    convertMock.mockReturnValue("3.25");

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(201);
    const order = await getOrder(res.body.id);
    expect(order.currency).toBe("EGP");
    expect(order.totalAmount).toBe("100.00");
    expect(order.usdAmount).toBe("3.25");
    expect(order.exchangeRate).toBe("0.0325");
    expect(order.paypalOrderId).toBe("PP-TEST-ORDER");
    expect(order.paymentStatus).toBe("pending");

    // PayPal must be created with the exact converted USD figure — the amount
    // actually charged — not any EGP or client value.
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toMatchObject({ usdAmount: "3.25" });
  });

  it("fails the order (503) and never calls PayPal when conversion fails", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });
    rateMock.mockRejectedValue(new Error("rate unavailable"));

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(503);
    expect(createMock).not.toHaveBeenCalled();
    expect(res.body.id).toBeUndefined();

    // The dangling order should be marked failed, not left pending.
    const [row] = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, OWNER));
    expect(row.paymentStatus).toBe("failed");
    expect(row.usdAmount).toBeNull();
  });
});

describe("POST /store/orders — mixed-currency rejection", () => {
  it("rejects a cart mixing EGP and USD items", async () => {
    const egpBook = await seedBook({ digitalPrice: "100.00", currency: "EGP" });
    const usdBook = await seedBook({ digitalPrice: "10.00", currency: "USD" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          { productType: "book", productId: egpBook, quantity: 1, format: "digital" },
          { productType: "book", productId: usdBook, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mixed currency/i);
    expect(createMock).not.toHaveBeenCalled();
    // No order should have been persisted for a rejected cart.
    const rows = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(rows).toHaveLength(0);
  });
});

describe("POST /store/orders — digital + cash-on-delivery rejection", () => {
  it("rejects a digital book paid by cash on delivery", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "cash_on_delivery",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cash on delivery/i);
    const rows = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(rows).toHaveLength(0);
  });
});

describe("POST /store/orders — shipping only for paper items", () => {
  it("adds shipping when a paper item is present", async () => {
    const bookId = await seedBook({ paperPrice: "150.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "paper" },
        ],
      });

    expect(res.status).toBe(201);
    const order = await getOrder(res.body.id);
    // 150.00 item + 50.00 shipping = 200.00.
    expect(order.shippingTotal).toBe("50.00");
    expect(order.totalAmount).toBe("200.00");
    expect(order.shippingCity).toBe(TEST_CITY);
    // The shipping-inclusive EGP total is what gets converted / charged.
    expect(convertMock).toHaveBeenCalledWith(200, 0.0325);
  });

  it("does not add shipping for a digital-only order even if a city is sent", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        city: TEST_CITY,
        address: "123 Test St",
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(201);
    const order = await getOrder(res.body.id);
    expect(order.shippingTotal).toBe("0.00");
    expect(order.totalAmount).toBe("100.00");
    expect(order.shippingCity).toBeNull();
    expect(convertMock).toHaveBeenCalledWith(100, 0.0325);
  });

  it("rejects a paper order when the city has no shipping rate", async () => {
    const bookId = await seedBook({ paperPrice: "150.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: "NoRateCity",
        paymentMethod: "paypal",
        returnUrl: "https://shop.example/return",
        cancelUrl: "https://shop.example/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "paper" },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/shipping is not available/i);
    expect(createMock).not.toHaveBeenCalled();
  });
});

// Regression coverage for the bug reported against كتاب الرحيق المختوم: a
// book created directly in Medusa Admin (no legacyBookId, variants matched
// by option value, not migrate-books.ts's metadata.kind) was un-orderable
// because lookupProduct only ever queried the legacy `books` table by
// integer id. These exercise lookupBookProduct's Medusa branch directly,
// the same way the real checkout path (cart-context.tsx's
// legacyProductId ?? productId) now always sends a "prod_..." id for books.
describe("POST /store/orders — Medusa-native book (no legacy books row)", () => {
  it("orders a paper book resolved entirely from the Medusa Admin API", async () => {
    mockMedusaProduct({ id: "prod_test_reheeq", title: "كتاب الرحيق المختوم", paperPrice: 600 });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "cash_on_delivery",
        items: [
          { productType: "book", productId: "prod_test_reheeq", quantity: 3, format: "paper" },
        ],
      });

    expect(res.status).toBe(201);
    const order = await getOrder(res.body.id);
    // 600.00 * 3 = 1800.00 + 50.00 shipping.
    expect(order.totalAmount).toBe("1850.00");
    expect(order.currency).toBe("EGP");

    const items = await getItems(order.id);
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("prod_test_reheeq");
    expect(items[0].unitPrice).toBe("600.00");
    expect(items[0].productTitle).toBe("كتاب الرحيق المختوم");
  });

  it("matches a variant by option value when metadata.kind is absent (hand-created Admin product)", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/products/prod_hand_created")) {
        return {
          product: {
            id: "prod_hand_created",
            title: "يدوي الإنشاء",
            status: "published",
            thumbnail: null,
            metadata: {},
            variants: [
              {
                id: "variant_paper",
                title: "ورقي",
                metadata: {},
                options: [{ value: "ورقي" }],
                prices: [{ currency_code: "egp", amount: 50 }],
                manage_inventory: true,
                allow_backorder: false,
                inventory_quantity: 20,
              },
            ],
          },
        };
      }
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      if (path === "/admin/customers") return { customer: { id: "cus_test", email: "buyer@example.com" } };
      throw new Error(`Unexpected medusaAdmin call: ${path}`);
    });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "cash_on_delivery",
        items: [
          { productType: "book", productId: "prod_hand_created", quantity: 1, format: "paper" },
        ],
      });

    expect(res.status).toBe(201);
    const items = await getItems(res.body.id);
    expect(items[0].unitPrice).toBe("50.00");
  });

  it("derives format from variantId when the client omits format (cart expand miss)", async () => {
    mockMedusaProduct({ id: "prod_format_derive", title: "Derive Format Book", paperPrice: 75 });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "cash_on_delivery",
        items: [
          {
            productType: "book",
            productId: "prod_format_derive",
            quantity: 1,
            // format deliberately omitted — what the buggy cart path sent
            variantId: "prod_format_derive-variant-paper",
          },
        ],
      });

    expect(res.status).toBe(201);
    const items = await getItems(res.body.id);
    expect(items[0].format).toBe("paper");
    expect(items[0].unitPrice).toBe("75.00");
  });

  it("rejects an out-of-stock Medusa variant", async () => {
    mockMedusaProduct({ id: "prod_out_of_stock", paperPrice: 100, paperInStock: false });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "cash_on_delivery",
        items: [
          { productType: "book", productId: "prod_out_of_stock", quantity: 1, format: "paper" },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/out of stock/i);
  });

  it("404s when the Medusa product doesn't exist", async () => {
    medusaAdminMock.mockRejectedValue(new Error("Medusa admin GET /admin/products/prod_missing failed (404): not found"));

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "cash_on_delivery",
        items: [
          { productType: "book", productId: "prod_missing", quantity: 1, format: "paper" },
        ],
      });

    expect(res.status).toBe(404);
  });
});

// Regression coverage for a product with more than one edition of the same
// format (e.g. two paper editions) — "format" alone can't tell them apart,
// so checkout must send the exact variantId and the server must resolve
// that specific variant, not just "any paper variant".
describe("POST /store/orders — multiple editions of the same format", () => {
  function mockMultiEditionProduct() {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/products/prod_multi_edition")) {
        return {
          product: {
            id: "prod_multi_edition",
            title: "Multi-Edition Book",
            status: "published",
            thumbnail: null,
            metadata: {},
            variants: [
              {
                id: "variant_paper_standard",
                title: "Paper — Standard",
                metadata: { kind: "paper" },
                options: [{ value: "Standard" }],
                prices: [{ currency_code: "egp", amount: 100 }],
                manage_inventory: false,
                allow_backorder: false,
                inventory_quantity: null,
              },
              {
                id: "variant_paper_deluxe",
                title: "Paper — Deluxe",
                metadata: { kind: "paper" },
                options: [{ value: "Deluxe" }],
                prices: [{ currency_code: "egp", amount: 250 }],
                manage_inventory: false,
                allow_backorder: false,
                inventory_quantity: null,
              },
            ],
          },
        };
      }
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      if (path === "/admin/customers") return { customer: { id: "cus_test" } };
      throw new Error(`Unexpected medusaAdmin call in test: ${path}`);
    });
  }

  it("resolves the exact variant sent, not just the first matching format", async () => {
    mockMultiEditionProduct();

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "cash_on_delivery",
        items: [
          {
            productType: "book",
            productId: "prod_multi_edition",
            variantId: "variant_paper_deluxe",
            quantity: 1,
            format: "paper",
          },
        ],
      });

    expect(res.status).toBe(201);
    const items = await getItems(res.body.id);
    // Deluxe (250.00), not Standard (100.00) — proves variantId, not just
    // format, drove the resolution.
    expect(items[0].unitPrice).toBe("250.00");
  });

  it("falls back to the first in-stock variant of that format when no variantId is sent (back-compat)", async () => {
    mockMultiEditionProduct();

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        address: "123 Test St",
        city: TEST_CITY,
        paymentMethod: "cash_on_delivery",
        items: [
          { productType: "book", productId: "prod_multi_edition", quantity: 1, format: "paper" },
        ],
      });

    expect(res.status).toBe(201);
    const items = await getItems(res.body.id);
    expect(items[0].unitPrice).toBe("100.00");
  });

  it("errors clearly when the requested variantId no longer matches the product", async () => {
    mockMultiEditionProduct();

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "cash_on_delivery",
        items: [
          {
            productType: "book",
            productId: "prod_multi_edition",
            variantId: "variant_does_not_exist",
            quantity: 1,
            format: "paper",
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer available/i);
  });
});
