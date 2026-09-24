import { describe, it, expect } from "vitest";
import {
  toWhatsAppDigits,
  buildWhatsAppLink,
  isConfigured,
  withoutUnconfiguredManualMethods,
  unconfiguredManualMethods,
} from "./manual-payments";

describe("toWhatsAppDigits", () => {
  it("converts Egyptian local numbers to international", () => {
    expect(toWhatsAppDigits("010 1234 5678")).toBe("201012345678");
    expect(toWhatsAppDigits("01012345678")).toBe("201012345678");
  });

  it("keeps international formats", () => {
    expect(toWhatsAppDigits("+20 101 234 5678")).toBe("201012345678");
    expect(toWhatsAppDigits("00201012345678")).toBe("201012345678");
    expect(toWhatsAppDigits("+966501234567")).toBe("966501234567");
  });

  it("rejects garbage", () => {
    expect(toWhatsAppDigits("")).toBeNull();
    expect(toWhatsAppDigits("123")).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the order message", () => {
    const link = buildWhatsAppLink({
      number: "01012345678",
      orderId: 12,
      method: "vodafone_cash",
      amount: "250.00",
      currency: "EGP",
      lang: "en",
    })!;
    expect(link.startsWith("https://wa.me/201012345678?text=")).toBe(true);
    const text = decodeURIComponent(link.split("text=")[1]);
    expect(text).toContain("#12");
    expect(text).toContain("Vodafone Cash");
    expect(text).toContain("250.00 EGP");
  });

  it("returns null for an unusable number", () => {
    expect(
      buildWhatsAppLink({
        number: "x",
        orderId: 1,
        method: "instapay",
        amount: "1",
        currency: "EGP",
        lang: "ar",
      }),
    ).toBeNull();
  });
});

describe("isConfigured", () => {
  const base = {
    account_number: null,
    account_name: null,
    whatsapp_number: "01012345678",
    instapay_address: null,
    qr_image_url: null,
    instructions_ar: null,
    instructions_en: null,
  };

  it("vodafone cash needs a wallet number and whatsapp", () => {
    expect(isConfigured({ ...base, code: "vodafone_cash" })).toBe(false);
    expect(isConfigured({ ...base, code: "vodafone_cash", account_number: "01000000000" })).toBe(true);
  });

  it("instapay needs a QR or address, and whatsapp", () => {
    expect(isConfigured({ ...base, code: "instapay" })).toBe(false);
    expect(isConfigured({ ...base, code: "instapay", instapay_address: "dar@instapay" })).toBe(true);
    expect(
      isConfigured({ ...base, code: "instapay", instapay_address: "a", whatsapp_number: null }),
    ).toBe(false);
  });
});

describe("withoutUnconfiguredManualMethods", () => {
  const empty = {
    account_number: null,
    account_name: null,
    whatsapp_number: null,
    instapay_address: null,
    qr_image_url: null,
    instructions_ar: null,
    instructions_en: null,
  };

  it("drops manual methods whose payment details are not filled in", () => {
    const details = [
      { ...empty, code: "vodafone_cash" as const },
      { ...empty, code: "instapay" as const },
    ];
    expect(
      withoutUnconfiguredManualMethods(["paypal", "vodafone_cash", "instapay"], details),
    ).toEqual(["paypal"]);
  });

  it("keeps a manual method once its details are complete", () => {
    const details = [
      { ...empty, code: "vodafone_cash" as const, account_number: "01011112222", whatsapp_number: "01033334444" },
      { ...empty, code: "instapay" as const },
    ];
    expect(
      withoutUnconfiguredManualMethods(["vodafone_cash", "instapay", "card"], details),
    ).toEqual(["vodafone_cash", "card"]);
  });

  it("drops manual methods when their details are missing entirely", () => {
    expect(withoutUnconfiguredManualMethods(["instapay", "cash_on_delivery"], [])).toEqual([
      "cash_on_delivery",
    ]);
  });
});

describe("unconfiguredManualMethods", () => {
  const empty = {
    account_number: null,
    account_name: null,
    whatsapp_number: null,
    instapay_address: null,
    qr_image_url: null,
    instructions_ar: null,
    instructions_en: null,
  };

  it("lists manual methods enabled on the region but missing payment details", () => {
    const details = [
      { ...empty, code: "vodafone_cash" as const, account_number: "01011112222", whatsapp_number: "01033334444" },
      { ...empty, code: "instapay" as const },
    ];
    expect(
      unconfiguredManualMethods(["cash_on_delivery", "vodafone_cash", "instapay"], details),
    ).toEqual(["instapay"]);
  });

  it("ignores manual methods that are not enabled on the region", () => {
    expect(unconfiguredManualMethods(["cash_on_delivery"], [])).toEqual([]);
  });

  it("treats missing details as unconfigured", () => {
    expect(unconfiguredManualMethods(["vodafone_cash", "paypal"], [])).toEqual(["vodafone_cash"]);
  });
});
