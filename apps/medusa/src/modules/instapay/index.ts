import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import InstapayProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [InstapayProviderService],
});
