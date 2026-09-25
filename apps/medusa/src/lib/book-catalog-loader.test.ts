import { describe, it, expect, vi } from "vitest";
import { loadBookCatalog } from "./book-catalog-loader";

describe("loadBookCatalog", () => {
  const products = [
    {
      id: "p1", title: "A", subtitle: null, created_at: "2026-01-01", sales_channels: [{ id: "sc_web" }],
      categories: [{ id: "c1" }],
      variants: [
        { metadata: { kind: "paper" } },
        { metadata: { kind: "digital", sale_enabled: false } },
      ],
    },
    { id: "p2", title: "B", subtitle: null, created_at: "2026-01-02", sales_channels: [{ id: "sc_other" }], categories: [], variants: [{ title: "Digital", metadata: null }] },
  ];
  const graph = vi.fn(async ({ entity }: { entity: string }) =>
    entity === "product"
      ? { data: products }
      : { data: [{ id: "c1", name: "Fiqh", handle: "fiqh", parent_category_id: null, metadata: { name_ar: "الفقه" } }] },
  );

  it("keeps books in the shopper's sales channel, with only on-sale formats", async () => {
    const { entries, categories } = await loadBookCatalog(
      { graph, listProfiles: vi.fn(async () => [{ product_id: "p1", authors: ["X"] } as never]) },
      { salesChannelIds: ["sc_web"], bookTypeId: "ptyp_book" },
    );
    expect(entries.map((e) => e.product_id)).toEqual(["p1"]);
    expect(entries[0].formats).toEqual(["paper"]);
    expect(entries[0].profile).toMatchObject({ authors: ["X"] });
    expect(categories[0]).toEqual({ id: "c1", name: "Fiqh", name_ar: "الفقه", handle: "fiqh", parent_category_id: null });
    expect(graph.mock.calls[0][0]).toMatchObject({ filters: { status: "published", type_id: "ptyp_book" } });
  });

  it("detects the edition from the variant title when metadata.kind is missing", async () => {
    const { entries } = await loadBookCatalog({ graph, listProfiles: vi.fn(async () => []) }, { salesChannelIds: [] });
    expect(entries.find((e) => e.product_id === "p2")?.formats).toEqual(["digital"]);
  });
});
