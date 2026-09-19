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
  // addCityRates([...]) maps isDefault -> is_default, then calls the
  // generated createCityRates on MedusaService.
  const created = await service.addCityRates([body]);
  res.status(201).json({ cityRate: created[0] });
}
