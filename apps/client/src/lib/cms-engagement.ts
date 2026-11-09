import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const SHARE_CHANNELS = ["x", "facebook", "whatsapp", "telegram", "linkedin", "instagram", "email", "copy", "native"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export interface Engagement {
  viewCount: number;
  shareCount: number;
  likeCount: number;
  commentCount: number;
  likesEnabled: boolean;
  commentsEnabled: boolean;
  liked: boolean;
}
export interface PublicComment { id: number; authorName: string; body: string; createdAt: string; mine: boolean; isGuest: boolean }

/** Public share-intent URLs. Pure so it can be unit tested. */
export function shareUrl(channel: Exclude<ShareChannel, "copy" | "native" | "instagram">, url: string, title: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (channel) {
    case "x": return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    case "facebook": return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "whatsapp": return `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
    case "telegram": return `https://t.me/share/url?url=${u}&text=${t}`;
    case "linkedin": return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "email": return `mailto:?subject=${t}&body=${u}`;
  }
}

/** Compact counter: 1.2K / 3.4M. */
export function formatCount(n: number, lang: "ar" | "en"): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed (${r.status})`);
  }
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T);
}

export function useEngagement(itemId: number | undefined) {
  return useQuery({
    queryKey: ["cms", "engagement", itemId],
    queryFn: () => send<Engagement>(`/api/cms/items/${itemId}/engagement`, "GET"),
    enabled: !!itemId,
  });
}

/** Counts one view per item per browser tab session. */
export function recordView(itemId: number) {
  const key = `cms-viewed:${itemId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch { /* storage blocked: count anyway */ }
  void fetch(`/api/cms/items/${itemId}/view`, { method: "POST", credentials: "include" }).catch(() => {});
}

export function recordShare(itemId: number, channel: ShareChannel) {
  return send<{ shareCount: number }>(`/api/cms/items/${itemId}/share`, "POST", { channel });
}

export function useToggleLike(itemId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (like: boolean) => send<{ liked: boolean; likeCount: number }>(`/api/cms/items/${itemId}/like`, like ? "PUT" : "DELETE"),
    onSuccess: (r) =>
      qc.setQueryData<Engagement>(["cms", "engagement", itemId], (old) => old && { ...old, liked: r.liked, likeCount: r.likeCount }),
  });
}

export function useComments(itemId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["cms", "comments", itemId],
    queryFn: () => send<{ enabled: boolean; comments: PublicComment[] }>(`/api/cms/items/${itemId}/comments`, "GET"),
    enabled,
  });
}

export function usePostComment(itemId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { body: string; guestName?: string }) => send<PublicComment>(`/api/cms/items/${itemId}/comments`, "POST", v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cms", "comments", itemId] });
      void qc.invalidateQueries({ queryKey: ["cms", "engagement", itemId] });
    },
  });
}

export function useDeleteComment(itemId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => send<void>(`/api/cms/comments/${id}`, "DELETE"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cms", "comments", itemId] });
      void qc.invalidateQueries({ queryKey: ["cms", "engagement", itemId] });
    },
  });
}
