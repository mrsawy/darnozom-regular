import { Router } from "express";
import { db } from "@workspace/db";
import { storeApps } from "@workspace/db";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

const router = Router();

// These write endpoints sit above the Clerk auth gate in routes/index.ts, so
// this header is the only thing protecting them. It therefore fails CLOSED:
// with no BOOKS_ADMIN_SECRET configured the endpoints reject everything.
// (It previously fell back to a hardcoded literal, which left them writable by
// anyone who had seen this file whenever the env var was unset.)
const ADMIN_SECRET = process.env.BOOKS_ADMIN_SECRET ?? "";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_SECRET) {
    req.log?.warn("BOOKS_ADMIN_SECRET is not set — store app write endpoints are disabled.");
    return res.status(503).json({ error: "Admin endpoints are not configured" });
  }
  const token = req.headers["x-admin-secret"];
  if (typeof token !== "string" || token.length === 0) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const provided = Buffer.from(token);
  const expected = Buffer.from(ADMIN_SECRET);
  // Compare in constant time; length must match first since timingSafeEqual throws otherwise.
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

router.get("/store/apps", async (req, res) => {
  try {
    const { platform, pricing, search } = req.query as Record<string, string>;
    const conditions = [];
    if (platform && platform !== "all") conditions.push(eq(storeApps.platform, platform as typeof storeApps.$inferSelect["platform"]));
    if (pricing && pricing !== "all") conditions.push(eq(storeApps.pricing, pricing as typeof storeApps.$inferSelect["pricing"]));
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(storeApps.nameAr, term), ilike(storeApps.nameEn, term), ilike(storeApps.taglineAr, term))!);
    }
    const result = conditions.length > 0
      ? await db.select().from(storeApps).where(and(...conditions)).orderBy(desc(storeApps.isFeatured), desc(storeApps.createdAt))
      : await db.select().from(storeApps).orderBy(desc(storeApps.isFeatured), desc(storeApps.createdAt));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list apps" });
  }
});

router.get("/store/apps/:slug", async (req, res) => {
  try {
    const [app] = await db.select().from(storeApps).where(eq(storeApps.slug, String(req.params.slug)));
    if (!app) return res.status(404).json({ error: "Not found" });
    return res.json(app);
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/store/apps", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.slug || !body.nameAr) {
      return res.status(400).json({ error: "slug and nameAr are required" });
    }
    const [app] = await db.insert(storeApps).values({
      slug: String(body.slug),
      nameAr: String(body.nameAr),
      nameEn: body.nameEn ? String(body.nameEn) : null,
      taglineAr: body.taglineAr ? String(body.taglineAr) : null,
      taglineEn: body.taglineEn ? String(body.taglineEn) : null,
      descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : null,
      iconUrl: body.iconUrl ? String(body.iconUrl) : null,
      category: body.category ? String(body.category) : "productivity",
      platform: (body.platform as typeof storeApps.$inferInsert["platform"]) || "web",
      pricing: (body.pricing as typeof storeApps.$inferInsert["pricing"]) || "request",
      price: body.price ? String(body.price) : null,
      currency: body.currency ? String(body.currency) : "SAR",
      status: (body.status as typeof storeApps.$inferInsert["status"]) || "live",
      isFeatured: Boolean(body.isFeatured),
      isNewRelease: Boolean(body.isNewRelease),
      webUrl: body.webUrl ? String(body.webUrl) : null,
      iosUrl: body.iosUrl ? String(body.iosUrl) : null,
      androidUrl: body.androidUrl ? String(body.androidUrl) : null,
      detailsUrl: body.detailsUrl ? String(body.detailsUrl) : null,
    }).returning();
    return res.status(201).json(app);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create app" });
  }
});

router.put("/store/apps/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["slug","nameAr","nameEn","taglineAr","taglineEn","descriptionAr","descriptionEn","iconUrl","category","platform","pricing","price","currency","status","webUrl","iosUrl","androidUrl","detailsUrl"];
    for (const k of fields) if (body[k] !== undefined) updates[k] = body[k] === null || body[k] === "" ? null : body[k];
    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.isNewRelease !== undefined) updates.isNewRelease = Boolean(body.isNewRelease);
    const [app] = await db.update(storeApps).set(updates).where(eq(storeApps.id, id)).returning();
    if (!app) return res.status(404).json({ error: "Not found" });
    return res.json(app);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.delete("/store/apps/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(storeApps).where(eq(storeApps.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
