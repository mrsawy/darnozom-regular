import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const { paidMock } = vi.hoisted(() => ({ paidMock: vi.fn(async () => undefined) }));
vi.mock("../email/orderPaidNotifications", () => ({ sendOrderPaidNotifications: paidMock }));

const { markOrderPaid, isManualPaymentMethod } = await import("./manualPayments");

const PREFIX = "test-manual-paid-";

async function seed(overrides: Partial<NewOrder> = {}) {
  const [row] = await db
    .insert(orders)
    .values({
      userId: `${PREFIX}owner`,
      userEmail: "buyer@example.com",
      fullName: "Manual Buyer",
      phone: "01000000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "vodafone_cash",
      paymentStatus: "pending",
      totalAmount: "250.00",
      shippingTotal: "0.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

afterEach(async () => {
  paidMock.mockClear();
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});
afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});

describe("isManualPaymentMethod", () => {
  it("recognizes only the two manual methods", () => {
    expect(isManualPaymentMethod("vodafone_cash")).toBe(true);
    expect(isManualPaymentMethod("instapay")).toBe(true);
    expect(isManualPaymentMethod("cash_on_delivery")).toBe(false);
    expect(isManualPaymentMethod(null)).toBe(false);
  });
});

describe("markOrderPaid", () => {
  it("marks a pending manual order paid and notifies once", async () => {
    const id = await seed();
    const r = await markOrderPaid(id, { source: "medusa" });
    expect(r.status).toBe("paid");
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.paymentStatus).toBe("paid");
    expect(row.paidAt).toBeTruthy();
    expect(row.status).toBe("confirmed");
    expect(paidMock).toHaveBeenCalledOnce();
  });

  it("second call is a no-op (no second email)", async () => {
    const id = await seed({ paymentMethod: "instapay" });
    await markOrderPaid(id, { source: "storefront_admin" });
    const second = await markOrderPaid(id, { source: "medusa" });
    expect(second.status).toBe("already_paid");
    expect(paidMock).toHaveBeenCalledOnce();
  });

  it("rejects non-manual orders", async () => {
    const id = await seed({ paymentMethod: "paypal" });
    expect((await markOrderPaid(id, { source: "medusa" })).status).toBe("not_manual");
    expect(paidMock).not.toHaveBeenCalled();
  });

  it("rejects cancelled orders", async () => {
    const id = await seed({ status: "cancelled" });
    expect((await markOrderPaid(id, { source: "medusa" })).status).toBe("cancelled");
  });

  it("returns not_found for a missing order", async () => {
    expect((await markOrderPaid(999999999, { source: "medusa" })).status).toBe("not_found");
  });
});
