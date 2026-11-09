import { Router } from "express";
import { z } from "zod";
import { sendNewsletterConfirmEmail } from "../../lib/email/newsletterEmail";
import { PLATFORM_URL } from "../../lib/email/email";
import { EMAIL_RE, confirmByToken, subscribe, unsubscribeByToken } from "../../lib/newsletter/subscribers";

const router = Router();

// Small in-memory limiter: signup is unauthenticated and triggers an outbound email.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();
export function __resetNewsletterRateLimit() {
  hits.clear();
}
function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

const body = z.object({
  email: z.string().trim().max(320).regex(EMAIL_RE, "Valid email is required"),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
  locale: z.enum(["ar", "en"]).optional().default("ar"),
});

router.post("/newsletter/subscribe", async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
  if (limited(req.ip ?? "unknown")) return res.status(429).json({ error: "Too many attempts, try again later" });
  try {
    const out = await subscribe(parsed.data.email, parsed.data.locale);
    if (out.kind === "pending") {
      const r = await sendNewsletterConfirmEmail({ to: out.subscriber.email, token: out.subscriber.confirmToken });
      if (!r.ok) console.error("[newsletter] confirm email failed:", r.error);
    }
    // Same response whether or not the address was already subscribed (no enumeration).
    return res.status(202).json({ ok: true });
  } catch (err) {
    console.error("[newsletter] subscribe failed:", err);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

const tokenOf = (v: unknown) => (typeof v === "string" && /^[a-f0-9]{16,64}$/.test(v) ? v : null);

router.get("/newsletter/confirm", async (req, res) => {
  const t = tokenOf(req.query.token);
  const ok = t ? await confirmByToken(t).catch(() => false) : false;
  res.redirect(302, `${PLATFORM_URL}/newsletter/${ok ? "confirmed" : "invalid"}`);
});

router.get("/newsletter/unsubscribe", async (req, res) => {
  const t = tokenOf(req.query.token);
  const ok = t ? await unsubscribeByToken(t).catch(() => false) : false;
  res.redirect(302, `${PLATFORM_URL}/newsletter/${ok ? "unsubscribed" : "invalid"}`);
});

// RFC 8058 one-click: mail clients POST to the List-Unsubscribe URL.
router.post("/newsletter/unsubscribe", async (req, res) => {
  const t = tokenOf(req.query.token);
  const ok = t ? await unsubscribeByToken(t).catch(() => false) : false;
  return ok ? res.json({ ok: true }) : res.status(404).json({ error: "Invalid token" });
});

export default router;
