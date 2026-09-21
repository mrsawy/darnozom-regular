import { describe, expect, it } from "vitest";
import {
  checkoutMethodFromProviderId,
  checkoutMethodsFromProviderIds,
} from "./region-payment-methods";

describe("region payment methods", () => {
  it("maps Medusa provider ids to checkout methods", () => {
    expect(checkoutMethodFromProviderId("pp_paypal-egp_paypal-egp")).toBe("paypal");
    expect(checkoutMethodFromProviderId("pp_paymob-card_paymob-card")).toBe("card");
    expect(checkoutMethodFromProviderId("pp_paymob-wallet_paymob-wallet")).toBe("wallet");
    expect(checkoutMethodFromProviderId("pp_cod_cod")).toBe("cash_on_delivery");
    expect(checkoutMethodFromProviderId("pp_system_default")).toBeNull();
    expect(checkoutMethodFromProviderId("pp_lemonsqueezy_lemonsqueezy")).toBeNull();
  });

  it("keeps region order and drops providers checkout cannot charge", () => {
    expect(
      checkoutMethodsFromProviderIds([
        "pp_cod_cod",
        "pp_paypal-egp_paypal-egp",
        "pp_system_default",
        "pp_paypal-egp_paypal-egp",
      ]),
    ).toEqual(["cash_on_delivery", "paypal"]);
  });
});
