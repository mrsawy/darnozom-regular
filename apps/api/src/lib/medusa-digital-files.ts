import { medusaAdmin } from "./medusa-admin";

/** A file of a book's digital variant, as stored by Medusa's digital-product module. */
export type DigitalFile = {
  id: string;
  variant_id: string;
  title: string;
  file_name: string;
  mime_type: string;
  size: number;
  sort_order: number;
  relative_key: string;
};

export async function listDigitalFilesForVariants(variantIds: string[]): Promise<DigitalFile[]> {
  if (variantIds.length === 0) return [];
  const qs = variantIds.map((id) => `variant_id=${encodeURIComponent(id)}`).join("&");
  const { files } = await medusaAdmin<{ files: DigitalFile[] }>(`/admin/digital-files?${qs}`);
  return files ?? [];
}

export async function getDigitalFile(id: string): Promise<DigitalFile | null> {
  try {
    const { file } = await medusaAdmin<{ file: DigitalFile }>(
      `/admin/digital-files/${encodeURIComponent(id)}`,
    );
    return file ?? null;
  } catch (err) {
    if (/failed \(404\)/.test((err as Error).message)) return null;
    throw err;
  }
}
