import { MedusaService } from "@medusajs/framework/utils";
import { CityRate } from "./models/city-rate";

// MedusaService({ CityRate }) auto-generates CRUD methods pluralized from the
// model name, including a `createCityRates` on its own prototype (verified
// against the installed @medusajs/utils 2.21.0 —
// node_modules/.pnpm/@medusajs+utils@2.21.0.../dist/modules-sdk/medusa-service.js,
// buildMethodNamesFromModel: `create${upperCaseFirst(pluralize("CityRate"))}`
// = "createCityRates"). That collides in name with the public method this
// module must expose per Task 6's migrate-shipping.ts contract. Standard JS
// subclass method resolution handles this without any special renaming: the
// generated method lives on the base class prototype returned by
// MedusaService(...), and re-declaring `createCityRates` here on the
// subclass prototype simply shadows it via normal prototype-chain lookup —
// confirmed empirically by instantiating a throwaway subclass and calling
// createCityRates(), which resolved to this override, not the generated one.
class CityShippingModuleService extends MedusaService({ CityRate }) {
  async createCityRates(
    rows: Array<{ city: string; price: number; currency: string; isDefault: boolean }>,
  ) {
    return super.createCityRates(
      rows.map((r) => ({
        city: r.city,
        price: r.price,
        currency: r.currency,
        is_default: r.isDefault,
      })),
    );
  }

  async getRateForCity(city: string | null): Promise<{ city: string; price: number; currency: string }> {
    if (city) {
      const matches = await this.listCityRates({ city });
      if (matches.length > 0) {
        return { city: matches[0].city, price: matches[0].price, currency: matches[0].currency };
      }
    }
    const defaults = await this.listCityRates({ is_default: true });
    if (defaults.length === 0) {
      throw new Error("No default city shipping rate configured");
    }
    return { city: defaults[0].city, price: defaults[0].price, currency: defaults[0].currency };
  }
}

export default CityShippingModuleService;
