import { describe, it, expect } from "vitest";
import { isManualPaymentCode, parseManualPaymentPatch } from "./validation";

describe("isManualPaymentCode", () => {
  it("accepts the two codes only", () => {
    expect(isManualPaymentCode("vodafone_cash")).toBe(true);
    expect(isManualPaymentCode("instapay")).toBe(true);
    expect(isManualPaymentCode("cod")).toBe(false);
    expect(isManualPaymentCode(undefined)).toBe(false);
  });
});

describe("parseManualPaymentPatch", () => {
  it("trims strings and turns empty strings into null", () => {
    const r = parseManualPaymentPatch({ account_name: "  Dar Nozom ", instapay_address: "" });
    expect(r).toEqual({ ok: true, patch: { account_name: "Dar Nozom", instapay_address: null } });
  });

  it("accepts local and international phone formats", () => {
    const r = parseManualPaymentPatch({
      account_number: "010 1234-5678",
      whatsapp_number: "+201012345678",
    });
    expect(r).toEqual({
      ok: true,
      patch: { account_number: "010 1234-5678", whatsapp_number: "+201012345678" },
    });
  });

  it("rejects phone numbers without 8-15 digits", () => {
    const r = parseManualPaymentPatch({ whatsapp_number: "12ab" });
    expect(r.ok).toBe(false);
  });

  it("accepts /static paths and http(s) urls for the QR image, rejects others", () => {
    expect(parseManualPaymentPatch({ qr_image_url: "/static/qr.png" }).ok).toBe(true);
    expect(parseManualPaymentPatch({ qr_image_url: "https://cdn.x/qr.png" }).ok).toBe(true);
    expect(parseManualPaymentPatch({ qr_image_url: "javascript:alert(1)" }).ok).toBe(false);
  });

  it("ignores unknown keys (id/code cannot be changed)", () => {
    const r = parseManualPaymentPatch({ id: "x", code: "instapay", account_name: "A" });
    expect(r).toEqual({ ok: true, patch: { account_name: "A" } });
  });

  it("rejects text longer than 2000 chars", () => {
    expect(parseManualPaymentPatch({ instructions_ar: "x".repeat(2001) }).ok).toBe(false);
  });
});
