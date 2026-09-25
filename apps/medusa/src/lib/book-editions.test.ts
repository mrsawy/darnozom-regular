import { describe, it, expect, vi } from "vitest";
import { addEdition, EditionError, listEditions, setEditionSaleEnabled, type EditionDeps, type EditionProduct } from "./book-editions";

const product = (variants: EditionProduct["variants"]): EditionProduct => ({
  id: "prod_1",
  options: [{ title: "Format", values: [{ value: "Paper" }, { value: "Digital" }] }],
  variants,
});
const paper = { id: "var_p", title: "Paper", metadata: { kind: "paper" }, manage_inventory: true, prices: [{ amount: 120, currency_code: "egp" }] };

function deps(p: EditionProduct | null, digitalRights = false): EditionDeps {
  return {
    getProduct: vi.fn(async () => p),
    getProfile: vi.fn(async () => ({ digital_rights: digitalRights })),
    createVariant: vi.fn(async () => ({ id: "var_new" })),
    setStock: vi.fn(async () => undefined),
    updateVariantMetadata: vi.fn(async () => undefined),
  };
}

describe("listEditions", () => {
  it("lists paper/digital variants with EGP price and sale flag", () => {
    const eds = listEditions(product([paper, { ...paper, id: "var_d", title: "Digital", metadata: { kind: "digital", sale_enabled: false }, manage_inventory: false, prices: [] }]));
    expect(eds).toEqual([
      { variant_id: "var_p", kind: "paper", title: "Paper", price: 120, sale_enabled: true, manage_inventory: true },
      { variant_id: "var_d", kind: "digital", title: "Digital", price: null, sale_enabled: false, manage_inventory: false },
    ]);
  });
});

describe("addEdition", () => {
  it("adds a digital edition to a print-only book that has digital rights", async () => {
    const d = deps(product([paper]), true);
    await addEdition(d, "prod_1", { kind: "digital", price: 40 });
    expect(d.createVariant).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "prod_1",
        title: "Digital",
        options: { Format: "Digital" },
        prices: [{ amount: 40, currency_code: "egp" }],
        manage_inventory: false,
        allow_backorder: true,
        metadata: { kind: "digital" },
      }),
    );
    expect(d.setStock).not.toHaveBeenCalled();
  });

  it("refuses a digital edition without digital rights", async () => {
    await expect(addEdition(deps(product([paper]), false), "prod_1", { kind: "digital", price: 40 })).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a second edition of the same kind", async () => {
    await expect(addEdition(deps(product([paper])), "prod_1", { kind: "paper", price: 10 })).rejects.toBeInstanceOf(EditionError);
  });

  it("adds a print edition with stock", async () => {
    const d = deps(product([]));
    await addEdition(d, "prod_1", { kind: "paper", price: 90, stock: 12 });
    expect(d.createVariant).toHaveBeenCalledWith(expect.objectContaining({ manage_inventory: true, metadata: { kind: "paper" } }));
    expect(d.setStock).toHaveBeenCalledWith("var_new", 12);
  });

  it("explains when the product has no Format option", async () => {
    const p = { ...product([]), options: [{ title: "الحالة", values: [{ value: "ورقي" }] }] };
    await expect(addEdition(deps(p, true), "prod_1", { kind: "digital", price: 5 })).rejects.toThrow(/Format/);
  });
});

describe("setEditionSaleEnabled", () => {
  it("merges sale_enabled into the variant's metadata", async () => {
    const d = deps(product([paper]));
    await setEditionSaleEnabled(d, "prod_1", "var_p", false);
    expect(d.updateVariantMetadata).toHaveBeenCalledWith("var_p", { kind: "paper", sale_enabled: false });
  });

  it("404s for a variant that isn't an edition of this book", async () => {
    await expect(setEditionSaleEnabled(deps(product([paper])), "prod_1", "var_x", false)).rejects.toMatchObject({ status: 404 });
  });
});
