/**
 * Server-to-server calls to the Medusa Admin API.
 * Secret keys authenticate with HTTP Basic, not Bearer.
 */
export function medusaAdminAuthHeader(): string {
  const key = process.env.MEDUSA_ADMIN_API_KEY;
  if (!key) throw new Error("MEDUSA_ADMIN_API_KEY is not set");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export async function medusaAdmin<T>(path: string, init: RequestInit = {}): Promise<T> {
  const backend = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "");
  if (!backend) throw new Error("MEDUSA_BACKEND_URL is not set");

  const headers = new Headers(init.headers);
  headers.set("Authorization", medusaAdminAuthHeader());
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${backend}${path}`, { ...init, headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Medusa admin ${init.method || "GET"} ${path} failed (${res.status}): ${detail.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}
