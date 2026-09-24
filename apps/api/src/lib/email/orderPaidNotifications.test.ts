import { describe, it, expect, vi } from "vitest";

const { emitMock } = vi.hoisted(() => ({ emitMock: vi.fn() }));
vi.mock("../admin-socket", () => ({ emitOrderUpdated: emitMock }));
const { payableMock, byDarnozomIdMock } = vi.hoisted(() => ({
  payableMock: vi.fn(async () => undefined),
  byDarnozomIdMock: vi.fn(async () => undefined),
}));
vi.mock("../medusa-order-sync", () => ({
  ensureMedusaOrderPayable: payableMock,
  markMedusaOrderPaidForDarnozomOrder: byDarnozomIdMock,
}));
vi.mock("./email", () => ({
  sendOrderReceipt: vi.fn(async () => ({ ok: true })),
  sendAdminSalesNotification: vi.fn(async () => ({ ok: true })),
}));

import { sendOrderPaidNotifications } from "./orderPaidNotifications";

describe("sendOrderPaidNotifications", () => {
  it("tells both admin dashboards the order is now paid", async () => {
    await sendOrderPaidNotifications({
      id: 999999991,
      medusaOrderId: "order_x",
      status: "confirmed",
      paymentStatus: "paid",
      userEmail: "",
      totalAmount: "10.00",
      shippingTotal: "0",
      currency: "EGP",
    } as any);
    expect(emitMock).toHaveBeenCalledWith({
      id: 999999991,
      medusaOrderId: "order_x",
      status: "confirmed",
      paymentStatus: "paid",
    });
  });

  const paidOrder = {
    id: 999999992,
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "paypal",
    userEmail: "",
    totalAmount: "10.00",
    shippingTotal: "0",
    currency: "EGP",
  };

  it("marks the mirrored Medusa order paid (PayPal / card / wallet captures)", async () => {
    await sendOrderPaidNotifications({ ...paidOrder, medusaOrderId: "order_pp" } as any);
    expect(payableMock).toHaveBeenCalledWith("order_pp", 10, {
      markPaid: true,
      providerId: "pp_system_default",
    });
  });

  it("finds the Medusa order by storefront id when the link wasn't stored", async () => {
    await sendOrderPaidNotifications({ ...paidOrder, medusaOrderId: null } as any);
    expect(byDarnozomIdMock).toHaveBeenCalledWith(999999992);
  });

  it("still sends the receipt when Medusa is unreachable", async () => {
    payableMock.mockRejectedValueOnce(new Error("medusa down"));
    await expect(
      sendOrderPaidNotifications({ ...paidOrder, medusaOrderId: "order_pp" } as any),
    ).resolves.toBeUndefined();
  });
});
