import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requirePartnerKey } from "../../../lib/partner-auth";
import { makePartnerDeps, PartnerError, upsertPartnerBook } from "../../../lib/partner-books";
import { findProfileByIdentity, BookProfileConflictError } from "../../../modules/book-catalog";
import { normalizeIsbn } from "../../../lib/book-text";

/** Look up a book by ISBN or external_id: GET /partner/books?isbn=… */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  const q = req.query as Record<string, string | undefined>;
  const deps = makePartnerDeps(req.scope);
  const row = await findProfileByIdentity(deps.profileRepo, { isbn: normalizeIsbn(q.isbn), external_id: q.external_id?.trim() || null });
  if (!row) return res.json({ book: null });
  return res.json({ book: { product_id: row.product_id, status: await deps.productStatus(row.product_id) } });
}

/** Create (or update, while still a draft) one book. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  try {
    const out = await upsertPartnerBook(makePartnerDeps(req.scope), req.body);
    return res.status(out.status === "created" ? 201 : 200).json(out);
  } catch (err) {
    if (err instanceof PartnerError) return res.status(err.status).json({ message: err.message, errors: err.errors });
    if (err instanceof BookProfileConflictError) return res.status(409).json({ message: err.message });
    throw err;
  }
}
