import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { parseBookProfile } from "../../../../../lib/book-input";
import { BOOK_CATALOG_MODULE, BookProfileConflictError } from "../../../../../modules/book-catalog";
import type BookCatalogModuleService from "../../../../../modules/book-catalog/service";
import {
  BookNotFoundError,
  makeSaveProfileDeps,
  saveBookProfile,
} from "../../../../../lib/save-book-profile";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<BookCatalogModuleService>(BOOK_CATALOG_MODULE);
  const [profile] = await svc.listBookProfiles({ product_id: req.params.id });
  return res.json({ profile: profile ?? null });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = parseBookProfile(req.body);
  if (!parsed.ok) return res.status(400).json({ errors: parsed.errors });
  try {
    const profile = await saveBookProfile(makeSaveProfileDeps(req.scope), req.params.id, parsed.value);
    return res.status(200).json({ profile });
  } catch (err) {
    if (err instanceof BookProfileConflictError) return res.status(409).json({ message: err.message });
    if (err instanceof BookNotFoundError) return res.status(404).json({ message: err.message });
    throw err;
  }
}
