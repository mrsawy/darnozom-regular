import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, books, type NewBook, type NewOrder } from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Money-sensitive integration tests for the card payment path (Paymob).
// Card orders are charged in EGP directly — no USD conversion. The flow is:
// create order (paymentMethod "card") → Paymob order id + hosted iframe URL →
// webhook / confirm poll flips the order to paid. These hit the REAL database
// (rows are seeded and cleaned up) but stub the external boundaries: Paymob
// (network), PayPal (still used by the redirect flow) and auth.
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-card-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const STRANGER = `${TEST_USER_PREFIX}stranger`;

// Per-test-controllable mocks for the money boundaries.
const {
  redirectCreateMock,
  captureMock,
  rateMock,
  convertMock,
  configMock,
  paymobConfiguredMock,
  paymobCreateMock,
  paymobRegenUrlMock,
  paymobStatusMock,
  paymobVerifyHmacMock,
  paidNotificationsMock,
} = vi.hoisted(() => ({
  redirectCreateMock: vi.fn(),
  captureMock: vi.fn(),
  rateMock: vi.fn(),
  convertMock: vi.fn(),
  configMock: vi.fn(),
  paymobConfiguredMock: vi.fn(),
  paymobCreateMock: vi.fn(),
  paymobRegenUrlMock: vi.fn(),
  paymobStatusMock: vi.fn(),
  paymobVerifyHmacMock: vi.fn(),
  paidNotificationsMock: vi.fn(),
}));

vi.mock("@workspace/payment-gateways", () => ({
  createPayPalOrder: redirectCreateMock,
  capturePayPalOrder: captureMock,
  getPayPalClientConfig: configMock,
  isPaymobConfigured: paymobConfiguredMock,
  isPaymobWalletConfigured: vi.fn(() => false),
  createPaymobCheckout: paymobCreateMock,
  createPaymobCheckoutUrlForExistingOrder: paymobRegenUrlMock,
  createPaymobWalletPayment: vi.fn(),
  createPaymobWalletRedirectForExistingOrder: vi.fn(),
  getPaymobTransactionStatus: paymobStatusMock,
  verifyPaymobWebhookHmac: paymobVerifyHmacMock,
  fetchEgpToUsdRate: rateMock,
  convertEgpToUsd: convertMock,
}));

// Keep paid-order side effects (emails, entitlements) out of these tests.
vi.mock("../../lib/email/orderPaidNotifications", () => ({
  sendOrderPaidNotifications: paidNotificationsMock,
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
      title: "Test Card Book",
      category: "management",
      status: "available",
      currency: "EGP",
      paperAvailable: false,
      digitalAvailable: true,
      digitalPrice: "100.00",
      digitalFileUrl: "internal://book-pdfs/test-object-id",
      ...overrides,
    })
    .returning();
  seededBookIds.push(row.id);
  return row.id;
}

async function seedCardOrder(overrides: Partial<NewOrder> = {}): Promise<number> {
  const [row] = await db
    .insert(orders)
    .values({
      userId: OWNER,
      userEmail: "buyer@example.com",
      fullName: "Test Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "card",
      paymentStatus: "pending",
      paymobOrderId: `PM-${Math.random().toString(36).slice(2)}`,
      totalAmount: "100.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

async function getOrder(id: number) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row;
}

async function cleanup() {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  if (seededBookIds.length) {
    await db.delete(books).where(inArray(books.id, seededBookIds));
    seededBookIds.length = 0;
  }
}

beforeAll(async () => {
  await cleanup();
});

beforeEach(() => {
  // Default happy-path stubs; individual tests may override.
  paymobConfiguredMock.mockReturnValue(true);
  paymobCreateMock.mockResolvedValue({
    paymobOrderId: "PM-ORDER-1",
    paymentToken: "tok",
    checkoutUrl: "https://accept.paymob.com/api/acceptance/iframes/1?payment_token=tok",
  });
  paymobRegenUrlMock.mockResolvedValue(
    "https://accept.paymob.com/api/acceptance/iframes/1?payment_token=tok2",
  );
  rateMock.mockResolvedValue(0.0325);
  convertMock.mockReturnValue("3.25");
  redirectCreateMock.mockResolvedValue({
    id: "PP-REDIRECT-ORDER",
    approveUrl: "https://paypal.example/approve",
  });
});

afterEach(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  redirectCreateMock.mockReset();
  captureMock.mockReset();
  rateMock.mockReset();
  convertMock.mockReset();
  configMock.mockReset();
  paymobConfiguredMock.mockReset();
  paymobCreateMock.mockReset();
  paymobRegenUrlMock.mockReset();
  paymobStatusMock.mockReset();
  paymobVerifyHmacMock.mockReset();
  paidNotificationsMock.mockReset();
});

afterAll(async () => {
  await cleanup();
});

describe("POST /store/orders — card payment method (Paymob)", () => {
  it("creates a Paymob order in EGP and returns the hosted checkout URL", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "card",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.paymentMethod).toBe("card");
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.checkoutUrl).toContain("payment_token=");
    // The card flow must NOT return a PayPal redirect URL.
    expect(res.body.approveUrl).toBeUndefined();

    // Charged in EGP directly — the authoritative server-side total.
    expect(paymobCreateMock).toHaveBeenCalledTimes(1);
    expect(paymobCreateMock.mock.calls[0][0]).toMatchObject({ amountEgp: 100 });
    // NO USD conversion for card payments.
    expect(convertMock).not.toHaveBeenCalled();
    expect(redirectCreateMock).not.toHaveBeenCalled();

    const order = await getOrder(res.body.id);
    expect(order.paymentMethod).toBe("card");
    expect(order.paymentStatus).toBe("pending");
    expect(order.paymobOrderId).toBe("PM-ORDER-1");
    expect(order.paypalOrderId).toBeNull();
    expect(order.usdAmount).toBeNull();
  });

  it("returns 503 (and creates nothing) when Paymob is not configured", async () => {
    paymobConfiguredMock.mockReturnValue(false);
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "card",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/PAYMOB_API_KEY/);
    expect(paymobCreateMock).not.toHaveBeenCalled();
    const rows = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(rows).toHaveLength(0);
  });

  it("fails the order (502) when the Paymob order cannot be created", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });
    paymobCreateMock.mockRejectedValue(new Error("paymob down"));

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "card",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/card checkout/i);

    // The dangling order must be marked failed, never left pending.
    const [row] = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(row.paymentStatus).toBe("failed");
  });
});

