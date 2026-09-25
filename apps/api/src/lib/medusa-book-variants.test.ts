import { describe, it, expect } from "vitest";
import { variantInStock, variantKind } from "./medusa-book-variants";

describe("variantKind", () => {
  it("reads metadata.kind when present", () => {
    expect(variantKind({ metadata: { kind: "paper" } })).toBe("paper");
    expect(variantKind({ metadata: { kind: "digital" } })).toBe("digital");
  });

  it("falls back to an exact option value match when metadata.kind is absent", () => {
    expect(variantKind({ options: [{ value: "ورقي" }] })).toBe("paper");
    expect(variantKind({ options: [{ value: "الكتروني" }] })).toBe("digital");
  });

  it("falls back to a substring match for a labeled edition (multi-edition products)", () => {
    // Real edition names don't equal a bare option word — e.g. two paper
    // tiers on one product might be titled "نسخة ورقية فاخرة" (deluxe) and
    // "نسخة ورقية عادية" (standard). Both must still classify as "paper".
    expect(variantKind({ options: [{ value: "نسخة ورقية فاخرة" }] })).toBe("paper");
    expect(variantKind({ options: [{ value: "Paper - Deluxe Edition" }] })).toBe("paper");
    expect(variantKind({ options: [{ value: "Digital - PDF Download" }] })).toBe("digital");
  });

  it("returns null when nothing matches", () => {
    expect(variantKind({ options: [{ value: "Large" }] })).toBeNull();
    expect(variantKind(null)).toBeNull();
  });
});

describe("variantInStock", () => {
  it("is false for an edition staff took off sale", () => {
    expect(variantInStock({ manage_inventory: false, metadata: { kind: "digital", sale_enabled: false } } as any)).toBe(false);
    expect(variantInStock({ manage_inventory: false, metadata: { kind: "digital" } } as any)).toBe(true);
  });
});
