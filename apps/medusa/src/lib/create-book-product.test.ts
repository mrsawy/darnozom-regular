import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBookProduct } from "./create-book-product";

const BOOK_TYPE_ID = "ptyp_book_test";

describe("createBookProduct", () => {
  const originalEnv = process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID;

  beforeEach(() => {
    process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID = BOOK_TYPE_ID;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID;
    else process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID = originalEnv;
  });

  it("throws when MEDUSA_BOOK_PRODUCT_TYPE_ID is missing", async () => {
    delete process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID;
    await expect(
      createBookProduct({} as any, {
        title: "X",
        salesChannelId: "sc_1",
        paperPrice: 10,
        digitalPrice: 5,
      }),
    ).rejects.toThrow(/MEDUSA_BOOK_PRODUCT_TYPE_ID/);
  });

  it("creates a product with exclusive Format option and paper/digital variants", async () => {
    const run = vi.fn().mockResolvedValue({
      result: [
        {
          id: "prod_1",
          variants: [
            { id: "var_p", title: "Paper", metadata: { kind: "paper" } },
            { id: "var_d", title: "Digital", metadata: { kind: "digital" } },
          ],
        },
      ],
    });
    const levelsRun = vi.fn().mockResolvedValue({ result: [] });
    const graph = vi.fn().mockImplementation(async ({ entity }: { entity: string }) => {
      if (entity === "shipping_profile") return { data: [{ id: "sp_1" }] };
      if (entity === "variant") {
        return {
          data: [
            {
              id: "var_p",
              inventory_items: [{ inventory_item_id: "iitem_1" }],
            },
          ],
        };
      }
      if (entity === "stock_location") return { data: [{ id: "sloc_1" }] };
      return { data: [] };
    });

    const result = await createBookProduct({} as any, {
      title: "الرحيق المختوم",
      description: "A classic",
      status: "published",
      salesChannelId: "sc_1",
      thumbnailUrl: "https://cdn.example/cover.jpg",
      paperPrice: 600,
      digitalPrice: 200,
      paperInventoryQty: 20,
      __testCreateProductsWorkflow: () => ({ run }),
      __testCreateInventoryLevelsWorkflow: () => ({ run: levelsRun }),
      __testQuery: { graph },
    });

    expect(result.product.id).toBe("prod_1");
    expect(result.paperVariantId).toBe("var_p");
    expect(result.digitalVariantId).toBe("var_d");

    const productInput = run.mock.calls[0][0].input.products[0];
    expect(productInput.type_id).toBe(BOOK_TYPE_ID);
    expect(productInput.shipping_profile_id).toBe("sp_1");
    expect(productInput.sales_channels).toEqual([{ id: "sc_1" }]);
    expect(productInput.options).toEqual([
      {
        title: "Format",
        values: ["Paper", "Digital"],
        is_exclusive: true,
      },
    ]);
    expect(productInput.variants).toHaveLength(2);
    expect(productInput.variants[0].metadata).toEqual({ kind: "paper" });
    expect(productInput.variants[0].manage_inventory).toBe(true);
    expect(productInput.variants[0].prices[0]).toEqual({
      amount: 600,
      currency_code: "egp",
    });
    expect(productInput.variants[1].metadata).toEqual({ kind: "digital" });
    expect(productInput.variants[1].manage_inventory).toBe(false);

    expect(levelsRun).toHaveBeenCalledWith({
      input: {
        inventory_levels: [
          {
            inventory_item_id: "iitem_1",
            location_id: "sloc_1",
            stocked_quantity: 20,
          },
        ],
      },
    });
  });

  it("rejects non-positive prices", async () => {
    await expect(
      createBookProduct({} as any, {
        title: "X",
        salesChannelId: "sc_1",
        paperPrice: 0,
        digitalPrice: 5,
      }),
    ).rejects.toThrow(/paperPrice and digitalPrice/);
  });
});
