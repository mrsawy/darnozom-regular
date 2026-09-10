import { Buffer } from "node:buffer";

const MAX_TEXT_CHARS = 200_000;

function clip(text: string): string {
  if (!text) return "";
  const collapsed = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n");
  return collapsed.length > MAX_TEXT_CHARS ? collapsed.slice(0, MAX_TEXT_CHARS) : collapsed;
}

async function extractPdf(buf: Buffer): Promise<string> {
  try {
    const mod: any = await import("pdf-parse");
    const pdfParse = mod.default ?? mod;
    const result = await pdfParse(buf);
    return clip(String(result?.text ?? ""));
  } catch (err) {
    return "";
  }
}

async function extractDocx(buf: Buffer): Promise<string> {
  try {
    const mammoth: any = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: buf });
    return clip(String(result?.value ?? ""));
  } catch {
    return "";
  }
}

async function extractXlsx(buf: Buffer): Promise<string> {
  try {
    const xlsx: any = await import("xlsx");
    const wb = xlsx.read(buf, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      if (csv.trim().length > 0) {
        parts.push(`# ${sheetName}\n${csv}`);
      }
    }
    return clip(parts.join("\n\n"));
  } catch {
    return "";
  }
}

function extractText(buf: Buffer): string {
  return clip(buf.toString("utf8"));
}

/**
 * Extract plain text from an uploaded file buffer based on filename + content type.
 * Supports PDF, DOCX, XLSX, CSV, TXT. For images and unsupported types, returns "".
 */
export async function extractTextFromFile(opts: {
  buffer: Buffer;
  fileName: string;
  contentType?: string | null;
}): Promise<string> {
  const name = (opts.fileName ?? "").toLowerCase();
  const ct = (opts.contentType ?? "").toLowerCase();

  if (name.endsWith(".pdf") || ct.includes("pdf")) {
    return extractPdf(opts.buffer);
  }
  if (name.endsWith(".docx") || ct.includes("officedocument.wordprocessingml")) {
    return extractDocx(opts.buffer);
  }
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    ct.includes("officedocument.spreadsheetml") ||
    ct.includes("ms-excel")
  ) {
    return extractXlsx(opts.buffer);
  }
  if (name.endsWith(".csv") || ct.includes("text/csv")) {
    return extractText(opts.buffer);
  }
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    ct.startsWith("text/") ||
    ct.includes("json")
  ) {
    return extractText(opts.buffer);
  }
  // Images and anything else: no extracted text (OCR is out of scope).
  return "";
}

export function isSupportedAttachmentType(fileName: string, contentType?: string | null): boolean {
  const name = (fileName ?? "").toLowerCase();
  const ct = (contentType ?? "").toLowerCase();
  if (
    name.endsWith(".pdf") ||
    name.endsWith(".docx") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  ) {
    return true;
  }
  return ct.startsWith("image/") || ct.startsWith("text/") || ct.includes("pdf") || ct.includes("officedocument") || ct.includes("ms-excel");
}
