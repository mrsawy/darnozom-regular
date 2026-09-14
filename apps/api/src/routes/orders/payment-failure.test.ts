import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, orderItems, books, type NewBook, type NewOrder } from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Integration tests for the payment-failure lifecycle:
//   - terminal PayPal capture failures (e.g. COMPLIANCE_VIOLATION) mark the
//     order paymentStatus "failed" with the stored reason and notify admin
//   - customers can cancel their own pending/unpaid orders
//   - creating a new order cancels older duplicate unpaid online-payment orders
//   - stale pending unpaid online-payment orders auto-expire (COD untouched)
//   - the admin cleanup-stuck action reconciles then expires (1h grace)
// These hit the REAL database (rows are seeded and cleaned up) but stub the
// external boundaries: PayPal/Paymob (network), auth, email, storage.
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-payfail-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const STRANGER = `${TEST_USER_PREFIX}stranger`;

const {
  redirectCreateMock,
  captureMock,
  statusMock,
  convertMock,
  configMock,
  adminSalesMock,
  placedConfirmationMock,
  statusUpdateMock,
  paidNotificationsMock,
  paymobReconcileMock,
  autoCancelledMock,
} = vi.hoisted(() => ({
  redirectCreateMock: vi.fn(),
  captureMock: vi.fn(),
  statusMock: vi.fn(),
  convertMock: vi.fn(),
  configMock: vi.fn(),
  adminSalesMock: vi.fn(),
  placedConfirmationMock: vi.fn(),
  statusUpdateMock: vi.fn(),
  paidNotificationsMock: vi.fn(),
  paymobReconcileMock: vi.fn(),
  autoCancelledMock: vi.fn(),
}));

vi.mock("../../lib/payments/paypal", () => ({
  createPayPalOrder: redirectCreateMock,
  capturePayPalOrder: captureMock,
  getPayPalOrderStatus: statusMock,
  getPayPalClientConfig: configMock,
}));

vi.mock("../../lib/payments/paymob", () => ({
  isPaymobConfigured: vi.fn(() => false),
  isPaymobWalletConfigured: vi.fn(() => false),
  createPaymobCheckout: vi.fn(),
  createPaymobCheckoutUrlForExistingOrder: vi.fn(),
  createPaymobWalletPayment: vi.fn(),
  createPaymobWalletRedirectForExistingOrder: vi.fn(),
  getPaymobTransactionStatus: vi.fn(),
  verifyPaymobWebhookHmac: vi.fn(),
}));

// The cleanup-stuck route runs the Paymob reconciler too — stub it so no
// Paymob code paths execute in these tests.
vi.mock("../../lib/payments/reconcilePaymobOrders", () => ({
  markPaymobOrderPaid: vi.fn(),
  reconcilePendingPaymobOrders: paymobReconcileMock,
}));

vi.mock("../../lib/currency", () => ({
  convertEgpToUsd: convertMock,
}));

// Keep all email side effects out of these tests (the reconcile lib and the
// orders router share this module, so both get the stub).
vi.mock("../../lib/email", () => ({
  sendOrderPlacedConfirmation: placedConfirmationMock,
  sendOrderStatusUpdate: statusUpdateMock,
  sendAdminSalesNotification: adminSalesMock,
  sendOrderReceipt: vi.fn(),
  sendOrderAutoCancelledEmail: autoCancelledMock,
}));

vi.mock("../../lib/orderPaidNotifications", () => ({
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

// Stub admin middleware: trust an `x-test-admin` header. Absent → 403.
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.header("x-test-admin") !== "yes") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  },
}));

vi.mock("../../lib/objectStorage", () => ({
  ObjectStorageService: class {
    getPrivateObjectDir() {
      return "test-bucket/private";
    }
  },
  objectStorageClient: {
    bucket: () => ({ file: () => ({}) }),
  },
}));

// Import the router (and the real reconcile lib) only AFTER mocks register.
const { default: ordersRouter } = await import("./index");
const { expireStalePendingOrders, markOrderPaymentFailed } = await import(
  "../../lib/payments/reconcilePayPalOrders"
);

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

const seededBookIds: number[] = [];

