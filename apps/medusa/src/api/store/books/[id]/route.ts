import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { loadBookCatalog, makeCatalogDeps } from "../../../../lib/book-catalog-loader";
import { relatedBooks } from "../../../../lib/book-search";

/** Book page extras: profile, category trail (with section), related books. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const salesChannelIds =
    ((req as unknown as { publishable_key_context?: { sales_channel_ids?: string[] } }).publishable_key_context?.sales_channel_ids) ?? [];
  const { entries, categories } = await loadBookCatalog(makeCatalogDeps(req.scope), {
    salesChannelIds,
    bookTypeId: process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim() || undefined,
  });
  const entry = entries.find((e) => e.product_id === req.params.id);
  if (!entry) return res.status(404).json({ message: "Book not found" });

  const byId = new Map(categories.map((c) => [c.id, c]));
  const pick = (c: { id: string; name: string; name_ar: string | null; handle: string }) => ({ id: c.id, name: c.name, name_ar: c.name_ar, handle: c.handle });
  const primary = entry.profile?.primary_category_id;
  const orderedIds = [...new Set([...(primary ? [primary] : []), ...entry.category_ids])];
  const trail = orderedIds.flatMap((id) => {
    const c = byId.get(id);
    if (!c) return [];
    const parent = c.parent_category_id ? byId.get(c.parent_category_id) : undefined;
    return [{ ...pick(c), parent: parent ? pick(parent) : null }];
  });

  return res.json({
    profile: entry.profile,
    categories: trail,
    related_product_ids: relatedBooks(entries, entry.product_id),
  });
}
