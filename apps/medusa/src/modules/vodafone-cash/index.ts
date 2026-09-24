import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import VodafoneCashProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [VodafoneCashProviderService],
});
