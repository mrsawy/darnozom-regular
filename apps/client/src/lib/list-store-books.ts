import type { HttpTypes } from "@medusajs/types";
import { getMedusaClient, getStoreRegionId } from "./medusa-client";

/** Fields needed for book cards, format detection, and Medusa category filters. */
export const STORE_BOOK_PRODUCT_FIELDS =
  "+metadata,*categories,*variants,*variants.calculated_price,*variants.metadata,*variants.options,*tags,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder";

/**
 * Book product type id from Medusa Admin → Settings → Product Types.
 * When set, storefront lists only Book-type products (not demo apparel etc.).
 */
export function getBookProductTypeId(): string | undefined {
  const id = import.meta.env.VITE_MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim();
  return id || undefined;
}

export type StoreBookCategory = {
  id: string;
  name: string;
  handle: string;
  nameAr?: string;
};

export type ListStoreBooksInput = {
  /** Free-text search — forwarded to Medusa Store `q`. */
  q?: string | null;
  /** Medusa product category id (`pcat_…`). */
  categoryId?: string | null;
  limit?: number;
  regionId?: string;
};

/**
 * Lists published store products from Medusa, scoped to the Book product type
 * when `VITE_MEDUSA_BOOK_PRODUCT_TYPE_ID` is configured.
 */
export async function listStoreBooks(
  input: ListStoreBooksInput = {},
): Promise<HttpTypes.StoreProduct[]> {
  const sdk = getMedusaClient();
  const regionId = input.regionId ?? (await getStoreRegionId());
  const typeId = getBookProductTypeId();
  const q = input.q?.trim() || undefined;
  const categoryId = input.categoryId?.trim() || undefined;

  const { products } = await sdk.store.product.list({
    limit: input.limit ?? 100,
    region_id: regionId,
    fields: STORE_BOOK_PRODUCT_FIELDS,
    ...(typeId ? { type_id: typeId } : {}),
    ...(q ? { q } : {}),
    ...(categoryId ? { category_id: categoryId } : {}),
  });

  return products ?? [];
}

const BOOK_CATEGORY_HANDLES = new Set([
  "shariah",
  "management",
  "digital-transformation",
  "digital_transformation",
]);

/**
 * Medusa product categories used as bookstore filters.
 * Prefers categories marked `metadata.darnozom = "book"` or known book handles.
 * Does not fall back to apparel demo categories.
 */
export async function listStoreBookCategories(): Promise<StoreBookCategory[]> {
  const sdk = getMedusaClient();
  const { product_categories } = await sdk.store.category.list({
    limit: 100,
    fields: "id,name,handle,metadata",
  });

  const mapped = (product_categories ?? []).map((c) => {
    const meta = (c.metadata ?? {}) as Record<string, unknown>;
    return {
      id: c.id,
      name: c.name,
      handle: c.handle,
      nameAr: typeof meta.name_ar === "string" ? meta.name_ar : undefined,
      isBook:
        meta.darnozom === "book" || BOOK_CATEGORY_HANDLES.has(c.handle || ""),
    };
  });

  return mapped
    .filter((c) => c.isBook)
    .map(({ id, name, handle, nameAr }) => ({ id, name, handle, nameAr }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
