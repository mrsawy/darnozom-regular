import { moduleIntegrationTestRunner } from "@medusajs/test-utils";
import { CITY_SHIPPING_MODULE } from "../index";
import CityShippingModuleService from "../service";

moduleIntegrationTestRunner<CityShippingModuleService>({
  moduleName: CITY_SHIPPING_MODULE,
  resolve: "./src/modules/city-shipping",
  testSuite: ({ service }) => {
    describe("CityShippingModuleService", () => {
      it("getRateForCity returns the matching city's rate", async () => {
        await service.addCityRates([
          { city: "Cairo", price: 5000, currency: "egp", isDefault: false },
          { city: "Other", price: 8000, currency: "egp", isDefault: true },
        ]);
        const rate = await service.getRateForCity("Cairo");
        expect(rate).toEqual({ city: "Cairo", price: 5000, currency: "egp" });
      });

      it("getRateForCity falls back to the default row for an unrecognized city", async () => {
        await service.addCityRates([
          { city: "Alexandria", price: 6000, currency: "egp", isDefault: false },
          { city: "Fallback", price: 9000, currency: "egp", isDefault: true },
        ]);
        const rate = await service.getRateForCity("Nowhereville");
        expect(rate).toEqual({ city: "Fallback", price: 9000, currency: "egp" });
      });

      it("getRateForCity falls back to the default row when city is null", async () => {
        await service.addCityRates([
          { city: "DefaultOnly", price: 7000, currency: "egp", isDefault: true },
        ]);
        const rate = await service.getRateForCity(null);
        expect(rate).toEqual({ city: "DefaultOnly", price: 7000, currency: "egp" });
      });
    });
  },
});
