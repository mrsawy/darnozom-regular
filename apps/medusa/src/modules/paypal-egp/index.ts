import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import PaypalEgpProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaypalEgpProviderService],
});
