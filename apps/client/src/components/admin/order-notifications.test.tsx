import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/use-order-new-socket", () => ({ useOrderNewSocket: () => undefined }));
vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

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
  localStorage.removeItem("darnozom.admin.orders.dismissedKeys");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(feed), { status: 200 })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("OrderNotificationsBell", () => {
  it("counts new orders from both systems plus payments awaiting verification", async () => {
    render(<OrderNotificationsBell />);
    const bell = screen.getByTestId("admin-order-notifications");
    expect((await screen.findByTestId("admin-order-notifications-badge")).textContent).toBe("2");
    expect((fetch as any).mock.calls[0][0]).toBe("/api/admin/order-notifications");

    // Radix opens the menu from the keyboard in jsdom (no PointerEvent there).
    fireEvent.keyDown(bell, { key: "Enter" });
    expect(await screen.findByText(/#57/)).toBeTruthy();
    expect(screen.getByText(/#3598/)).toBeTruthy();
    expect(screen.getByText("بانتظار التحقق من الدفع")).toBeTruthy();
    expect(screen.getByText("ميدوسا")).toBeTruthy();
  });

  it("mark-all-as-read clears the badge and dismisses payment-review rows", async () => {
    render(<OrderNotificationsBell />);
    const bell = screen.getByTestId("admin-order-notifications");
    expect((await screen.findByTestId("admin-order-notifications-badge")).textContent).toBe("2");

    fireEvent.keyDown(bell, { key: "Enter" });
    expect(await screen.findByText(/#57/)).toBeTruthy();

    const markAll = await screen.findByTestId("admin-order-notifications-mark-all");
    fireEvent.click(markAll);

    await waitFor(
      () => {
        expect(screen.getByText(/لا توجد طلبات جديدة/)).toBeTruthy();
        expect(screen.queryByTestId("admin-order-notifications-badge")).toBeNull();
      },
      { timeout: 10_000 },
    );

    expect(localStorage.getItem("darnozom.admin.orders.dismissedKeys")).toContain(
      "storefront:3598",
    );

    // Close; badge stays cleared because payment-review was dismissed.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(
      () => {
        expect(screen.queryByTestId("admin-order-notifications-badge")).toBeNull();
      },
      { timeout: 10_000 },
    );
  }, 40_000);
});
