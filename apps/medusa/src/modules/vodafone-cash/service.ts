import { ManualTransferProvider } from "../../lib/manual-transfer-provider";

class VodafoneCashProviderService extends ManualTransferProvider {
  static identifier = "vodafone-cash";
  protected readonly label = "Vodafone Cash";
}

export default VodafoneCashProviderService;
