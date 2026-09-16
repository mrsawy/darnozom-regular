import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CITY_SHIPPING_MODULE } from "../../../../modules/city-shipping";

// update${pluralize(modelName)} / delete${pluralize(modelName)} are
// MedusaService({ CityRate })'s auto-generated CRUD methods (no override on
// CityShippingModuleService for either, unlike createCityRates). Verified
// against the installed @medusajs/utils@2.21.0 source
// (dist/modules-sdk/medusa-service.js's buildMethodNamesFromModel, and the
// update/delete implementations in dist/modules-sdk/medusa-internal-service.js):
//
// - updateCityRates(data, sharedContext?): `data` may be a single object (or
//   array of objects) that embeds the primary key alongside the fields to
//   change, e.g. `{ id, price, isDefault }` -> internally the primary key is
//   extracted as a selector and the remaining fields become the update
//   payload (medusa-internal-service.js's `update()`, lines ~193-202). Since
//   the input here is a single non-array object (not `{selector, data}`),
//   the call returns a single updated entity, not an array — confirmed by
//   `shouldReturnArray` only flipping true for an array or `{selector}` input.
//   The brief's `{ id: req.params.id, ...body }` shape is therefore correct
//   as written; no correction needed.
// - deleteCityRates(primaryKeyValues, sharedContext?): accepts a single id
//   (string) or an array of ids; a single id is auto-wrapped into an array
//   internally. The generated method (medusa-service.js, `case "delete"`)
//   has no return statement, so it resolves to `undefined` regardless of
//   input shape — it does NOT return the deleted entity/id. The brief's
//   route never relies on a return value from this call (it builds its own
//   `{ id, deleted: true }` response body), so no correction needed there
//   either.
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  const body = req.body as { price?: number; isDefault?: boolean };
  const updated = await service.updateCityRates({ id: req.params.id, ...body });
  res.status(200).json({ cityRate: updated });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  await service.deleteCityRates(req.params.id);
  res.status(200).json({ id: req.params.id, deleted: true });
}
