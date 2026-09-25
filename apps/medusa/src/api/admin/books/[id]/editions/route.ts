import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { addEdition, EditionError, listEditions, makeEditionDeps } from "../../../../../lib/book-editions";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const product = await makeEditionDeps(req.scope).getProduct(req.params.id);
  if (!product) return res.status(404).json({ message: "Book not found" });
  return res.json({ editions: listEditions(product) });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { kind?: unknown; price?: unknown; stock?: unknown };
  if (body.kind !== "paper" && body.kind !== "digital") {
    return res.status(400).json({ message: "kind must be 'paper' or 'digital'" });
  }
  try {
    const out = await addEdition(makeEditionDeps(req.scope), req.params.id, {
      kind: body.kind,
      price: Number(body.price),
      stock: body.stock === undefined ? undefined : Number(body.stock),
    });
    return res.status(201).json(out);
  } catch (err) {
    if (err instanceof EditionError) return res.status(err.status).json({ message: err.message });
    throw err;
  }
}
