import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { buildPartnerOpenApi } from "../../../lib/partner-openapi";

/** Prefer the public URL the client used (ngrok / production), not localhost. */
export function partnerOpenApiServerUrl(req: MedusaRequest): string {
  const xfProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const xfHost = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
  const host = xfHost || String(req.headers.host ?? "").split(",")[0].trim();
  if (host && !/^localhost(?::|$)/i.test(host) && !/^127\.0\.0\.1(?::|$)/i.test(host)) {
    const proto = xfProto || (host.includes("ngrok") || host.includes("darnozom.com") ? "https" : "http");
    return `${proto}://${host}`;
  }
  return (process.env.MEDUSA_BACKEND_URL || "http://localhost:9010").replace(/\/+$/, "");
}

/** Public: paste this URL into the Custom GPT's "Import from URL". */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json(buildPartnerOpenApi(partnerOpenApiServerUrl(req)));
}
