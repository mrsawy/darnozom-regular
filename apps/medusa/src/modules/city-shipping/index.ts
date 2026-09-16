import { Module } from "@medusajs/framework/utils";
import CityShippingModuleService from "./service";

// The plan's own text flags "citySipping" and its self-correction
// "citySshipping" as typos and lands on "cityShipping" as the intended
// module key. Using that spelling here.
export const CITY_SHIPPING_MODULE = "cityShipping";

export default Module(CITY_SHIPPING_MODULE, {
  service: CityShippingModuleService,
});
