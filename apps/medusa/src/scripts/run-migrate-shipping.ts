import type { MedusaContainer } from "@medusajs/framework/types";
import { migrateShipping } from "./migrate-shipping";
import { CITY_SHIPPING_MODULE } from "../modules/city-shipping";

// `@workspace/db` is a workspace ESM package ("type": "module" in
// packages/db/package.json), same family as `@workspace/object-store`/
// `@workspace/payment-gateways` from Tasks 11/12. Those needed a CJS/ESM
// interop shim only where a *static* `import` was used from the CJS-compiled
// Medusa scripts output. This script uses a dynamic `await import(...)`
// instead (same pattern already proven working in the committed
// run-migrate-books.ts from Task 5), which Node's CJS loader always
// compiles to a real dynamic `import()` regardless of TS target — so no
// additional shim is needed here.
export default async function ({ container }: { container: MedusaContainer }) {
  const { db } = await import("@workspace/db");
  const cityShippingService = container.resolve(CITY_SHIPPING_MODULE);
  const count = await migrateShipping({
    shippingDb: db as unknown as Parameters<typeof migrateShipping>[0]["shippingDb"],
    cityShippingService,
  });
  console.log(`Migrated ${count} shipping rates.`);
}
