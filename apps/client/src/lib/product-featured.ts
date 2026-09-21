/**
 * Shared featured detection for storefront cards (tag `featured` OR metadata.isFeatured).
 */
export function productIsFeatured(product: {
  metadata?: Record<string, unknown> | null;
  tags?: Array<{ value?: string | null }> | null;
}): boolean {
  const meta = product.metadata || {};
  if (meta.isFeatured === true || meta.isFeatured === "true") return true;
  return (product.tags || []).some(
    (t) => (t.value || "").toLowerCase() === "featured",
  );
}
