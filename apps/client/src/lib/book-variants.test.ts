import { describe, it, expect } from "vitest";
import { getBookVariantInfo, variantKind } from "./book-variants";
import type { HttpTypes } from "@medusajs/types";

type StoreProduct = HttpTypes.StoreProduct;

function product(variants: any[]): StoreProduct {
  return { variants } as unknown as StoreProduct;
}

describe("variantKind", () => {
  it("reads metadata.kind when present (migrate-books.ts output)", () => {
    expect(variantKind({ metadata: { kind: "paper" } } as any)).toBe("paper");
    expect(variantKind({ metadata: { kind: "digital" } } as any)).toBe("digital");
  });

  it("falls back to the option value when metadata.kind is absent — the shape a", () => {
    // hand-created Admin product actually has: option "الحالة" with values
    // "ورقي" / "الكتروني" and no metadata at all.
    expect(
      variantKind({ metadata: {}, options: [{ value: "ورقي" }], title: "ورقي" } as any),
    ).toBe("paper");
    expect(
      variantKind({ metadata: {}, options: [{ value: "الكتروني" }], title: "الكتروني" } as any),
    ).toBe("digital");
  });

  it("falls back to English option values (Paper/Digital)", () => {
    expect(variantKind({ options: [{ value: "Paper" }] } as any)).toBe("paper");
    expect(variantKind({ options: [{ value: "Digital" }] } as any)).toBe("digital");
  });

  it("returns null when nothing matches", () => {
    expect(variantKind({ options: [{ value: "Large" }] } as any)).toBeNull();
    expect(variantKind(null)).toBeNull();
  });
});

describe("getBookVariantInfo", () => {
  it("matches variants by option value when metadata.kind is missing (Admin-created product)", () => {
    const p = product([
      {
        id: "variant_paper",
        title: "ورقي",
        metadata: {},
        options: [{ value: "ورقي" }],
        calculated_price: { calculated_amount: 350 },
        manage_inventory: true,
        inventory_quantity: 20,
      },
      {
        id: "variant_digital",
        title: "الكتروني",
        metadata: {},
        options: [{ value: "الكتروني" }],
        calculated_price: { calculated_amount: 150 },
        manage_inventory: false,
        inventory_quantity: null,
      },
    ]);

    const info = getBookVariantInfo(p);
    expect(info.paperVariant?.id).toBe("variant_paper");
    expect(info.digitalVariant?.id).toBe("variant_digital");
    expect(info.paperPrice).toBe(350);
    expect(info.digitalPrice).toBe(150);
    // In stock: paper has manage_inventory + qty > 0; digital has
    // manage_inventory disabled, so it's always purchasable.
    expect(info.paperInStock).toBe(true);
    expect(info.digitalInStock).toBe(true);
  });

  it("treats a managed variant with zero inventory as out of stock", () => {
    const p = product([
      {
        id: "variant_paper",
        metadata: { kind: "paper" },
        calculated_price: { calculated_amount: 350 },
        manage_inventory: true,
        inventory_quantity: 0,
      },
    ]);
    expect(getBookVariantInfo(p).paperInStock).toBe(false);
  });

  it("does not treat a free (0-amount) variant as out of stock — availability is independent of price", () => {
    const p = product([
      {
        id: "variant_digital",
        metadata: { kind: "digital" },
        calculated_price: { calculated_amount: 0 },
        manage_inventory: false,
      },
    ]);
    const info = getBookVariantInfo(p);
    expect(info.digitalPrice).toBe(0);
    expect(info.digitalInStock).toBe(true);
  });

  it("returns every paper/digital variant, not just one of each, when a product has multiple editions", () => {
    const p = product([
      {
        id: "variant_paper_standard",
        title: "Standard",
        metadata: { kind: "paper" },
        options: [{ value: "Standard" }],
        calculated_price: { calculated_amount: 100 },
        manage_inventory: false,
      },
      {
        id: "variant_paper_deluxe",
        title: "Deluxe",
        metadata: { kind: "paper" },
        options: [{ value: "Deluxe" }],
        calculated_price: { calculated_amount: 250 },
        manage_inventory: false,
      },
      {
        id: "variant_digital",
        title: "Digital",
        metadata: { kind: "digital" },
        options: [{ value: "Digital" }],
        calculated_price: { calculated_amount: 60 },
        manage_inventory: false,
      },
    ]);

    const info = getBookVariantInfo(p);
    expect(info.paperEditions).toHaveLength(2);
    expect(info.paperEditions.map((e) => e.variant.id)).toEqual([
      "variant_paper_standard",
      "variant_paper_deluxe",
    ]);
    expect(info.paperEditions.map((e) => e.label)).toEqual(["Standard", "Deluxe"]);
    expect(info.paperEditions.map((e) => e.price)).toEqual([100, 250]);
    expect(info.digitalEditions).toHaveLength(1);
    expect(info.digitalEditions[0].variant.id).toBe("variant_digital");

    // Back-compat single-variant fields still point at the first match.
    expect(info.paperVariant?.id).toBe("variant_paper_standard");
    expect(info.paperPrice).toBe(100);
  });

  it("classifies a labeled edition by substring when it isn't an exact option-value match", () => {
    // e.g. "نسخة ورقية فاخرة" (a real edition name) contains "ورقية" but
    // isn't equal to it — must still resolve to "paper".
    expect(variantKind({ options: [{ value: "نسخة ورقية فاخرة" }] } as any)).toBe("paper");
    expect(variantKind({ options: [{ value: "Paper - Deluxe Edition" }] } as any)).toBe("paper");
    expect(variantKind({ options: [{ value: "Digital - PDF Download" }] } as any)).toBe("digital");
  });
});
