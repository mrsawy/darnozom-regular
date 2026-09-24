import { Button, Input, Text, toast } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";

// Digital-book files for one digital variant. Used by the product widget,
// the variant widget and the Create Book page.

export const DIGITAL_FILES_HINT = "PDF, EPUB, MP3, ZIP or any file — up to 200 MB each.";

/** Upload files to a digital variant, one request per file (raw body). */
export async function uploadDigitalFiles(variantId: string, files: File[]): Promise<void> {
  for (const file of files) {
    const qs = new URLSearchParams({ variant_id: variantId, filename: file.name });
    const res = await fetch(`/admin/digital-files/upload?${qs}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`${file.name}: ${body.error || `upload failed (${res.status})`}`);
    }
  }
}

interface DigitalFile {
  id: string;
  variant_id: string;
  title: string;
  file_name: string;
  mime_type: string;
  size: number;
  sort_order: number;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function VariantFiles({ variantId, label }: { variantId: string; label: string }) {
  const [files, setFiles] = useState<DigitalFile[] | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/admin/digital-files?variant_id=${encodeURIComponent(variantId)}`, {
      credentials: "include",
    });
    const body = await res.json();
    setFiles(body.files ?? []);
  }, [variantId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (list: FileList) => {
    setUploading(true);
    try {
      await uploadDigitalFiles(variantId, Array.from(list));
      toast.success("Files uploaded");
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
      await load();
    }
  };

  const update = async (id: string, patch: { title?: string; sort_order?: number }) => {
    const res = await fetch(`/admin/digital-files/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) toast.error("Save failed");
  };

  const move = async (index: number, delta: -1 | 1) => {
    if (!files) return;
    const other = index + delta;
    if (other < 0 || other >= files.length) return;
    const a = files[index];
    const b = files[other];
    await update(a.id, { sort_order: other });
    await update(b.id, { sort_order: index });
    await load();
  };

  const remove = async (file: DigitalFile) => {
    if (!window.confirm(`Delete "${file.title}"? Buyers will lose access to this file.`)) return;
    const res = await fetch(`/admin/digital-files/${file.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) toast.error("Delete failed");
    await load();
  };

  return (
    <div className="flex flex-col gap-y-3 border-t px-6 py-4">
      <Text weight="plus">{label}</Text>
      {files === null ? (
        <Text size="small">Loading…</Text>
      ) : files.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle">
          No files yet — buyers of this edition will have nothing to download.
        </Text>
      ) : (
        files.map((f, i) => (
          <div key={f.id} className="flex items-center gap-x-2">
            <Input
              defaultValue={f.title}
              onBlur={(e) => {
                const title = e.target.value.trim();
                if (title && title !== f.title) update(f.id, { title }).then(load);
              }}
            />
            <Text size="small" className="text-ui-fg-subtle whitespace-nowrap">
              {f.file_name} · {formatSize(f.size)}
            </Text>
            <Button size="small" variant="transparent" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </Button>
            <Button
              size="small"
              variant="transparent"
              disabled={i === files.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </Button>
            <Button size="small" variant="danger" onClick={() => remove(f)}>
              Delete
            </Button>
          </div>
        ))
      )}
      <div>
        <input
          type="file"
          multiple
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading && <Text size="small">Uploading…</Text>}
        <Text size="xsmall" className="text-ui-fg-subtle">
          {DIGITAL_FILES_HINT}
        </Text>
      </div>
    </div>
  );
}

