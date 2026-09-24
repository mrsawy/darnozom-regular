import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { randomUUID } from "crypto";
import type { Readable } from "stream";
import { DIGITAL_PRODUCT_MODULE } from "../../../../modules/digital-product";
import type DigitalProductModuleService from "../../../../modules/digital-product/service";
import { savePrivateFileStream } from "../../../../lib/private-file-store";
import {
  MAX_DIGITAL_FILE_BYTES,
  digitalFileObjectKey,
  mimeTypeForFileName,
  safeFileName,
} from "../../../../lib/digital-book-files";

/**
 * Upload one file to a book's digital variant. The request body IS the file
 * (raw bytes, body parsing disabled in api/middlewares.ts) so large files are
 * streamed straight to private storage instead of buffered in memory.
 *
 * Query: variant_id (required), filename (required), title (optional).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const q = req.query as Record<string, string | undefined>;
  const variantId = q.variant_id?.trim();
  const originalName = q.filename?.trim();
  if (!variantId || !originalName) {
    return res.status(400).json({ error: "variant_id and filename are required" });
  }

  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > MAX_DIGITAL_FILE_BYTES) {
    return res.status(413).json({ error: "File too large (max 200 MB)" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "metadata"],
    filters: { id: variantId },
  });
  const variant = data[0] as { id: string; metadata?: { kind?: string } | null } | undefined;
  if (!variant || variant.metadata?.kind !== "digital") {
    return res.status(400).json({ error: "Files can only be added to a digital variant" });
  }

  const fileName = safeFileName(originalName);
  const mimeType = mimeTypeForFileName(fileName);
  const relativeKey = digitalFileObjectKey(variantId, fileName, randomUUID());

  let size: number;
  try {
    ({ size } = await savePrivateFileStream(
      relativeKey,
      req as unknown as Readable,
      mimeType,
      { maxBytes: MAX_DIGITAL_FILE_BYTES },
    ));
  } catch (err) {
    if (/too large/i.test((err as Error).message)) {
      return res.status(413).json({ error: "File too large (max 200 MB)" });
    }
    throw err;
  }

  const service = req.scope.resolve<DigitalProductModuleService>(DIGITAL_PRODUCT_MODULE);
  const existing = await service.listFilesForVariants([variantId]);
  const file = await service.createDigitalBookFiles({
    variant_id: variantId,
    title: q.title?.trim() || originalName,
    file_name: fileName,
    relative_key: relativeKey,
    mime_type: mimeType,
    size,
    sort_order: existing.length,
  });
  return res.status(201).json({ file });
}
