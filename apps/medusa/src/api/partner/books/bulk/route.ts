import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requirePartnerKey } from "../../../../lib/partner-auth";
import { makePartnerDeps, PartnerError, upsertPartnerBook } from "../../../../lib/partner-books";
import { BookProfileConflictError } from "../../../../modules/book-catalog";

const MAX = 20;

/** Up to 20 books; each succeeds or fails on its own. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  const books = (req.body as { books?: unknown } | undefined)?.books;
  if (!Array.isArray(books) || books.length === 0 || books.length > MAX) {
    return res.status(400).json({ message: `books must be an array of 1–${MAX} books` });
  }
  const deps = makePartnerDeps(req.scope);
  const results = [];
  for (const [index, book] of books.entries()) {
    try {
      results.push({ index, ok: true, ...(await upsertPartnerBook(deps, book)) });
    } catch (err) {
      if (err instanceof PartnerError || err instanceof BookProfileConflictError) {
        results.push({ index, ok: false, message: err.message });
      } else {
        throw err;
      }
    }
  }
  return res.json({ results });
}
