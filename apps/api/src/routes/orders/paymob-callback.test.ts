import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Integration tests for the Paymob transaction-processed webhook. The Paymob
// lib is NOT mocked here: PAYMOB_* env vars are set so the real HMAC-SHA512
// verification code runs (the callback path performs no network calls).
// Signatures are computed in-test with the same exported helper.
// ---------------------------------------------------------------------------

const HMAC_SECRET = "test-hmac-secret";
process.env.PAYMOB_API_KEY = "test-api-key";
process.env.PAYMOB_INTEGRATION_ID = "12345";
process.env.PAYMOB_IFRAME_ID = "67890";
process.env.PAYMOB_HMAC_SECRET = HMAC_SECRET;

const TEST_USER_PREFIX = "test-pmcb-";
const OWNER = `${TEST_USER_PREFIX}owner`;

const { paidNotificationsMock, adminSalesMock, autoCancelledMock } = vi.hoisted(
  () => ({
    paidNotificationsMock: vi.fn(),
    adminSalesMock: vi.fn(),
    autoCancelledMock: vi.fn(),
  }),
);

// Keep paid-order side effects (emails, entitlements) out of these tests.
vi.mock("../../lib/orderPaidNotifications", () => ({
  sendOrderPaidNotifications: paidNotificationsMock,
}));

// Stub the email module so decline notifications can be asserted without
// real sends (shared by the router and the reconcile lib).
vi.mock("../../lib/email", () => ({
  sendOrderPlacedConfirmation: vi.fn(async () => ({ ok: true })),
  sendOrderStatusUpdate: vi.fn(async () => ({ ok: true })),
  sendAdminSalesNotification: adminSalesMock,
  sendOrderReceipt: vi.fn(async () => ({ ok: true })),
  sendOrderAutoCancelledEmail: autoCancelledMock,
}));

// Stub auth boundaries (the callback itself is public).
vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (
    req: express.Request & { clerkUserId?: string },
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.clerkUserId = uid;
    next();
  },
}));

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (_req: express.Request, res: express.Response) =>
    res.status(403).json({ error: "Forbidden" }),
}));

