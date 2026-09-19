import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import BetterAuthBridgeProvider from "./service";

export default ModuleProvider(Modules.AUTH, {
  services: [BetterAuthBridgeProvider],
});
