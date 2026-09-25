import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { loadBookCatalog, makeCatalogDeps } from "../../../../lib/book-catalog-loader";
import { searchBooks, type BookSearchFilters } from "../../../../lib/book-search";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : undefined);

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query ?? {}) as Record<string, unknown>;
  const limit = Math.min(Math.max(Number(q.limit) || 24, 1), 48);
  const offset = Math.max(Number(q.offset) || 0, 0);
  const language = q.language === "ar" || q.language === "en" || q.language === "both" ? q.language : undefined;
  const format = q.format === "paper" || q.format === "digital" ? q.format : undefined;
  const filters: BookSearchFilters = {
    q: str(q.q), category_id: str(q.category_id), author: str(q.author), publisher: str(q.publisher),
    language, format, limit, offset,
  };
  const salesChannelIds =
    ((req as unknown as { publishable_key_context?: { sales_channel_ids?: string[] } }).publishable_key_context?.sales_channel_ids) ?? [];
  const { entries, categories } = await loadBookCatalog(makeCatalogDeps(req.scope), {
    salesChannelIds,
    bookTypeId: process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim() || undefined,
  });
  return res.json(searchBooks(entries, categories, filters));
}
