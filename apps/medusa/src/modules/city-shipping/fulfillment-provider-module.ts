import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import CityShippingFulfillmentProvider from "./fulfillment-provider";

// Established pattern for every provider module in this codebase (cod,
// paymob-card, paymob-wallet, paypal-egp, lemonsqueezy — Tasks 13-19): a
// provider's `resolve` path in medusa-config.ts must point at a file whose
// default export is a `ModuleProvider(...)`-wrapped `{ services: [...] }`
// object, not the bare service class itself.
//
// The task brief's Step 4 pointed `resolve` directly at
// `./fulfillment-provider` (the raw class file) with no such wrapper. That
// fails at boot: @medusajs/modules-sdk's loadInternalModule
// (dist/loaders/utils/load-internal.js) does
//   let moduleProviderServices = moduleResources.moduleService
//     ? [moduleResources.moduleService]
//     : loadedProvider_.services ?? loadedProvider_;
// and then does `for (const moduleProviderService of moduleProviderServices)`.
// A bare class default-export has no `.services` array, so
// `moduleProviderServices` becomes the class itself, which is not iterable —
// confirmed empirically via `pnpm --filter medusa dev`, which crashed with
// "TypeError: moduleProviderServices is not iterable" until this wrapper
// file was introduced and medusa-config.ts's `resolve` was pointed here
// instead of at the raw service file.
export default ModuleProvider(Modules.FULFILLMENT, {
  services: [CityShippingFulfillmentProvider],
});
