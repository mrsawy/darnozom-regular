export const API_BASE = "/api";

export function adminJsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

/**
 * Authenticated fetch for admin endpoints.
 *
 * The session is an httpOnly cookie, so `credentials: "include"` is the whole
 * mechanism — there is no token to fetch first. This used to await
 * `window.Clerk.session.getToken()` before every request and attach a bearer
 * header, which also meant a request fired before Clerk finished loading went
 * out unauthenticated.
 */
export async function adminFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
  });
}

export async function adminFetchJson<T = unknown>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await adminFetch(input, init);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err && (err as { error?: string }).error) || `Request failed (${r.status})`);
  }
  return r.json() as Promise<T>;
}
