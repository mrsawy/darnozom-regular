import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { parseCreateBook } from "../../../lib/book-input";
import { createBook, makeCreateBookDeps } from "../../../lib/create-book";
import { BookProfileConflictError } from "../../../modules/book-catalog";

/** Create Book (Medusa Admin → Products → Create Book). Body: CreateBookInput. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = parseCreateBook(req.body);
  if (!parsed.ok) return res.status(400).json({ errors: parsed.errors, message: parsed.errors.join("; ") });
  try {
    const out = await createBook(makeCreateBookDeps(req.scope), parsed.value);
    return res.status(201).json(out);
  } catch (err) {
    if (err instanceof BookProfileConflictError) return res.status(409).json({ message: err.message });
    const message = err instanceof Error ? err.message : String(err);
    const status = /required|must be (a )?positive|at least one edition|MEDUSA_BOOK_PRODUCT_TYPE_ID/i.test(message) ? 400 : 500;
    return res.status(status).json({ message });
  }
}
