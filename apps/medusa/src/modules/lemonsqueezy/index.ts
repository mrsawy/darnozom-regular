import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import LemonSqueezyProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [LemonSqueezyProviderService],
});
