import { lookup as dnsLookup } from "dns/promises";
import { isIP } from "net";
import path from "path";

// Downloads a cover/extra image for the partner (ChatGPT) API. The URL comes
// from outside, so it must never reach internal services (SSRF): https only,
// every resolved address must be public, redirects are refused.
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

export class ImageFetchError extends Error {}

function v4Private(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  );
}

export function isPrivateAddress(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (isIP(lower) === 4) return v4Private(lower);
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return v4Private(mapped[1]);
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower);
}

async function defaultLookup(host: string): Promise<string[]> {
  return (await dnsLookup(host, { all: true })).map((a) => a.address);
}

export async function fetchPublicImage(
  url: string,
  deps: { lookup?(host: string): Promise<string[]>; fetchImpl?: typeof fetch; maxBytes?: number } = {},
): Promise<{ filename: string; mimeType: string; base64: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImageFetchError(`${url}: not a valid URL`);
  }
  if (parsed.protocol !== "https:") throw new ImageFetchError(`${url}: only https:// image URLs are accepted`);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await (deps.lookup ?? defaultLookup)(host);
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new ImageFetchError(`${url}: not a public address`);
  }

  const res = await (deps.fetchImpl ?? fetch)(parsed, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status >= 300 && res.status < 400) throw new ImageFetchError(`${url}: redirects are not followed — give the final image URL`);
  if (!res.ok) throw new ImageFetchError(`${url}: download failed (${res.status})`);
  const mimeType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TYPES[mimeType]) throw new ImageFetchError(`${url}: not an image (JPEG, PNG, WebP or GIF)`);

  const max = deps.maxBytes ?? MAX_BYTES;
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new ImageFetchError(`${url}: image too large (max ${max} bytes)`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > max) throw new ImageFetchError(`${url}: image too large (max ${max} bytes)`);

  const base = path.basename(parsed.pathname).replace(/[^\w.-]+/g, "-").slice(0, 80) || "image";
  const filename = path.extname(base) ? base : `${base}${TYPES[mimeType]}`;
  return { filename, mimeType, base64: Buffer.from(bytes).toString("base64") };
}
