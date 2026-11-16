import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "./auth-client";

export interface AdminMe {
  signedIn: boolean;
  isAdmin: boolean;
  email?: string;
}

export function useAdminStatus() {
  const [status, setStatus] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: session, isPending } = useSession();
  const queryClient = useQueryClient();

  const isSignedIn = !!session?.user;

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;

    if (!isSignedIn) {
      setStatus({ signedIn: false, isAdmin: false });
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        // Still server-confirmed rather than read off the session: the role in
        // a cached session could be stale after a revoke, and admin routes are
        // exactly where that must not be trusted.
        const r = await fetch("/api/admin/me", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await r.json();
        if (!cancelled) {
          setStatus(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setStatus({ signedIn: true, isAdmin: false });
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isPending, refreshKey]);

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-me"] });
    setRefreshKey((k) => k + 1);
  }, [queryClient]);

  return { status, loading: loading || isPending, refetch };
}

const adminCheckCache = new Map<string, Promise<boolean>>();

/**
 * Lightweight, shared "is the signed-in user an admin?" check for the many small
 * edit buttons across the public site. One server-confirmed request per signed-in
 * user is shared by every caller (instead of one per card).
 */
export function useIsAdmin(): boolean {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isPending || !userId) { setIsAdmin(false); return; }
    let cancelled = false;
    let p = adminCheckCache.get(userId);
    if (!p) {
      p = fetch("/api/admin/me", { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((d: AdminMe) => !!d?.isAdmin)
        .catch(() => { adminCheckCache.delete(userId); return false; });
      adminCheckCache.set(userId, p);
    }
    void p.then((v) => { if (!cancelled) setIsAdmin(v); });
    return () => { cancelled = true; };
  }, [userId, isPending]);

  return isAdmin;
}
