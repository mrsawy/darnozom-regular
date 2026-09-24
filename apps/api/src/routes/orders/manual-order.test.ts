import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, orderItems, books, type NewBook } from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /store/orders with the manual-transfer methods (Vodafone Cash,
// InstaPay). Real DB like create-order.test.ts; external boundaries stubbed.
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-manual-order-";
const OWNER = `${TEST_USER_PREFIX}owner`;

const { instructionsMock, syncOrderMock } = vi.hoisted(() => ({
  instructionsMock: vi.fn(async () => ({ ok: true })),
  syncOrderMock: vi.fn(async () => ({ medusaOrderId: "order_medusa_1" })),
}));

vi.mock("@workspace/payment-gateways", () => ({
  createPayPalOrder: vi.fn(),
  capturePayPalOrder: vi.fn(),
  fetchEgpToUsdRate: vi.fn(),
  convertEgpToUsd: vi.fn(),
}));

vi.mock("../../lib/medusa-admin", () => ({ medusaAdmin: vi.fn() }));

vi.mock("../../lib/email/email", async (orig) => ({
  ...(await orig<typeof import("../../lib/email/email")>()),
  sendManualPaymentInstructions: instructionsMock,
  sendAdminSalesNotification: vi.fn(async () => ({ ok: true })),
  sendOrderPlacedConfirmation: vi.fn(async () => ({ ok: true })),
}));

vi.mock("../../lib/medusa-order-sync", () => ({
  syncMedusaOrder: syncOrderMock,
  markMedusaOrderPaidForDarnozomOrder: vi.fn(),
  ensureMedusaOrderPayable: vi.fn(),
  findMedusaOrderIdByDarnozomId: vi.fn(),
}));

vi.mock("../../lib/medusa-customer-sync", () => ({
  syncMedusaCustomer: vi.fn(async () => ({ customerId: null })),
}));

vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (_req: express.Request, res: express.Response) =>
    res.status(401).json({ error: "Unauthorized" }),
  optionalAuth: (
    req: express.Request & { userId?: string; userEmail?: string },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (uid) {
      req.userId = uid;
      req.userEmail = "buyer@example.com";
    }
    next();
  },
}));

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (_req: express.Request, res: express.Response) =>
    res.status(403).json({ error: "Forbidden" }),
}));

vi.mock("@workspace/object-store", () => ({
  ObjectStorageService: class {
    getPrivateObjectDir() {
      return "test-bucket/private";
    }
  },
  objectStorageClient: { bucket: () => ({ file: () => ({}) }) },
}));

const { default: ordersRouter } = await import("./index");

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as unknown as { log: unknown }).log = { info() {}, warn() {}, error() {}, debug() {} };
  next();
});
app.use(ordersRouter);

const seededBookIds: number[] = [];

async function seedBook(overrides: Partial<NewBook> = {}): Promise<number> {
  const [row] = await db
    .insert(books)
    .values({
      title: "Test Manual Book",
      category: "management",
      status: "available",
      currency: "EGP",
      paperAvailable: false,
      digitalAvailable: true,
      digitalPrice: "250.00",
      digitalFileUrl: "internal://book-pdfs/test-manual",
      ...overrides,
    })
    .returning();
  seededBookIds.push(row.id);
  return row.id;
}

function placeOrder(paymentMethod: string, bookId: number) {
  return request(app)
    .post("/store/orders")
    .set("x-test-user", OWNER)
    .send({
      fullName: "Manual Buyer",
      phone: "01012345678",
      paymentMethod,
      items: [{ productType: "book", productId: bookId, quantity: 1, format: "digital" }],
    });
}

afterEach(async () => {
  instructionsMock.mockClear();
  syncOrderMock.mockClear();
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  await db.delete(orders).where(eq(orders.userEmail, "guest-digital@example.com"));
});

afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  if (seededBookIds.length) await db.delete(books).where(inArray(books.id, seededBookIds));
});

describe("POST /store/orders — manual transfers", () => {
  for (const method of ["vodafone_cash", "instapay"] as const) {
    it(`accepts ${method} for a digital book, pending, and stores medusaOrderId`, async () => {
      const bookId = await seedBook();
      const res = await placeOrder(method, bookId);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ok: true, paymentMethod: method, paymentStatus: "pending" });
      const [row] = await db.select().from(orders).where(eq(orders.id, res.body.id));
      expect(row.paymentStatus).toBe("pending");
      expect(row.medusaOrderId).toBe("order_medusa_1");
      expect(instructionsMock).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: res.body.id, paymentMethod: method, totalAmount: "250.00" }),
      );
    });
  }

  it("rejects non-EGP carts for manual transfers", async () => {
    const bookId = await seedBook({ currency: "USD", digitalPrice: "20.00" });
    const res = await placeOrder("instapay", bookId);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/EGP/);
  });

  it("still creates the order when the Medusa mirror fails (medusaOrderId stays null)", async () => {
    syncOrderMock.mockRejectedValueOnce(new Error("medusa down"));
    const bookId = await seedBook({ digitalPrice: "100.00" });
    const res = await placeOrder("vodafone_cash", bookId);
    expect(res.status).toBe(201);
    const [row] = await db.select().from(orders).where(eq(orders.id, res.body.id));
    expect(row.medusaOrderId).toBeNull();
  });
});

describe("sendManualPaymentInstructionsHtml", () => {
  it("links to the instructions page with orderId and email", async () => {
    const { sendManualPaymentInstructionsHtml } = await vi.importActual<
      typeof import("../../lib/email/email")
    >("../../lib/email/email");
    const html = sendManualPaymentInstructionsHtml({
      orderId: 12,
      customerName: "A",
      paymentMethod: "instapay",
      totalAmount: "250.00",
      currency: "EGP",
      to: "a+b@x.com",
    });
    expect(html).toContain("/checkout/manual?orderId=12&amp;email=a%2Bb%40x.com");
  });
});

describe("POST /store/orders — digital books need an account", () => {
  it("rejects a guest cart that contains a digital book", async () => {
    const bookId = await seedBook();
    const res = await request(app)
      .post("/store/orders")
      .send({
        fullName: "Guest",
        email: "guest-digital@example.com",
        phone: "01012345678",
        paymentMethod: "vodafone_cash",
        items: [{ productType: "book", productId: bookId, quantity: 1, format: "digital" }],
      });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/sign in/i);
    const rows = await db.select().from(orders).where(eq(orders.userEmail, "guest-digital@example.com"));
    expect(rows).toHaveLength(0);
  });

  it("stores the bought variant on each order line", async () => {
    const bookId = await seedBook();
    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Manual Buyer",
        phone: "01012345678",
        paymentMethod: "vodafone_cash",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital", variantId: "variant_dig_1" },
        ],
      });
    expect(res.status).toBe(201);
    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, res.body.id));
    expect(item.variantId).toBe("variant_dig_1");
  });
});
