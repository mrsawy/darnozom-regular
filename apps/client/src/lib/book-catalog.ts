import type { HttpTypes } from "@medusajs/types";
import { getMedusaClient, getStoreRegionId } from "./medusa-client";
import { STORE_BOOK_PRODUCT_FIELDS } from "./list-store-books";

export type BookFacet = { value: string; count: number };
export type BookFacets = { authors: BookFacet[]; publishers: BookFacet[]; languages: BookFacet[] };
export type BookSearchParams = {
  q?: string;
  category_id?: string;
  author?: string;
  publisher?: string;
  language?: "ar" | "en" | "both";
  format?: "paper" | "digital";
  limit?: number;
  offset?: number;
};
export type BookProfile = {
  authors: string[];
  editors: string[];
  translators: string[];
  publisher: string | null;
  isbn: string | null;
  publication_year: number | null;
  edition_number: number | null;
  pages: number | null;
  volumes: number;
  language: "ar" | "en" | "both";
  keywords: string[];
  target_audience: string | null;
  table_of_contents: string | null;
};
type CategoryRefBase = { id: string; name: string; name_ar: string | null; handle: string };
export type BookCategoryRef = CategoryRefBase & { parent: CategoryRefBase | null };
export type BookDetails = { profile: BookProfile | null; categories: BookCategoryRef[]; related_product_ids: string[] };
export type CategoryTreeNode = { id: string; name: string; nameAr: string | null; children: CategoryTreeNode[] };

export async function listProductsByIds(ids: string[]): Promise<HttpTypes.StoreProduct[]> {
  if (!ids.length) return [];
  const sdk = getMedusaClient();
  const { products } = await sdk.store.product.list({
    id: ids,
    region_id: await getStoreRegionId(),
    fields: STORE_BOOK_PRODUCT_FIELDS,
    limit: ids.length,
  });
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is HttpTypes.StoreProduct => !!p);
}

export async function searchStoreBooks(
  params: BookSearchParams,
): Promise<{ products: HttpTypes.StoreProduct[]; total: number; facets: BookFacets }> {
  const query = Object.fromEntries(
    Object.entries({ ...params, limit: params.limit ?? 24, offset: params.offset ?? 0 }).filter(
      ([, v]) => v !== undefined && v !== "",
    ),
  );
  const res = await getMedusaClient().client.fetch<{ product_ids: string[]; count: number; facets: BookFacets }>(
    "/store/books/search",
    { query },
  );
  return { products: await listProductsByIds(res.product_ids), total: res.count, facets: res.facets };
}

export async function fetchBookDetails(productId: string): Promise<BookDetails | null> {
  try {
    return await getMedusaClient().client.fetch<BookDetails>(`/store/books/${encodeURIComponent(productId)}`);
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

type RawCategory = { id: string; name: string; parent_category_id: string | null; rank?: number | null; metadata?: Record<string, unknown> | null };

export async function listBookCategoryTree(): Promise<CategoryTreeNode[]> {
  const { product_categories } = await getMedusaClient().store.category.list({
    limit: 500,
    fields: "id,name,parent_category_id,rank,metadata",
  });
  const all = (product_categories ?? []) as unknown as RawCategory[];
  const isBook = (c: RawCategory) => c.metadata?.darnozom === "book";
  const node = (c: RawCategory): CategoryTreeNode => ({
    id: c.id,
    name: c.name,
    nameAr: typeof c.metadata?.name_ar === "string" ? c.metadata.name_ar : null,
    children: all
      .filter((x) => x.parent_category_id === c.id)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map(node),
  });
  return all
    .filter((c) => c.parent_category_id === null && isBook(c))
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(node);
}
