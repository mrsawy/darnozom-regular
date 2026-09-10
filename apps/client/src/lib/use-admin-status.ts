import { useCallback, useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

export interface AdminMe {
  signedIn: boolean;
  isAdmin: boolean;
  email?: string;
}

export function useAdminStatus() {
  const [status, setStatus] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    if (!isSignedIn) {
      setStatus({ signedIn: false, isAdmin: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const r = await fetch("/api/admin/me", {
          credentials: "include",
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  }, [isSignedIn, isLoaded, refreshKey, getToken]);

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-me"] });
    setRefreshKey((k) => k + 1);
  }, [queryClient]);

  return { status, loading: loading || !isLoaded, refetch };
}
