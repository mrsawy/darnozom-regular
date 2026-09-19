import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

function fakeReq(cartData: any) {
  return {
    query: { cart_id: "cart_1" },
    scope: {
      resolve: () => ({
        graph: vi.fn().mockResolvedValue({ data: [cartData] }),
      }),
    },
  } as any;
}
function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /store/available-payment-providers", () => {
  it("offers Paymob + COD (+ PayPal) for a physical-item cart shipping within Egypt", async () => {
    const res = fakeRes();
    await GET(
      fakeReq({
        items: [{ product: { metadata: { kind: "paper" } } }],
        shipping_address: { country_code: "eg" },
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      providerIds: ["paymob-card", "paymob-wallet", "cod", "paypal-egp"],
    });
  });

  it("offers Lemon Squeezy (+ PayPal) for a digital-only cart", async () => {
    const res = fakeRes();
    await GET(
      fakeReq({
        items: [{ product: { metadata: { kind: "digital" } } }],
        shipping_address: null,
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      providerIds: ["lemonsqueezy", "paypal-egp"],
    });
  });

  it("offers Lemon Squeezy (+ PayPal) for a physical-item cart shipping outside Egypt", async () => {
    const res = fakeRes();
    await GET(
      fakeReq({
        items: [{ product: { metadata: { kind: "paper" } } }],
        shipping_address: { country_code: "us" },
      }),
      res,
    );
    expect(res.json).toHaveBeenCalledWith({
      providerIds: ["lemonsqueezy", "paypal-egp"],
    });
  });

  it("returns 400 when cart_id is missing", async () => {
    const res = fakeRes();
    const req = {
      query: {},
      scope: { resolve: () => ({ graph: vi.fn() }) },
    } as any;
    await GET(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing cart_id" });
  });

  it("returns 404 when the cart does not resolve", async () => {
    const res = fakeRes();
    const req = {
      query: { cart_id: "cart_missing" },
      scope: {
        resolve: () => ({
          graph: vi.fn().mockResolvedValue({ data: [] }),
        }),
      },
    } as any;
    await GET(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Cart not found" });
  });
});
