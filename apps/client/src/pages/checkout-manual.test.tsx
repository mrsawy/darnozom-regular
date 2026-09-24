import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { detailsMock } = vi.hoisted(() => ({ detailsMock: vi.fn() }));
vi.mock("@/lib/medusa-client", () => ({ fetchManualPaymentMethods: detailsMock }));
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "en" }) }));
vi.mock("@/components/site-nav", () => ({ default: () => null }));

import CheckoutManualPage from "./checkout-manual";

function mockOrder(order: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(order), { status: 200 })),
  );
}

const vc = {
  code: "vodafone_cash",
  account_number: "01011112222",
  account_name: "Dar Nozom",
  whatsapp_number: "01033334444",
  instapay_address: null,
  qr_image_url: null,
  instructions_ar: null,
  instructions_en: "Send the exact amount.",
};
const ip = {
  ...vc,
  code: "instapay",
  account_number: null,
  instapay_address: "dar@instapay",
  qr_image_url: "/static/qr.png",
};

beforeEach(() => {
  window.history.replaceState({}, "", "/checkout/manual?orderId=12");
  detailsMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckoutManualPage", () => {
  it("shows the Vodafone Cash number and a WhatsApp screenshot button", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "vodafone_cash", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    expect(await screen.findByText("01011112222")).toBeTruthy();
    expect(screen.getByText("Send the exact amount.")).toBeTruthy();
    const wa = screen.getByTestId("link-whatsapp-proof");
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/201033334444\?text=/);
    expect(screen.queryByAltText(/InstaPay QR/i)).toBeNull();
  });

  it("shows the InstaPay QR and address", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    const img = await screen.findByAltText(/InstaPay QR/i);
    expect(img.getAttribute("src")).toContain("/static/qr.png");
    expect(screen.getByText("dar@instapay")).toBeTruthy();
  });

  it("shows a contact fallback when the method is not configured", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, { ...ip, instapay_address: null, qr_image_url: null }]);
    render(<CheckoutManualPage />);
    expect(await screen.findByTestId("manual-not-configured")).toBeTruthy();
  });

  it("shows a paid state once confirmed", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "paid" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    expect(await screen.findByTestId("manual-paid")).toBeTruthy();
  });

  it("passes the email query param to the order endpoint (guest from email link)", async () => {
    window.history.replaceState({}, "", "/checkout/manual?orderId=12&email=g%40x.com");
    mockOrder({ id: 12, totalAmount: "1.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    await screen.findByText("dar@instapay");
    expect((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe(
      "/api/store/orders/12/manual-payment?email=g%40x.com",
    );
  });
});
