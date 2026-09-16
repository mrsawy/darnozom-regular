import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import PaymobWalletProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaymobWalletProviderService],
});
