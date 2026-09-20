import { describe, it, expect, vi, beforeEach } from "vitest";

// Constructor-injection via medusa-config.ts's `dependencies` array does NOT
// work for fulfillment-provider (or payment-provider) entries under
// `options.providers[]` — confirmed empirically against the installed
// @medusajs/modules-sdk@2.21.0 (moduleProviderLoader never reads
// `dependencies`; see the long comment in ./fulfillment-provider.ts for the
// full investigation) and against a live `pnpm --filter medusa dev` boot
// where a constructor debug log showed no "cityShipping"/"cityShippingService"
// key ever reaches the provider's container arg. The real, working mechanism
// is `MedusaModule.getModuleInstance("cityShipping")` from
// `@medusajs/framework/modules-sdk`, called lazily inside `calculatePrice`.
// This test mocks that static call instead of constructing with a fake
// container (the brief's original approach, which no longer applies).
const getModuleInstanceMock = vi.fn();
vi.mock("@medusajs/framework/modules-sdk", () => ({
  MedusaModule: { getModuleInstance: (...args: unknown[]) => getModuleInstanceMock(...args) },
}));

import CityShippingFulfillmentProvider from "./fulfillment-provider";

describe("CityShippingFulfillmentProvider", () => {
  beforeEach(() => {
    getModuleInstanceMock.mockReset();
  });

  it("canCalculate returns true when a shipping address with a city is present", async () => {
    const provider = new CityShippingFulfillmentProvider();
    const result = await provider.canCalculate({
      data: {},
      context: { shipping_address: { city: "Cairo" } },
    } as any);
    expect(result).toBe(true);
  });

  it("calculatePrice returns the looked-up rate for the cart's city", async () => {
    // Decimal major units (50 means 50.00 EGP) — city_rate.price and
    // calculated_amount both use Medusa v2's Money convention, no ×100
    // scaling. See city-rate.ts model comment.
    const getRateForCity = vi.fn().mockResolvedValue({ city: "Cairo", price: 50, currency: "egp" });
    getModuleInstanceMock.mockReturnValue({ cityShipping: { getRateForCity } });

    const provider = new CityShippingFulfillmentProvider();
    const result = await provider.calculatePrice(
      {} as any,
      {} as any,
      { shipping_address: { city: "Cairo" } } as any,
    );

    expect(result).toEqual({ calculated_amount: 50, is_calculated_price_tax_inclusive: false });
    expect(getRateForCity).toHaveBeenCalledWith("Cairo");
    expect(getModuleInstanceMock).toHaveBeenCalledWith("cityShipping");
  });

  it("getFulfillmentOptions returns one Standard Shipping option", async () => {
    const provider = new CityShippingFulfillmentProvider();
    const options = await provider.getFulfillmentOptions();
    expect(options).toEqual([{ id: "standard-shipping", name: "Standard Shipping", is_return: false }]);
  });
});
