export const API_BASE = "/api";

export function adminJsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

interface ClerkGlobal {
  session?: { getToken: () => Promise<string | null> };
}

async function getClerkToken(): Promise<string | null> {
  try {
    const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

export async function adminFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = await getClerkToken();
  return fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
