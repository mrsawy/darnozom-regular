/**
 * Server-to-server POST from Medusa to the Express API's /api/internal/*
 * routes, authenticated with the shared bridge secret. Returns null when no
 * secret is configured (callers decide whether that is fatal).
 */
export async function expressInternalFetch(path: string, body: unknown): Promise<Response | null> {
  const apiBase = (
    process.env.DARNOZOM_API_URL ||
    process.env.VITE_API_PROXY_TARGET ||
    "http://127.0.0.1:8087"
  ).replace(/\/$/, "");
  const secret =
    process.env.BETTER_AUTH_BRIDGE_SECRET?.trim() ||
    process.env.ADMIN_SOCKET_NOTIFY_SECRET?.trim();
  if (!secret) return null;

  return fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
}
