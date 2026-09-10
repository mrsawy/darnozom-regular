import { Router } from "express";
import { db } from "@workspace/db";
import { storeCourses } from "@workspace/db";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

router.get("/store/courses", async (req, res) => {
  try {
    const { delivery, level, language, search } = req.query as Record<string, string>;
    const conditions = [];
    if (delivery && delivery !== "all") conditions.push(eq(storeCourses.delivery, delivery as typeof storeCourses.$inferSelect["delivery"]));
    if (level && level !== "all") conditions.push(eq(storeCourses.level, level as typeof storeCourses.$inferSelect["level"]));
    if (language && language !== "all") conditions.push(eq(storeCourses.language, language as typeof storeCourses.$inferSelect["language"]));
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(storeCourses.titleAr, term), ilike(storeCourses.titleEn, term), ilike(storeCourses.instructor, term))!);
    }
    const result = conditions.length > 0
      ? await db.select().from(storeCourses).where(and(...conditions)).orderBy(desc(storeCourses.isFeatured), desc(storeCourses.createdAt))
      : await db.select().from(storeCourses).orderBy(desc(storeCourses.isFeatured), desc(storeCourses.createdAt));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list courses" });
  }
});

router.get("/store/courses/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [course] = await db.select().from(storeCourses).where(eq(storeCourses.id, id));
    if (!course) return res.status(404).json({ error: "Not found" });
    return res.json(course);
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/store/courses", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.titleAr || typeof body.titleAr !== "string" || !body.titleAr.trim()) {
      return res.status(400).json({ error: "titleAr is required" });
    }
    const [course] = await db.insert(storeCourses).values({
      titleAr: String(body.titleAr),
      titleEn: body.titleEn ? String(body.titleEn) : null,
      descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : null,
      instructor: body.instructor ? String(body.instructor) : null,
      thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null,
      category: body.category ? String(body.category) : "management",
      delivery: (body.delivery as typeof storeCourses.$inferInsert["delivery"]) || "online_self",
      level: (body.level as typeof storeCourses.$inferInsert["level"]) || "all_levels",
      language: (body.language as typeof storeCourses.$inferInsert["language"]) || "ar",
      durationHours: body.durationHours ? Number(body.durationHours) : null,
      modules: body.modules ? Number(body.modules) : null,
      certification: Boolean(body.certification),
      upcomingDate: body.upcomingDate ? String(body.upcomingDate) : null,
      location: body.location ? String(body.location) : null,
      price: body.price ? String(body.price) : null,
      currency: body.currency ? String(body.currency) : "SAR",
      status: (body.status as typeof storeCourses.$inferInsert["status"]) || "available",
      isFeatured: Boolean(body.isFeatured),
      isNewRelease: Boolean(body.isNewRelease),
      syllabusUrl: body.syllabusUrl ? String(body.syllabusUrl) : null,
    }).returning();
    return res.status(201).json(course);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create course" });
  }
});

router.put("/store/courses/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const fields = ["titleAr","titleEn","descriptionAr","descriptionEn","instructor","thumbnailUrl","category","delivery","level","language","upcomingDate","location","price","currency","status","syllabusUrl"];
    for (const k of fields) if (body[k] !== undefined) updates[k] = body[k] === null || body[k] === "" ? null : body[k];
    if (body.durationHours !== undefined) updates.durationHours = body.durationHours ? Number(body.durationHours) : null;
    if (body.modules !== undefined) updates.modules = body.modules ? Number(body.modules) : null;
    if (body.certification !== undefined) updates.certification = Boolean(body.certification);
    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.isNewRelease !== undefined) updates.isNewRelease = Boolean(body.isNewRelease);
    const [course] = await db.update(storeCourses).set(updates).where(eq(storeCourses.id, id)).returning();
    if (!course) return res.status(404).json({ error: "Not found" });
    return res.json(course);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.delete("/store/courses/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(storeCourses).where(eq(storeCourses.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
