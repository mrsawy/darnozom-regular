import { describe, it, expect, vi, beforeEach } from "vitest";

const { getMedusaClientMock, getStoreRegionIdMock } = vi.hoisted(() => ({
  getMedusaClientMock: vi.fn(),
  getStoreRegionIdMock: vi.fn(),
}));

vi.mock("./medusa-client", () => ({
  getMedusaClient: getMedusaClientMock,
  getStoreRegionId: getStoreRegionIdMock,
}));

describe("listStoreBooks", () => {
  beforeEach(() => {
    getMedusaClientMock.mockReset();
    getStoreRegionIdMock.mockReset();
    getStoreRegionIdMock.mockResolvedValue("reg_eg");
    vi.stubEnv("VITE_MEDUSA_BOOK_PRODUCT_TYPE_ID", "ptyp_book");
  });

  it("lists products with book type_id, category_id, and metadata fields", async () => {
    const list = vi.fn().mockResolvedValue({
      products: [{ id: "prod_1", title: "Book A" }],
    });
    getMedusaClientMock.mockReturnValue({
      store: { product: { list }, category: { list: vi.fn() } },
    });

    const { listStoreBooks } = await import("./list-store-books");
    await listStoreBooks({ q: "fiqh", categoryId: "pcat_1" });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        region_id: "reg_eg",
        type_id: "ptyp_book",
        q: "fiqh",
        category_id: "pcat_1",
        fields: expect.stringContaining("*categories"),
      }),
    );
  });

  it("lists only book-tagged Medusa categories", async () => {
    const categoryList = vi.fn().mockResolvedValue({
      product_categories: [
        {
          id: "pcat_shirt",
          name: "Shirts",
          handle: "shirts",
          metadata: null,
        },
        {
          id: "pcat_shariah",
          name: "Shariah",
          handle: "shariah",
          metadata: { darnozom: "book", name_ar: "الشريعة" },
        },
      ],
    });
    getMedusaClientMock.mockReturnValue({
      store: { product: { list: vi.fn() }, category: { list: categoryList } },
    });

    const { listStoreBookCategories } = await import("./list-store-books");
    const cats = await listStoreBookCategories();
    expect(cats).toEqual([
      {
        id: "pcat_shariah",
        name: "Shariah",
        handle: "shariah",
        nameAr: "الشريعة",
      },
    ]);
  });
});
