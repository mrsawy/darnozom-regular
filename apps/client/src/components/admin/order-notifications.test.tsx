import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/use-order-new-socket", () => ({ useOrderNewSocket: () => undefined }));

import { OrderNotificationsBell } from "./order-notifications";

const feed = {
  orders: [
    {
      key: "medusa:order_native",
      source: "medusa",
      ref: "#57",
      customer: null,
      email: "walkin@example.com",
      total: "120.00",
      currency: "EGP",
      createdAt: "2030-01-02T00:00:00.000Z",
      status: "pending",
      paymentStatus: "captured",
      paymentMethod: null,
      needsPaymentReview: false,
      medusaOrderId: "order_native",
    },
    {
      key: "storefront:3598",
      source: "storefront",
      ref: "#3598",
      customer: "Buyer",
      email: "buyer@example.com",
      total: "66.00",
      currency: "EGP",
      // Seen long ago, but the transfer still needs verifying.
      createdAt: "2020-01-01T00:00:00.000Z",
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "vodafone_cash",
      needsPaymentReview: true,
      medusaOrderId: "order_mirror",
    },
  ],
};

beforeEach(() => {
  localStorage.setItem("darnozom.admin.orders.lastSeenAt", String(Date.parse("2029-01-01")));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(feed))));
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("OrderNotificationsBell", () => {
  it("counts new orders from both systems plus payments awaiting verification", async () => {
    render(<OrderNotificationsBell />);
    const bell = screen.getByTestId("admin-order-notifications");
    expect(await screen.findByText("2")).toBeTruthy();
    expect((fetch as any).mock.calls[0][0]).toBe("/api/admin/order-notifications");

    // Radix opens the menu from the keyboard in jsdom (no PointerEvent there).
    fireEvent.keyDown(bell, { key: "Enter" });
    expect(await screen.findByText(/#57/)).toBeTruthy();
    expect(screen.getByText(/#3598/)).toBeTruthy();
    expect(screen.getByText("بانتظار التحقق من الدفع")).toBeTruthy();
    expect(screen.getByText("ميدوسا")).toBeTruthy();
  });
});
