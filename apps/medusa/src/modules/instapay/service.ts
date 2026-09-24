import { ManualTransferProvider } from "../../lib/manual-transfer-provider";

class InstapayProviderService extends ManualTransferProvider {
  static identifier = "instapay";
  protected readonly label = "InstaPay";
}

export default InstapayProviderService;