describe("GET /store/paymob-config", () => {
  it("reports cardEnabled=true when the Paymob secrets are configured", async () => {
    paymobConfiguredMock.mockReturnValue(true);
    const res = await request(app).get("/store/paymob-config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardEnabled: true, walletEnabled: false });
  });

  it("reports cardEnabled=false when the Paymob secrets are missing", async () => {
    paymobConfiguredMock.mockReturnValue(false);
    const res = await request(app).get("/store/paymob-config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardEnabled: false, walletEnabled: false });
  });
});

describe("POST /store/orders/:id/paymob-checkout — regenerate iframe URL", () => {
  it("returns a fresh checkout URL for the owner's pending card order", async () => {
    const orderId = await seedCardOrder();

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toContain("payment_token=tok2");
    expect(paymobRegenUrlMock).toHaveBeenCalledTimes(1);
  });

  it("404s for a stranger's order", async () => {
    const orderId = await seedCardOrder();

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", STRANGER);

    expect(res.status).toBe(404);
    expect(paymobRegenUrlMock).not.toHaveBeenCalled();
  });

  it("rejects an already-paid order", async () => {
    const orderId = await seedCardOrder({ paymentStatus: "paid" });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already paid/i);
  });

  it("rejects non-card orders", async () => {
    const orderId = await seedCardOrder({
      paymentMethod: "cash_on_delivery",
      paymobOrderId: null,
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
  });

  it("reopens a declined (failed) order as pending and returns a fresh URL", async () => {
    const orderId = await seedCardOrder({
      paymentStatus: "failed",
      paymentFailureReason: "PAYMOB_DECLINED: Do not honour (code 05)",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toContain("payment_token=tok2");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(after.paymentFailureReason).toBeNull();
  });

  it("rejects retry of a cancelled failed order", async () => {
    const orderId = await seedCardOrder({
      paymentStatus: "failed",
      status: "cancelled",
      paymentFailureReason: "cancelled_by_customer",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    expect(paymobRegenUrlMock).not.toHaveBeenCalled();
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("failed");
  });

  it("rejects retry of a superseded order", async () => {
    const orderId = await seedCardOrder({
      paymentStatus: "failed",
      paymentFailureReason: "superseded_by_new_order",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    expect(paymobRegenUrlMock).not.toHaveBeenCalled();
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("failed");
    expect(after.paymentFailureReason).toBe("superseded_by_new_order");
  });
});

describe("POST /store/orders/:id/paymob-confirm — verify payment", () => {
  it("marks the order paid when Paymob reports a successful transaction", async () => {
    const orderId = await seedCardOrder();
    paymobStatusMock.mockResolvedValue({
      found: true,
      success: true,
      pending: false,
      transactionId: "TX-1",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(res.body.status).toBe("confirmed");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paymobTransactionId).toBe("TX-1");
    expect(after.paidAt).not.toBeNull();
    expect(paidNotificationsMock).toHaveBeenCalledTimes(1);
  });

  it("leaves the order pending when no successful transaction exists", async () => {
    const orderId = await seedCardOrder();
    paymobStatusMock.mockResolvedValue({
      found: false,
      success: false,
      pending: false,
      transactionId: null,
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.paymobStatus).toBe("no_transaction");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });

  it("is idempotent for an already-paid order (no Paymob call, no re-notify)", async () => {
    const orderId = await seedCardOrder({ paymentStatus: "paid", status: "confirmed" });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(paymobStatusMock).not.toHaveBeenCalled();
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });

  it("reports the failed state with the decline reason (no Paymob call)", async () => {
    const orderId = await seedCardOrder({
      paymentStatus: "failed",
      paymentFailureReason: "PAYMOB_DECLINED: Do not honour (code 05)",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("failed");
    expect(res.body.paymentFailureReason).toBe(
      "PAYMOB_DECLINED: Do not honour (code 05)",
    );
    expect(paymobStatusMock).not.toHaveBeenCalled();
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });

  it("returns 502 when Paymob cannot be reached (never guesses)", async () => {
    const orderId = await seedCardOrder();
    paymobStatusMock.mockResolvedValue(null);

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(502);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
  });

  it("404s for a stranger's order", async () => {
    const orderId = await seedCardOrder();

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", STRANGER);

    expect(res.status).toBe(404);
    expect(paymobStatusMock).not.toHaveBeenCalled();
  });
});
