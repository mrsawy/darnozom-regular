import { describe, it, expect, vi } from "vitest";
import { migrateShipping } from "./migrate-shipping";

describe("migrateShipping", () => {
  it("converts shipping_rates rows to city rate records", async () => {
    const shippingDb = {
      select: () => ({
        from: () =>
          Promise.resolve([
            { id: 1, city: "Cairo", price: "50.00", currency: "EGP", isDefault: false },
            { id: 2, city: "Other", price: "80.00", currency: "EGP", isDefault: true },
          ]),
      }),
    };

    const addCityRates = vi.fn().mockResolvedValue(undefined);
    const cityShippingService = { addCityRates };

    const count = await migrateShipping({ shippingDb: shippingDb as any, cityShippingService });

    expect(count).toBe(2);
    expect(addCityRates).toHaveBeenCalledWith([
      { city: "Cairo", price: 5000, currency: "egp", isDefault: false },
      { city: "Other", price: 8000, currency: "egp", isDefault: true },
    ]);
  });
});