async function seedBook(overrides: Partial<NewBook> = {}): Promise<number> {
  const [row] = await db
    .insert(books)
    .values({
      title: "Test PayFail Book",
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

async function seedOrder(overrides: Partial<NewOrder> = {}): Promise<number> {
  const [row] = await db
    .insert(orders)
    .values({
      userId: OWNER,
      userEmail: "buyer@example.com",
      fullName: "Test Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "paypal",
      paymentStatus: "pending",
      paypalOrderId: `PP-${Math.random().toString(36).slice(2)}`,
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
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
    await db.delete(orders).where(inArray(orders.id, ids));
  }
  if (seededBookIds.length) {
    await db.delete(books).where(inArray(books.id, seededBookIds));
    seededBookIds.length = 0;
  }
}

beforeAll(async () => {
  await cleanup();
});

beforeEach(() => {
  convertMock.mockResolvedValue({ usd: "3.25", rate: 0.0325 });
  redirectCreateMock.mockResolvedValue({
    id: `PP-NEW-${Math.random().toString(36).slice(2)}`,
    approveUrl: "https://paypal.example/approve",
  });
  // Reconcile sweep sees still-pending PayPal orders as not yet approved.
  statusMock.mockResolvedValue({ status: "CREATED", capture: null });
  paymobReconcileMock.mockResolvedValue({
    scanned: 0,
    recovered: 0,
    stillPending: 0,
    failed: 0,
  });
  autoCancelledMock.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await cleanup();
  vi.clearAllMocks();
});

afterAll(async () => {
  await cleanup();
});

describe("terminal PayPal capture failure", () => {
  it("marks the order failed, stores the reason and notifies admin on COMPLIANCE_VIOLATION", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: false,
      status: "UNPROCESSABLE_ENTITY",
      permanentFailure: true,
      failureIssue: "COMPLIANCE_VIOLATION",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(402);
    expect(res.body.terminal).toBe(true);
    expect(res.body.paymentStatus).toBe("failed");
    expect(res.body.failureIssue).toBe("COMPLIANCE_VIOLATION");

    const order = await getOrder(orderId);
    expect(order.paymentStatus).toBe("failed");
    expect(order.paymentFailureReason).toBe("COMPLIANCE_VIOLATION");

    // Admin gets a "failed" sales notification.
    expect(adminSalesMock).toHaveBeenCalledTimes(1);
    expect(adminSalesMock.mock.calls[0][0]).toMatchObject({
      orderId,
      stage: "failed",
    });

    // Customer gets a "payment failed" email with the auto-refund note.
    expect(autoCancelledMock).toHaveBeenCalledTimes(1);
    expect(autoCancelledMock.mock.calls[0][0]).toMatchObject({
      to: "buyer@example.com",
      orderId,
      reason: "payment_failed",
      failureCode: "COMPLIANCE_VIOLATION",
    });
  });

  it("does NOT mark the order failed on a retryable (non-terminal) capture failure", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: false,
      status: "DECLINED",
      permanentFailure: false,
      failureIssue: "INSTRUMENT_DECLINED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(402);
    expect(res.body.terminal).toBeUndefined();

    const order = await getOrder(orderId);
    expect(order.paymentStatus).toBe("pending");
    expect(order.paymentFailureReason).toBeNull();
  });

  it("markOrderPaymentFailed never overwrites a paid order", async () => {
    const orderId = await seedOrder({ paymentStatus: "paid", status: "confirmed" });
    const result = await markOrderPaymentFailed(orderId, "COMPLIANCE_VIOLATION");
    expect(result).toBeNull();
    const order = await getOrder(orderId);
    expect(order.paymentStatus).toBe("paid");
  });
});

describe("POST /account/me/orders/:id/cancel — customer cancel", () => {
  it("cancels the owner's pending unpaid order with reason cancelled_by_customer", async () => {
    const orderId = await seedOrder();

    const res = await request(app)
      .post(`/account/me/orders/${orderId}/cancel`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe("cancelled");

    const order = await getOrder(orderId);
    expect(order.status).toBe("cancelled");
    expect(order.paymentFailureReason).toBe("cancelled_by_customer");
  });

  it("keeps an existing failure reason (e.g. COMPLIANCE_VIOLATION) when cancelling", async () => {
    const orderId = await seedOrder({
      paymentStatus: "failed",
      paymentFailureReason: "COMPLIANCE_VIOLATION",
    });

    const res = await request(app)
      .post(`/account/me/orders/${orderId}/cancel`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    const order = await getOrder(orderId);
    expect(order.status).toBe("cancelled");
    expect(order.paymentFailureReason).toBe("COMPLIANCE_VIOLATION");
  });

  it("is idempotent: cancelling an already-cancelled order returns ok", async () => {
    const orderId = await seedOrder({ status: "cancelled" });

    const res = await request(app)
      .post(`/account/me/orders/${orderId}/cancel`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("rejects cancelling a paid order (400)", async () => {
    const orderId = await seedOrder({ paymentStatus: "paid", status: "confirmed" });

    const res = await request(app)
      .post(`/account/me/orders/${orderId}/cancel`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    const order = await getOrder(orderId);
    expect(order.status).toBe("confirmed");
    expect(order.paymentStatus).toBe("paid");
  });

  it("returns 404 for another user's order", async () => {
    const orderId = await seedOrder();

    const res = await request(app)
      .post(`/account/me/orders/${orderId}/cancel`)
      .set("x-test-user", STRANGER);

    expect(res.status).toBe(404);
    const order = await getOrder(orderId);
    expect(order.status).toBe("pending");
  });

  it("requires auth (401)", async () => {
    const orderId = await seedOrder();
    const res = await request(app).post(`/account/me/orders/${orderId}/cancel`);
    expect(res.status).toBe(401);
  });
});

describe("order creation dedupe", () => {
  it("cancels the older duplicate unpaid online-payment order when an identical one is created", async () => {
    const bookId = await seedBook();

    const first = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://example.com/return",
        cancelUrl: "https://example.com/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://example.com/return",
        cancelUrl: "https://example.com/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });
    expect(second.status).toBe(201);

    const oldOrder = await getOrder(first.body.id);
    expect(oldOrder.status).toBe("cancelled");
    expect(oldOrder.paymentFailureReason).toBe("superseded_by_new_order");

    const newOrder = await getOrder(second.body.id);
    expect(newOrder.status).toBe("pending");
  });

  it("does not cancel orders with a different item mix", async () => {
    const bookId = await seedBook();

    const first = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://example.com/return",
        cancelUrl: "https://example.com/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "paypal",
        returnUrl: "https://example.com/return",
        cancelUrl: "https://example.com/cancel",
        items: [
          { productType: "book", productId: bookId, quantity: 2, format: "digital" },
        ],
      });
    expect(second.status).toBe(201);

    const oldOrder = await getOrder(first.body.id);
    expect(oldOrder.status).toBe("pending");
  });
});

describe("expireStalePendingOrders", () => {
  it("cancels stale unpaid online-payment orders but never COD or fresh ones", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const staleOnline = await seedOrder({ createdAt: threeDaysAgo });
    const staleCod = await seedOrder({
      createdAt: threeDaysAgo,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "unpaid",
      paypalOrderId: null,
    });
    const fresh = await seedOrder();

    const summary = await expireStalePendingOrders();
    expect(summary.orderIds).toContain(staleOnline);
    expect(summary.orderIds).not.toContain(staleCod);
    expect(summary.orderIds).not.toContain(fresh);

    const expired = await getOrder(staleOnline);
    expect(expired.status).toBe("cancelled");
    expect(expired.paymentStatus).toBe("failed");
    expect(expired.paymentFailureReason).toBe("expired");

    expect((await getOrder(staleCod)).status).toBe("pending");
    expect((await getOrder(fresh)).status).toBe("pending");

    // The expired order's customer got an "expired" cancellation email —
    // and only that order's customer.
    const expiredCalls = autoCancelledMock.mock.calls.filter(
      (c) => c[0]?.orderId === staleOnline,
    );
    expect(expiredCalls).toHaveLength(1);
    expect(expiredCalls[0][0]).toMatchObject({
      to: "buyer@example.com",
      reason: "expired",
    });
    expect(
      autoCancelledMock.mock.calls.some(
        (c) => c[0]?.orderId === staleCod || c[0]?.orderId === fresh,
      ),
    ).toBe(false);
  });

  it("skips already-failed (terminal) orders that were cancelled", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const alreadyCancelled = await seedOrder({
      createdAt: threeDaysAgo,
      status: "cancelled",
      paymentStatus: "failed",
      paymentFailureReason: "COMPLIANCE_VIOLATION",
    });

    const summary = await expireStalePendingOrders();
    expect(summary.orderIds).not.toContain(alreadyCancelled);
    const order = await getOrder(alreadyCancelled);
    expect(order.paymentFailureReason).toBe("COMPLIANCE_VIOLATION");
  });
});

describe("POST /admin/orders/cleanup-stuck", () => {
  it("requires admin (403)", async () => {
    const res = await request(app).post("/admin/orders/cleanup-stuck");
    expect(res.status).toBe(403);
  });

  it("expires stuck (>1h) unpaid online orders and reports the summary", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const stuck = await seedOrder({ createdAt: twoHoursAgo });
    const freshish = await seedOrder(); // just created — inside the 1h grace

    const res = await request(app)
      .post("/admin/orders/cleanup-stuck")
      .set("x-test-admin", "yes");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.expired.orderIds).toContain(stuck);
    expect(res.body.expired.orderIds).not.toContain(freshish);

    const stuckOrder = await getOrder(stuck);
    expect(stuckOrder.status).toBe("cancelled");
    expect(stuckOrder.paymentFailureReason).toBe("expired");
    expect((await getOrder(freshish)).status).toBe("pending");
  });

  it("rescues a stuck order that actually got paid instead of expiring it", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const paidButStuck = await seedOrder({ createdAt: twoHoursAgo });
    const order = await getOrder(paidButStuck);
    statusMock.mockImplementation(async (paypalOrderId: string) =>
      paypalOrderId === order.paypalOrderId
        ? {
            status: "COMPLETED",
            capture: { captured: true, captureId: "CAP-RESCUE-1", status: "COMPLETED" },
          }
        : { status: "CREATED", capture: null },
    );

    const res = await request(app)
      .post("/admin/orders/cleanup-stuck")
      .set("x-test-admin", "yes");

    expect(res.status).toBe(200);
    const rescued = await getOrder(paidButStuck);
    expect(rescued.paymentStatus).toBe("paid");
    expect(rescued.status).toBe("confirmed");
    expect(rescued.paypalCaptureId).toBe("CAP-RESCUE-1");
  });
});
