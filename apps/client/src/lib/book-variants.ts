import type { HttpTypes } from "@medusajs/types";

type StoreProduct = HttpTypes.StoreProduct;
type StoreProductVariant = HttpTypes.StoreProductVariant;

export type BookEditionKind = "paper" | "digital";

/**
 * Option values used across the storefront (and by hand-created Admin
 * products) to mean "paper" / "digital" when a variant carries no
 * `metadata.kind`. Keep in sync with whatever the Admin team actually
 * types into a variant's option value.
 */
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

/**
 * Resolves a variant's edition kind. Prefers explicit `metadata.kind`
 * (set by the migrate-books script) and falls back to matching the
 * variant's own option value (set implicitly whenever a variant is
 * created by hand in Medusa Admin, e.g. option "الحالة" = "ورقي"/"الكتروني").
 *
 * Falling back to metadata-only here (the storefront's original behavior)
 * silently hides any product an admin creates directly in Medusa Admin:
 * no metadata.kind means no edition matches, which reads to shoppers as
 * "free" and "out of stock" with no variant picker. See fix for the
 * `الرحيق المختوم` product, created via Admin with option "الحالة".
 */
export function variantKind(variant: StoreProductVariant | undefined | null): BookEditionKind | null {
  if (!variant) return null;
  const metaKind = (variant.metadata as Record<string, unknown> | undefined)?.kind;
  if (metaKind === "paper" || metaKind === "digital") return metaKind;

  const optionValues = (variant.options ?? [])
    .map((o) => normalize((o as { value?: unknown }).value))
    .filter(Boolean);
  // Variant title is also commonly the format label ("Paper"/"ورقي").
  optionValues.push(normalize(variant.title));

  for (const value of optionValues) {
    if (PAPER_OPTION_VALUES.has(value)) return "paper";
    if (DIGITAL_OPTION_VALUES.has(value)) return "digital";
  }
  return null;
}

export interface BookVariantInfo {
  paperVariant?: StoreProductVariant;
  digitalVariant?: StoreProductVariant;
  paperPrice: number;
  digitalPrice: number;
  /** Whether the edition can be purchased at all — independent of price. */
  paperInStock: boolean;
  digitalInStock: boolean;
}

function amountOf(variant: StoreProductVariant | undefined): number {
  return typeof variant?.calculated_price?.calculated_amount === "number"
    ? variant.calculated_price.calculated_amount
    : 0;
}

/**
 * A variant with `manage_inventory` off, or with backorders allowed, is
 * always purchasable. Otherwise it needs a positive `inventory_quantity`.
 * `inventory_quantity` is only populated when explicitly requested via
 * `fields=+variants.inventory_quantity`; if it's missing we assume the
 * variant is purchasable rather than defaulting to "out of stock" — an
 * absent field must not read as no stock.
 */
function isInStock(variant: StoreProductVariant | undefined): boolean {
  if (!variant) return false;
  if (variant.manage_inventory === false) return true;
  if (variant.allow_backorder) return true;
  if (variant.inventory_quantity == null) return true;
  return variant.inventory_quantity > 0;
}

export function getBookVariantInfo(product: StoreProduct): BookVariantInfo {
  const variants = product.variants || [];
  const paperVariant = variants.find((v) => variantKind(v) === "paper");
  const digitalVariant = variants.find((v) => variantKind(v) === "digital");
  return {
    paperVariant,
    digitalVariant,
    paperPrice: amountOf(paperVariant),
    digitalPrice: amountOf(digitalVariant),
    paperInStock: isInStock(paperVariant),
    digitalInStock: isInStock(digitalVariant),
  };
}
