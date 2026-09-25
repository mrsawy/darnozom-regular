import { describe, it, expect, vi } from "vitest";

const { loadMock } = vi.hoisted(() => ({ loadMock: vi.fn() }));
vi.mock("../../../../lib/book-catalog-loader", () => ({ loadBookCatalog: loadMock, makeCatalogDeps: () => ({}) }));

import { GET } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /store/books/search", () => {
  it("clamps paging, passes filters and the shopper's sales channels", async () => {
    loadMock.mockResolvedValue({ entries: [], categories: [] });
    const res = fakeRes();
    await GET({ query: { q: "فقه", limit: "500", offset: "-3", format: "digital", language: "xx" }, publishable_key_context: { sales_channel_ids: ["sc_web"] }, scope: {} } as any, res);
    expect(loadMock.mock.calls[0][1]).toMatchObject({ salesChannelIds: ["sc_web"] });
    expect(res.json).toHaveBeenCalledWith({ product_ids: [], count: 0, facets: { authors: [], publishers: [], languages: [] } });
  });
});
