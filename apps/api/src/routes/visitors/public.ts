import { Router } from "express";
import { z } from "zod";
import { db, pageViews } from "@workspace/db";
import { rateLimit } from "../../middlewares/rateLimit";
import { parseUserAgent } from "../../lib/visitors/ua";
import { touchSession } from "../../lib/visitors/live";

const router = Router();

const body = z.object({
  type: z.enum(["view", "ping"]),
  vid: z.string().min(8).max(64),
  sid: z.string().min(8).max(64),
  path: z.string().min(1).max(512),
  ref: z.string().max(1024).optional(),
});

function referrerHost(ref: string | undefined, selfHost: string | undefined): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h && h !== (selfHost ?? "").replace(/^www\./, "") ? h.slice(0, 255) : null;
  } catch {
    return null;
  }
}

/**
 * Public, cookieless collector. Stores no IP. Country comes from a CDN header
 * (Cloudflare) when present. Always answers 204 so tracking can never break
 * the page.
 */
router.post(
  "/visitors/collect",
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: "visitors:" }),
  async (req, res) => {
    res.status(204).end();
    try {
      const parsed = body.safeParse(req.body);
      if (!parsed.success) return;
      const { type, vid, sid, path, ref } = parsed.data;
      if (!path.startsWith("/") || path.startsWith("/admin")) return;

      const ua = parseUserAgent(req.headers["user-agent"]);
      if (ua.isBot) return;
      const cc = String(req.headers["cf-ipcountry"] ?? "").toUpperCase();
      const country = /^[A-Z]{2}$/.test(cc) && cc !== "XX" ? cc : null;

      touchSession({ sessionId: sid, path, device: ua.device, country });
      if (type !== "view") return;

      await db.insert(pageViews).values({
        visitorId: vid,
        sessionId: sid,
        path: path.split("?")[0]!.slice(0, 512),
        referrerHost: referrerHost(ref, req.headers.host?.split(":")[0]),
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        country,
        isBot: false,
      });
    } catch {
      /* swallow — analytics must never surface errors */
    }
  },
);

export default router;
