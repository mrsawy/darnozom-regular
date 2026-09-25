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
  // Exact match failed — e.g. a labeled edition like "نسخة ورقية فاخرة" or
  // "Paper - Deluxe" that contains a known word but isn't equal to it. Try
  // substring matching before giving up: it's what actually distinguishes a
  // classifiable variant from a genuinely unrelated option ("Large", "Blue").
  for (const value of optionValues) {
    for (const p of PAPER_OPTION_VALUES) if (value.includes(p)) return "paper";
    for (const d of DIGITAL_OPTION_VALUES) if (value.includes(d)) return "digital";
  }
  return null;
}

export interface BookEdition {
  variant: StoreProductVariant;
  kind: BookEditionKind;
  /** A human label for this specific edition when a product has more than
   * one paper (or digital) variant — e.g. "Paper — Deluxe" vs "Paper —
   * Standard". Falls back to the variant's own title/option value, since
   * that's the only thing distinguishing two variants of the same kind. */
  label: string;
  price: number;
  inStock: boolean;
}

export interface BookVariantInfo {
  /** Every paper-kind variant on the product, in variant order. A product
   * can have more than one (e.g. two paper editions) — the storefront must
   * let the shopper choose among all of them, not just the first match. */
  paperEditions: BookEdition[];
  /** Every digital-kind variant on the product. */
  digitalEditions: BookEdition[];
  // Back-compat single-variant conveniences (first paper/digital match) for
  // callers that only care "is there a paper edition at all" — e.g. filters,
  // list-page lowest-price sorting. New UI should use *Editions above to
  // show every variant instead of picking just one.
  paperVariant?: StoreProductVariant;
  digitalVariant?: StoreProductVariant;
  paperPrice: number;
  digitalPrice: number;
  paperInStock: boolean;
  digitalInStock: boolean;
}

function amountOf(variant: StoreProductVariant | undefined): number {
  return typeof variant?.calculated_price?.calculated_amount === "number"
    ? variant.calculated_price.calculated_amount
    : 0;
}

/**
 * An edition taken off sale is never purchasable. Otherwise, a variant with
 * `manage_inventory` off, or with backorders allowed, is always purchasable.
 * Otherwise it needs a positive `inventory_quantity`.
 * `inventory_quantity` is only populated when explicitly requested via
 * `fields=+variants.inventory_quantity`; if it's missing we assume the
 * variant is purchasable rather than defaulting to "out of stock" — an
 * absent field must not read as no stock.
 */
function isInStock(variant: StoreProductVariant | undefined): boolean {
  if (!variant) return false;
  // Staff can take an edition off sale (Medusa Admin → Editions) without
  // deleting it; buyers who already own it keep their access.
  if ((variant.metadata as Record<string, unknown> | null | undefined)?.sale_enabled === false) return false;
  if (variant.manage_inventory === false) return true;
  if (variant.allow_backorder) return true;
  if (variant.inventory_quantity == null) return true;
  return variant.inventory_quantity > 0;
}

function editionLabel(variant: StoreProductVariant): string {
  const optionValue = (variant.options ?? [])
    .map((o) => (o as { value?: unknown }).value)
    .find((v): v is string => typeof v === "string" && v.trim().length > 0);
  return (optionValue ?? variant.title ?? "").trim() || variant.id;
}

export function getBookVariantInfo(product: StoreProduct): BookVariantInfo {
  const variants = product.variants || [];
  const editions: BookEdition[] = variants
    .map((v) => {
      const kind = variantKind(v);
      if (!kind) return null;
      return {
        variant: v,
        kind,
        label: editionLabel(v),
        price: amountOf(v),
        inStock: isInStock(v),
      };
    })
    .filter((e): e is BookEdition => e !== null);

  const paperEditions = editions.filter((e) => e.kind === "paper");
  const digitalEditions = editions.filter((e) => e.kind === "digital");
  const paperVariant = paperEditions[0]?.variant;
  const digitalVariant = digitalEditions[0]?.variant;

  return {
    paperEditions,
    digitalEditions,
    paperVariant,
    digitalVariant,
    paperPrice: amountOf(paperVariant),
    digitalPrice: amountOf(digitalVariant),
    paperInStock: isInStock(paperVariant),
    digitalInStock: isInStock(digitalVariant),
  };
}
