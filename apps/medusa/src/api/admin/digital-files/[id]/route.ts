import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DIGITAL_PRODUCT_MODULE } from "../../../../modules/digital-product";
import type DigitalProductModuleService from "../../../../modules/digital-product/service";
import { deletePrivateFile } from "../../../../lib/private-file-store";

async function findFile(req: MedusaRequest) {
  const service = req.scope.resolve<DigitalProductModuleService>(DIGITAL_PRODUCT_MODULE);
  const [file] = await service.listDigitalBookFiles({ id: req.params.id });
  return { service, file };
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { file } = await findFile(req);
  if (!file) return res.status(404).json({ error: "File not found" });
  return res.status(200).json({ file });
}

/** Rename / reorder. Only `title` and `sort_order` can change. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { title?: unknown; sort_order?: unknown };
  const patch: { title?: string; sort_order?: number } = {};
  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, 300);
    if (!title) return res.status(400).json({ error: "title cannot be empty" });
    patch.title = title;
  }
  if (body.sort_order !== undefined) {
    const n = Number(body.sort_order);
    if (!Number.isInteger(n) || n < 0) {
      return res.status(400).json({ error: "sort_order must be a non-negative integer" });
    }
    patch.sort_order = n;
  }
  const { service, file } = await findFile(req);
  if (!file) return res.status(404).json({ error: "File not found" });
  const updated = await service.updateDigitalBookFiles({ id: file.id, ...patch });
  return res.status(200).json({ file: updated });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { service, file } = await findFile(req);
  if (!file) return res.status(404).json({ error: "File not found" });
  await service.deleteDigitalBookFiles(file.id);
  await deletePrivateFile(file.relative_key);
  return res.status(200).json({ id: file.id, deleted: true });
}
