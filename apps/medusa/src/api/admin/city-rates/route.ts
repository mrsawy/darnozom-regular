import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CITY_SHIPPING_MODULE } from "../../../modules/city-shipping";

// Resolution pattern (req.scope.resolve(CITY_SHIPPING_MODULE) from a plain
// admin HTTP route) is the same one already verified working in Task 18's
// /store/available-payment-providers route and in Task 20/21's own module
// consumers — no DI complications here, unlike the fulfillment-provider's
// own nested container (Task 21).

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  // listCityRates({}) is the MedusaService-generated `list${pluralize(modelName)}`
  // method (list("CityRate") -> "listCityRates"), verified for real in Task 20.
  const rates = await service.listCityRates({});
  res.status(200).json({ cityRates: rates });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<any>(CITY_SHIPPING_MODULE);
  const body = req.body as { city: string; price: number; currency: string; isDefault: boolean };
  // createCityRates([...]) is the hand-written override on
  // CityShippingModuleService (service.ts) that shadows the generated
  // create${pluralize(modelName)} method and maps isDefault -> is_default.
  // It takes an array of rows and returns an array of created entities
  // (verified against apps/medusa/src/modules/city-shipping/service.ts).
  const created = await service.createCityRates([body]);
  res.status(201).json({ cityRate: created[0] });
}