vi.mock("@clerk/express", () => ({
  clerkClient: {
    users: {
      getUser: vi.fn(async () => ({
        emailAddresses: [{ emailAddress: "buyer@example.com" }],
      })),
    },
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

// Import AFTER env vars + mocks are in place. The Paymob lib is real.
const { default: ordersRouter } = await import("./index");
const { computePaymobWebhookHmac } = await import("../../lib/paymob");

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
      paymobOrderId: `PMCB-${Math.random().toString(36).slice(2)}`,
      totalAmount: "150.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

async function getOrder(id: number) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row;
}

/** Builds a realistic Paymob transaction webhook object. */
function makeTransaction(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 987654,
    amount_cents: 15000,
    created_at: "2026-07-07T10:00:00",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    integration_id: 12345,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 111222 },
    owner: 42,
    pending: false,
    success: true,
    source_data: { pan: "1234", sub_type: "MasterCard", type: "card" },
    ...overrides,
  };
}

function signedCallback(obj: Record<string, unknown>, hmac?: string) {
  const signature = hmac ?? computePaymobWebhookHmac(obj, HMAC_SECRET);
  return request(app)
    .post(`/store/paymob/callback?hmac=${signature}`)
    .send({ type: "TRANSACTION", obj });
}

async function cleanup() {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
}

beforeAll(async () => {
  await cleanup();
});

beforeEach(() => {
  paidNotificationsMock.mockReset();
  adminSalesMock.mockReset();
  adminSalesMock.mockResolvedValue({ ok: true });
  autoCancelledMock.mockReset();
  autoCancelledMock.mockResolvedValue({ ok: true });
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe("POST /store/paymob/callback", () => {
  it("marks the matching order paid on a valid, successful callback", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction();

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paymobTransactionId).toBe("987654");
    expect(after.paidAt).not.toBeNull();
    expect(paidNotificationsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid HMAC signature with 401 and does not touch the order", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction();

    const res = await signedCallback(obj, "0".repeat(128));

    expect(res.status).toBe(401);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });

  it("rejects a tampered payload (signature computed over different fields)", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const original = makeTransaction({ amount_cents: 100 });
    const signature = computePaymobWebhookHmac(original, HMAC_SECRET);
    // Attacker bumps the amount but reuses the old signature.
    const tampered = makeTransaction({ amount_cents: 15000 });

    const res = await signedCallback(tampered, signature);

    expect(res.status).toBe(401);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
  });

  it("is idempotent: a duplicate callback does not re-notify", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction();

    const first = await signedCallback(obj);
    const second = await signedCallback(obj);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(paidNotificationsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an amount mismatch with 400 and does not mark paid", async () => {
    const orderId = await seedCardOrder({
      paymobOrderId: "111222",
      totalAmount: "150.00",
    });
    // Validly signed, but for the wrong amount.
    const obj = makeTransaction({ amount_cents: 5000 });

    const res = await signedCallback(obj);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });

  it("marks the order payment-failed on a decline and notifies customer + admin", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction({
      success: false,
      data: { message: "Do not honour", txn_response_code: "05" },
    });

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("failed");
    expect(after.paymentFailureReason).toBe(
      "PAYMOB_DECLINED: Do not honour (code 05)",
    );
    // Order stays pending (not cancelled) so support can follow up.
    expect(after.status).toBe("pending");
    expect(paidNotificationsMock).not.toHaveBeenCalled();
    expect(autoCancelledMock).toHaveBeenCalledTimes(1);
    expect(autoCancelledMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        orderId,
        reason: "payment_failed",
        failureCode: "PAYMOB_DECLINED: Do not honour (code 05)",
      }),
    );
    expect(adminSalesMock).toHaveBeenCalledTimes(1);
    expect(adminSalesMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId, stage: "failed" }),
    );
  });

  it("uses a generic decline reason when Paymob sends no data details", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction({ success: false });

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("failed");
    expect(after.paymentFailureReason).toBe("PAYMOB_DECLINED");
    expect(autoCancelledMock).toHaveBeenCalledTimes(1);
  });

  it("is idempotent on duplicate decline callbacks — notifies only once", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction({
      success: false,
      data: { message: "Insufficient funds", txn_response_code: "51" },
    });

    const first = await signedCallback(obj);
    const second = await signedCallback(obj);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("failed");
    expect(autoCancelledMock).toHaveBeenCalledTimes(1);
    expect(adminSalesMock).toHaveBeenCalledTimes(1);
  });

  it("never marks a paid order failed on a late decline callback", async () => {
    const orderId = await seedCardOrder({
      paymobOrderId: "111222",
      paymentStatus: "paid",
      status: "confirmed",
      paidAt: new Date(),
    });
    const obj = makeTransaction({
      success: false,
      data: { message: "Do not honour" },
    });

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(autoCancelledMock).not.toHaveBeenCalled();
    expect(adminSalesMock).not.toHaveBeenCalled();
  });

  it("acknowledges a decline for an unknown Paymob order without side effects", async () => {
    const obj = makeTransaction({
      success: false,
      order: { id: 999999999 },
    });

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(autoCancelledMock).not.toHaveBeenCalled();
    expect(adminSalesMock).not.toHaveBeenCalled();
  });

  it("ignores pending (3DS in-flight) transactions", async () => {
    const orderId = await seedCardOrder({ paymobOrderId: "111222" });
    const obj = makeTransaction({ pending: true });

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
  });

  it("acknowledges callbacks for unknown Paymob orders without side effects", async () => {
    const obj = makeTransaction({ order: { id: 999999999 } });

    const res = await signedCallback(obj);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });

  it("rejects a body without a transaction object", async () => {
    const res = await request(app)
      .post("/store/paymob/callback?hmac=abc")
      .send({ type: "TRANSACTION" });

    expect(res.status).toBe(400);
  });
});
