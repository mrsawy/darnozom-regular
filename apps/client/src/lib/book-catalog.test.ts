import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
const listProducts = vi.fn();
const listCategories = vi.fn();
vi.mock("./medusa-client", () => ({
  getMedusaClient: () => ({ client: { fetch: fetchMock }, store: { product: { list: listProducts }, category: { list: listCategories } } }),
  getStoreRegionId: async () => "reg_eg",
}));

import { fetchBookDetails, listBookCategoryTree, searchStoreBooks } from "./book-catalog";

beforeEach(() => {
  fetchMock.mockReset();
  listProducts.mockReset();
  listCategories.mockReset();
});

describe("searchStoreBooks", () => {
  it("asks the search API, then loads priced products in the same order", async () => {
    fetchMock.mockResolvedValue({ product_ids: ["p2", "p1"], count: 7, facets: { authors: [], publishers: [], languages: [] } });
    listProducts.mockResolvedValue({ products: [{ id: "p1" }, { id: "p2" }] });
    const r = await searchStoreBooks({ q: "فقه", format: "digital" });
    expect(fetchMock).toHaveBeenCalledWith("/store/books/search", { query: { q: "فقه", format: "digital", limit: 24, offset: 0 } });
    expect(listProducts.mock.calls[0][0]).toMatchObject({ id: ["p2", "p1"], region_id: "reg_eg" });
    expect(r.products.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(r.total).toBe(7);
  });

  it("skips the product call when nothing matched", async () => {
    fetchMock.mockResolvedValue({ product_ids: [], count: 0, facets: { authors: [], publishers: [], languages: [] } });
    const r = await searchStoreBooks({});
    expect(listProducts).not.toHaveBeenCalled();
    expect(r.products).toEqual([]);
  });
});

describe("fetchBookDetails", () => {
  it("returns null for a book the search catalog doesn't know", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("nf"), { status: 404 }));
    expect(await fetchBookDetails("p9")).toBeNull();
  });
});

describe("listBookCategoryTree", () => {
  it("builds sections with subcategories from book categories only", async () => {
    listCategories.mockResolvedValue({
      product_categories: [
        { id: "s1", name: "Islamic Sciences", parent_category_id: null, rank: 1, metadata: { darnozom: "book", name_ar: "العلوم الإسلامية" } },
        { id: "c1", name: "Hadith", parent_category_id: "s1", rank: 0, metadata: { darnozom: "book", name_ar: "الحديث" } },
        { id: "s0", name: "Islamic Law", parent_category_id: null, rank: 0, metadata: { darnozom: "book" } },
        { id: "x", name: "Shirts", parent_category_id: null, rank: 0, metadata: null },
      ],
    });
    expect(await listBookCategoryTree()).toEqual([
      { id: "s0", name: "Islamic Law", nameAr: null, children: [] },
      { id: "s1", name: "Islamic Sciences", nameAr: "العلوم الإسلامية", children: [{ id: "c1", name: "Hadith", nameAr: "الحديث", children: [] }] },
    ]);
  });
});
