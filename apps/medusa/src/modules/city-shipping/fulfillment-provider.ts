import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";
import { MedusaModule } from "@medusajs/framework/modules-sdk";
import type { CalculateShippingOptionPriceContext } from "@medusajs/framework/types";
import { CITY_SHIPPING_MODULE } from "./index";

interface CityShippingServiceLike {
  getRateForCity(city: string | null): Promise<{ city: string; price: number; currency: string }>;
}

// DI key naming — the plan's own flagged open question, and the real answer
// turned out to be more involved than "wrong key name":
//
// The task brief guessed that medusa-config.ts's `dependencies: [CITY_SHIPPING_MODULE]`
// on a fulfillment-provider config entry injects the resolved cityShipping
// module service into the provider's constructor container, under either
// "cityShippingService" (the brief's guess) or "cityShipping" (this module's
// registered key, the more plausible correction). Neither is true.
//
// Static read of @medusajs/modules-sdk@2.21.0's dist/loaders/utils/load-internal.js
// (loadInternalModule) shows a `dependencies` array IS consulted and injected
// into a local container this way — but that code path only runs for a
// module's own top-level `resolve: './src/modules/xyz'` entry, never for an
// entry inside a module's `options.providers[]` array (i.e. FULFILLMENT/PAYMENT
// providers like this one).
//
// Providers under `options.providers[]` are loaded by a completely different,
// simpler loader: @medusajs/fulfillment's dist/loaders/providers.js calls
// @medusajs/modules-sdk's `moduleProviderLoader` (dist/loaders/module-provider-loader.js),
// whose `loadModuleProvider` does `new service(cradle, provider.options)` where
// `cradle` is the FULFILLMENT module's own local container (its own services/
// repositories — confirmed empirically, see below) — `dependencies` is never
// read by this loader at all. So `dependencies: [CITY_SHIPPING_MODULE]` in
// medusa-config.ts is inert for this class of provider; the "dependencies"
// field only works for whole-module registrations, not provider registrations.
//
// This was confirmed empirically two ways:
//   1. A temporary `console.log(Object.keys(container))` in this class's
//      constructor, with the dev server booted via `pnpm --filter medusa dev`
//      and triggered via `medusa exec`, printed the FULFILLMENT module's own
//      service/repository keys (fulfillmentModuleService, shippingOptionService,
//      etc.) — no "cityShipping" or "cityShippingService" key was present.
//   2. This matches a known, still-open upstream Medusa limitation:
//      medusajs/medusa issue #10487 ("Unable to add additional injected
//      dependencies to custom fulfillment provider") and issue #6146
//      (resolving container services in a FulfillmentProvider constructor
//      breaks provider registration) — both confirm fulfillment/payment
//      providers do not support arbitrary container DI the way regular
//      modules do.
//
// The working alternative — confirmed empirically via `medusa exec` — is
// `MedusaModule.getModuleInstance(moduleKey)` from `@medusajs/framework/modules-sdk`,
// a static, globally-populated registry independent of any one container's
// cradle. It returns a wrapper object keyed by the module's registered name
// (`{ cityShipping: CityShippingModuleService instance }`), not the module
// service directly. Resolution is deferred to `calculatePrice` (not read in
// the constructor) both because the constructor's timing relative to sibling
// module registration isn't guaranteed, and because issue #6146 above shows
// early container/registry reads in a fulfillment provider's constructor can
// break provider registration outright.
function resolveCityShippingService(): CityShippingServiceLike {
  const wrapper = MedusaModule.getModuleInstance(CITY_SHIPPING_MODULE) as
    | Record<string, CityShippingServiceLike>
    | undefined;
  const service = wrapper?.[CITY_SHIPPING_MODULE];
  if (!service) {
    throw new Error(
      `city-shipping fulfillment provider: could not resolve the "${CITY_SHIPPING_MODULE}" module instance`,
    );
  }
  return service;
}

class CityShippingFulfillmentProvider extends AbstractFulfillmentProviderService {
  static identifier = "city-shipping";

  async getFulfillmentOptions() {
    return [{ id: "standard-shipping", name: "Standard Shipping", is_return: false }];
  }

  async canCalculate(_data: unknown): Promise<boolean> {
    return true; // rate lookup always resolves via the default-city fallback
  }

  async calculatePrice(
    _optionData: unknown,
    _data: unknown,
    context: CalculateShippingOptionPriceContext,
  ) {
    const city = context.shipping_address?.city ?? null;
    const rate = await resolveCityShippingService().getRateForCity(city);
    return { calculated_amount: rate.price, is_calculated_price_tax_inclusive: false };
  }

  async validateFulfillmentData(_optionData: unknown, data: Record<string, unknown>) {
    return data;
  }

  async validateOption(_data: unknown): Promise<boolean> {
    return true;
  }

  async createFulfillment(_data: unknown) {
    return { data: {}, labels: [] };
  }

  async cancelFulfillment(_data: unknown) {
    return {};
  }
}

export default CityShippingFulfillmentProvider;
export { resolveCityShippingService };
