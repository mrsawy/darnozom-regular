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
