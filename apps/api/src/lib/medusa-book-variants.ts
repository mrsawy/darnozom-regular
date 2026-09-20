import { medusaAdmin } from "./medusa-admin";

/**
 * Server-side twin of apps/client/src/lib/book-variants.ts. Kept as a
 * separate file (no shared package between apps/api and apps/client) but
 * the matching rules must stay identical: a variant is "paper" or "digital"
 * either by metadata.kind (set by migrate-books.ts) or, for a product
 * created directly in Medusa Admin — which never gets metadata.kind — by
 * its option value. See apps/client/src/lib/book-variants.ts for the full
 * rationale and the storefront-side regression this fixed.
 */

export type BookEditionKind = "paper" | "digital";

const PAPER_OPTION_VALUES = new Set(["paper", "ورقي", "ورقية", "hardcopy"]);
const DIGITAL_OPTION_VALUES = new Set([
  "digital",
  "الكتروني",
  "إلكتروني",
  "الكترونيه",
  "إلكترونية",
  "online",
  "pdf",
]);

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

interface MedusaVariantLike {
  metadata?: Record<string, unknown> | null;
  options?: Array<{ value?: unknown }> | null;
  title?: string | null;
}

export function variantKind(variant: MedusaVariantLike | null | undefined): BookEditionKind | null {
  if (!variant) return null;
  const metaKind = variant.metadata?.kind;
  if (metaKind === "paper" || metaKind === "digital") return metaKind;

  const optionValues = (variant.options ?? [])
    .map((o) => normalize(o?.value))
    .filter(Boolean);
  optionValues.push(normalize(variant.title));

  for (const value of optionValues) {
    if (PAPER_OPTION_VALUES.has(value)) return "paper";
    if (DIGITAL_OPTION_VALUES.has(value)) return "digital";
  }
  return null;
}

interface MedusaAdminPrice {
  currency_code: string;
  amount: number;
}

interface MedusaAdminVariant {
  id: string;
  title: string | null;
  metadata?: Record<string, unknown> | null;
  options?: Array<{ value?: unknown }> | null;
  prices?: MedusaAdminPrice[] | null;
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  inventory_quantity?: number | null;
}

interface MedusaAdminProduct {
  id: string;
  title: string;
  status: string;
  thumbnail: string | null;
  metadata?: Record<string, unknown> | null;
  variants?: MedusaAdminVariant[] | null;
}

export interface ResolvedBookProduct {
  productId: string;
  title: string;
  thumbnail: string | null;
  paperVariant?: MedusaAdminVariant;
  digitalVariant?: MedusaAdminVariant;
}

/**
 * Fetches a Medusa product by id via the Admin API and classifies its
 * variants into paper/digital. Returns null if the product doesn't exist
 * (404) — callers treat that as "book not found", same as the old
 * `books` table lookup returning no row.
 */
export async function fetchBookProduct(productId: string): Promise<ResolvedBookProduct | null> {
  let product: MedusaAdminProduct;
  try {
    const res = await medusaAdmin<{ product: MedusaAdminProduct }>(
      `/admin/products/${encodeURIComponent(productId)}` +
        `?fields=id,title,status,thumbnail,metadata,` +
        `*variants,*variants.prices,*variants.options,*variants.metadata,` +
        `+variants.manage_inventory,+variants.allow_backorder,+variants.inventory_quantity`,
    );
    product = res.product;
  } catch (err) {
    // medusaAdmin throws on any non-ok response, including 404 — inspect the
    // message rather than adding a second HTTP client codepath.
    if (err instanceof Error && /\(404\)/.test(err.message)) return null;
    throw err;
  }
  if (!product) return null;

  const variants = product.variants ?? [];
  const paperVariant = variants.find((v) => variantKind(v) === "paper");
  const digitalVariant = variants.find((v) => variantKind(v) === "digital");

  return {
    productId: product.id,
    title: product.title,
    thumbnail: product.thumbnail,
    paperVariant,
    digitalVariant,
  };
}

export function variantPrice(variant: MedusaAdminVariant | undefined, currencyCode: string): number | null {
  if (!variant) return null;
  const match = (variant.prices ?? []).find(
    (p) => p.currency_code.toLowerCase() === currencyCode.toLowerCase(),
  );
  return match ? match.amount : null;
}

/** Same rule as apps/client/src/lib/book-variants.ts: a variant with
 * inventory management off, or backorders allowed, is always purchasable;
 * otherwise it needs a positive inventory_quantity. */
export function variantInStock(variant: MedusaAdminVariant | undefined): boolean {
  if (!variant) return false;
  if (variant.manage_inventory === false) return true;
  if (variant.allow_backorder) return true;
  if (variant.inventory_quantity == null) return true;
  return variant.inventory_quantity > 0;
}
