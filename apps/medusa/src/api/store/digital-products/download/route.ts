import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { verifySignedObjectToken } from "../../../../lib/signed-object-url";
import { openPrivateObjectStream } from "../../../../lib/medusa-object-store";

function contentTypeFor(relativeKey: string): string {
  if (relativeKey.endsWith(".pdf")) return "application/pdf";
  if (relativeKey.endsWith(".epub")) return "application/epub+zip";
  return "application/octet-stream";
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const token = (req.query as Record<string, string>).token;
  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  let relativeKey: string;
  try {
    ({ relativeKey } = verifySignedObjectToken(token));
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  res.setHeader("Content-Type", contentTypeFor(relativeKey));
  res.setHeader("Cache-Control", "no-store");
  const stream = openPrivateObjectStream(relativeKey);
  stream.pipe(res);
}
