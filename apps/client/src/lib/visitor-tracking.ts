import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Website-visitor tracking, three layers fed from one hook:
 *  1. first-party collector (our DB → admin dashboard + live view)
 *  2. optional Google Tag Manager   (VITE_GTM_ID) or Google Analytics 4 (VITE_GA_MEASUREMENT_ID)
 *  3. optional Umami                (VITE_UMAMI_SRC + VITE_UMAMI_WEBSITE_ID)
 * Everything is a silent no-op on failure and skips /admin pages.
 */

const HEARTBEAT_MS = 30_000;

function safeStorage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function getId(kind: "local" | "session", key: string): string {
  const store = safeStorage(kind);
  let id = store?.getItem(key) ?? null;
  if (!id) {
    id = crypto.randomUUID();
    try { store?.setItem(key, id); } catch { /* ignore */ }
  }
  return id;
}

function send(type: "view" | "ping", path: string, ref?: string) {
  const payload = JSON.stringify({
    type,
    vid: getId("local", "dz_vid"),
    sid: getId("session", "dz_sid"),
    path,
    ref,
  });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/visitors/collect", blob)) return;
    void fetch("/api/visitors/collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
  } catch { /* ignore */ }
}

function loadScript(attrs: Record<string, string>): void {
  const s = document.createElement("script");
  s.async = true;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

let providersReady = false;
function initProviders() {
  if (providersReady) return;
  providersReady = true;
  const gtm = import.meta.env.VITE_GTM_ID?.trim();
  const ga = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (gtm) {
    const w = window as unknown as { dataLayer: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript({ src: `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtm)}` });
  } else if (ga) {
    // Direct gtag is skipped when GTM is set, so the GA tag lives in one place (no double counting).
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag("js", new Date());
    // SPA: we send page_view ourselves on each route change.
    w.gtag("config", ga, { send_page_view: false, anonymize_ip: true });
    loadScript({ src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}` });
  }
  const umamiSrc = import.meta.env.VITE_UMAMI_SRC?.trim();
  const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim();
  if (umamiSrc && umamiId) {
    // Umami tracks SPA route changes on its own (history API).
    loadScript({ src: umamiSrc, "data-website-id": umamiId });
  }
}

export function usePageTracking() {
  const [location] = useLocation();

  useEffect(() => {
    if (location.startsWith("/admin")) return;
    initProviders();
    send("view", location, document.referrer || undefined);
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", "page_view", { page_path: location, page_location: window.location.href });
    // GTM: SPA route change → dataLayer event; trigger your GA4 tag on "page_view".
    const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    if (import.meta.env.VITE_GTM_ID?.trim()) dl?.push({ event: "page_view", page_path: location, page_location: window.location.href });
  }, [location]);

  useEffect(() => {
    if (location.startsWith("/admin")) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") send("ping", location);
    }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [location]);
}
