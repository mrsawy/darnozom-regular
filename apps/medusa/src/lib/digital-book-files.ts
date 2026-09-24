// Helpers for the files attached to a book's digital variant (PDF, EPUB,
// MP3, ZIP, …). Files live in the private object store under
// book-files/<variantId>/ and are only ever served to buyers of a paid order
// (see apps/api routes/account/library.ts).

export const MAX_DIGITAL_FILE_BYTES = 200 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  zip: "application/zip",
};

export type DigitalFileKind = "pdf" | "epub" | "audio" | "other";

/** Keep a readable ASCII base name + lowercased extension; drop any path. */
export function safeFileName(raw: string): string {
  const base = (raw || "").split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : dot === 0 ? "" : base;
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const cleanStem = stem
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  const name = cleanStem || "file";
  return ext ? `${name}.${ext}` : name;
}

export function mimeTypeForFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function digitalFileKind(mimeType: string): DigitalFileKind {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/epub+zip") return "epub";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

export function digitalFileObjectKey(variantId: string, fileName: string, uniqueId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(variantId)) {
    throw new Error(`Invalid variant id: ${variantId}`);
  }
  return `book-files/${variantId}/${uniqueId}-${safeFileName(fileName)}`;
}
