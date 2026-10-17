import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import { BOOK_CATALOG_MODULE } from "../../../../../modules/book-catalog";
import type BookCatalogModuleService from "../../../../../modules/book-catalog/service";

// PATCH /admin/books/:id/flags  { is_darnozom: boolean }
// Updates product metadata and the book profile (if it exists) atomically.
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as Record<string, unknown>;
  if (typeof body.is_darnozom !== "boolean") {
    return res.status(400).json({ message: "is_darnozom (boolean) is required" });
  }

  const query = req.scope.resolve("query");
  const { data } = await (query as { graph: Function }).graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: req.params.id },
  });
  const product = (data as Array<{ id: string; metadata: Record<string, unknown> | null }>)[0];
  if (!product) return res.status(404).json({ message: "product not found" });

  await updateProductsWorkflow(req.scope).run({
    input: { products: [{ id: req.params.id, metadata: { ...(product.metadata ?? {}), is_darnozom: body.is_darnozom } }] },
  });

  // Also update the profile row if it exists.
  const svc = req.scope.resolve<BookCatalogModuleService>(BOOK_CATALOG_MODULE);
  const [profile] = await svc.listBookProfiles({ product_id: req.params.id });
  if (profile) await svc.updateBookProfiles({ id: profile.id, is_darnozom: body.is_darnozom });

  return res.json({ ok: true });
}
