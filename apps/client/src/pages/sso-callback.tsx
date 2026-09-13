import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { basePath } from "@/lib/auth-client";

/**
 * Legacy landing page for the OAuth round-trip.
 *
 * Clerk needed a client-side component here to finish the handshake in the
 * browser. Better Auth completes it server-side at /api/auth/callback/google
 * and redirects straight to the app, so nothing is left to do — the route is
 * kept only so old bookmarks and any stale external redirect URI still land
 * somewhere sensible instead of a 404.
 */
export default function SsoCallbackPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("redirect_url") || params.get("next");
    const target = next && next.startsWith("/") ? next : `${basePath}/account`;
    navigate(target.startsWith(basePath) ? target.slice(basePath.length) || "/" : target, {
      replace: true,
    });
  }, [navigate]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0F3D2E] gap-3">
      <Loader2 className="w-4 h-4 animate-spin text-white/60" />
      <div className="text-white/60 text-sm">جارٍ تسجيل الدخول...</div>
    </div>
  );
}
