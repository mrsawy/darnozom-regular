import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Money-sensitive integration tests for the PayPal reconciliation safety net.
// These hit the REAL database (rows are seeded and cleaned up) but stub the
// PayPal network boundary (lookup + capture).
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-reconcile-";
const OWNER = `${TEST_USER_PREFIX}owner`;

const { statusMock, captureMock, notifyMock } = vi.hoisted(() => ({
  statusMock: vi.fn(),
  captureMock: vi.fn(),
  notifyMock: vi.fn(async (_order: { id: number }) => {}),
}));

vi.mock("./paypal", () => ({
  getPayPalOrderStatus: statusMock,
  capturePayPalOrder: captureMock,
}));

// Stub the shared paid-notification helper (receipt + admin email) at the
// module boundary — we assert it fires on recovery, not the Resend HTTP call.
vi.mock("./orderPaidNotifications", () => ({
  sendOrderPaidNotifications: notifyMock,
}));

const { reconcilePendingPayPalOrders } = await import("./reconcilePayPalOrders");

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

// minAgeMs negative → cutoff is in the future so freshly-seeded rows qualify.
const RUN = { minAgeMs: -60_000 };

beforeAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

afterEach(async () => {
  statusMock.mockReset();
  captureMock.mockReset();
  notifyMock.mockClear();
  // The reconciler scans ALL pending PayPal orders, so leftover fixtures would
  // be swept into later passes and skew the call counts. Wipe between tests.
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

describe("reconcilePendingPayPalOrders", () => {
  it("flips an already-captured (COMPLETED) pending order to paid without recharging", async () => {
    const orderId = await seedOrder();
    statusMock.mockResolvedValue({
      status: "COMPLETED",
      capture: {
        captured: true,
        captureId: "CAP-RECON",
        status: "COMPLETED",
        alreadyCaptured: true,
      },
    });

    const summary = await reconcilePendingPayPalOrders(RUN);

    expect(summary.reconciled).toBeGreaterThanOrEqual(1);
    // A COMPLETED order must never be captured again.
    expect(captureMock).not.toHaveBeenCalled();

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paypalCaptureId).toBe("CAP-RECON");
    expect(after.paidAt).not.toBeNull();
  });

  it("captures an APPROVED (but never-captured) pending order and flips it to paid", async () => {
    const orderId = await seedOrder();
    statusMock.mockResolvedValue({ status: "APPROVED", capture: null });
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-APPROVED",
      status: "COMPLETED",
    });

    const summary = await reconcilePendingPayPalOrders(RUN);

    expect(summary.captured).toBeGreaterThanOrEqual(1);
    expect(captureMock).toHaveBeenCalledTimes(1);

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paypalCaptureId).toBe("CAP-APPROVED");
  });

  it("leaves a CREATED (never-approved) order pending and never captures", async () => {
    const orderId = await seedOrder();
    statusMock.mockResolvedValue({ status: "CREATED", capture: null });

    await reconcilePendingPayPalOrders(RUN);

    expect(captureMock).not.toHaveBeenCalled();
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
  });

  it("does not touch a non-completed capture on an APPROVED order", async () => {
    const orderId = await seedOrder();
    statusMock.mockResolvedValue({ status: "APPROVED", capture: null });
    captureMock.mockResolvedValue({
      captured: false,
      captureId: null,
      status: "DECLINED",
    });

    await reconcilePendingPayPalOrders(RUN);

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(after.paypalCaptureId).toBeNull();
  });

  it("leaves the order pending when the PayPal lookup fails", async () => {
    const orderId = await seedOrder();
    statusMock.mockResolvedValue(null);

    const summary = await reconcilePendingPayPalOrders(RUN);

    expect(summary.errors).toBeGreaterThanOrEqual(1);
    expect(captureMock).not.toHaveBeenCalled();
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
  });

  it("is safe to run repeatedly: a second pass does not re-capture a now-paid order", async () => {
    const orderId = await seedOrder();
    statusMock.mockResolvedValue({ status: "APPROVED", capture: null });
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-ONCE",
      status: "COMPLETED",
    });

    await reconcilePendingPayPalOrders(RUN);
    expect(captureMock).toHaveBeenCalledTimes(1);

    // Order is now paid, so the next pass won't even select it.
    await reconcilePendingPayPalOrders(RUN);
    expect(captureMock).toHaveBeenCalledTimes(1);

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.paypalCaptureId).toBe("CAP-ONCE");
  });

  it("reconciles stuck-pending CARD orders exactly like PayPal orders", async () => {
    const orderId = await seedOrder({ paymentMethod: "card" });
    statusMock.mockResolvedValue({ status: "APPROVED", capture: null });
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-CARD-RECON",
      status: "COMPLETED",
    });

    const summary = await reconcilePendingPayPalOrders(RUN);

    expect(summary.captured).toBeGreaterThanOrEqual(1);
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paypalCaptureId).toBe("CAP-CARD-RECON");
  });

  it("sends the paid notifications and stamps paymentRecoveredAt when it flips a COMPLETED order", async () => {
    const orderId = await seedOrder({ paymentMethod: "card" });
    statusMock.mockResolvedValue({
      status: "COMPLETED",
      capture: {
        captured: true,
        captureId: "CAP-NOTIFY",
        status: "COMPLETED",
        alreadyCaptured: true,
      },
    });

    await reconcilePendingPayPalOrders(RUN);

    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0]?.[0]?.id).toBe(orderId);

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.paymentRecoveredAt).not.toBeNull();
  });

  it("sends the paid notifications and stamps paymentRecoveredAt when it captures an APPROVED order", async () => {
    const orderId = await seedOrder({ paymentMethod: "card" });
    statusMock.mockResolvedValue({ status: "APPROVED", capture: null });
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-NOTIFY-2",
      status: "COMPLETED",
    });

    await reconcilePendingPayPalOrders(RUN);

    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0]?.[0]?.id).toBe(orderId);

    const after = await getOrder(orderId);
    expect(after.paymentRecoveredAt).not.toBeNull();
  });

  it("does not send notifications when the order stays pending", async () => {
    await seedOrder();
    statusMock.mockResolvedValue({ status: "CREATED", capture: null });

    await reconcilePendingPayPalOrders(RUN);

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("does not stamp paymentRecoveredAt on a live-flow capture (no recovered flag)", async () => {
    const orderId = await seedOrder();
    const { markPayPalOrderPaid } = await import("./reconcilePayPalOrders");
    const updated = await markPayPalOrderPaid(orderId, "CAP-LIVE");
    expect(updated).not.toBeNull();
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.paymentRecoveredAt).toBeNull();
  });

  it("ignores non-online-payment and non-pending orders", async () => {
    const codId = await seedOrder({
      paymentMethod: "cash_on_delivery",
      paypalOrderId: null,
    });
    const paidId = await seedOrder({ paymentStatus: "paid" });
    statusMock.mockResolvedValue({ status: "APPROVED", capture: null });
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-X",
      status: "COMPLETED",
    });

    await reconcilePendingPayPalOrders(RUN);

    const cod = await getOrder(codId);
    const paid = await getOrder(paidId);
    expect(cod.paymentStatus).toBe("pending");
    expect(paid.paypalCaptureId).toBeNull();
  });
});
