import { describe, it, expect, vi } from "vitest";
import { createBook, type CreateBookDeps } from "./create-book";
import { BookProfileConflictError } from "../modules/book-catalog";
import type { CreateBookInput } from "./book-input";

const input: CreateBookInput = {
  title: "السياسة الشرعية",
  subtitle: null,
  description: "نص احترافي",
  status: "draft",
  sales_channel_id: "sc_1",
  image_urls: ["https://cdn/x/cover.jpg", "https://cdn/x/back.jpg"],
  additional_category_ids: ["pcat_gov"],
  print: { price: 120, stock: 7 },
  digital: null,
  profile: {
    authors: ["أحمد"], editors: [], translators: [], publisher: "دار نظم", isbn: "9780306406157",
    external_id: null, publication_year: 2024, edition_number: 2, pages: 320, volumes: 1,
    language: "ar", primary_category_id: "pcat_siyasa", keywords: ["سياسة"], target_audience: null,
    table_of_contents: null, digital_rights: false,
  },
};

function deps(existingProfile: unknown = null): CreateBookDeps & { saved: unknown[] } {
  const saved: unknown[] = [];
  return {
    saved,
    profileRepo: {
      listBookProfiles: vi.fn(async (f) => (existingProfile && "isbn" in f ? [existingProfile] : [])) as never,
      createBookProfiles: vi.fn(),
      updateBookProfiles: vi.fn(),
    },
    createProduct: vi.fn(async () => ({ product: { id: "prod_9" }, paperVariantId: "var_p", digitalVariantId: null })),
    saveProfile: {
      repo: { listBookProfiles: vi.fn(async () => []), createBookProfiles: vi.fn(async (x) => { saved.push(x); return { id: "bp", ...x }; }), updateBookProfiles: vi.fn() } as never,
      getProduct: vi.fn(async () => ({ id: "prod_9", metadata: null, category_ids: ["pcat_siyasa", "pcat_gov"] })),
      updateProduct: vi.fn(async () => undefined),
    },
  };
}

describe("createBook", () => {
  it("creates the product with the right editions, categories and images, then the profile", async () => {
    const d = deps();
    const out = await createBook(d, input);
    expect(d.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "السياسة الشرعية",
        status: "draft",
        salesChannelId: "sc_1",
        thumbnailUrl: "https://cdn/x/cover.jpg",
        imageUrls: ["https://cdn/x/cover.jpg", "https://cdn/x/back.jpg"],
        hasPaper: true,
        paperPrice: 120,
        paperInventoryQty: 7,
        hasDigital: false,
        categoryIds: ["pcat_siyasa", "pcat_gov"],
        author: "أحمد",
        language: "ar",
      }),
    );
    expect(out.product.id).toBe("prod_9");
    expect(d.saved[0]).toMatchObject({ product_id: "prod_9", isbn: "9780306406157" });
  });

  it("refuses a duplicate ISBN before creating anything", async () => {
    const d = deps({ id: "bp_old", product_id: "prod_old", isbn: "9780306406157" });
    await expect(createBook(d, input)).rejects.toBeInstanceOf(BookProfileConflictError);
    expect(d.createProduct).not.toHaveBeenCalled();
  });
});
