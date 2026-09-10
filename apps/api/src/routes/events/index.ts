import { Router } from "express";
import { db } from "@workspace/db";
import { events } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

const requireEventsAdmin = requireAdmin;

router.get("/events", async (_req, res) => {
  try {
    const result = await db.select().from(events).orderBy(desc(events.createdAt));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list events" });
  }
});

router.get("/events/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get event" });
  }
});

router.post("/events", requireEventsAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.titleAr || typeof body.titleAr !== "string" || !body.titleAr.trim()) {
      return res.status(400).json({ error: "Arabic title is required" });
    }
    if (!body.titleEn || typeof body.titleEn !== "string" || !body.titleEn.trim()) {
      return res.status(400).json({ error: "English title is required" });
    }
    if (!body.dateAr || !body.dateEn) {
      return res.status(400).json({ error: "Date is required in both languages" });
    }
    const [event] = await db.insert(events).values({
      titleAr: String(body.titleAr).trim(),
      titleEn: String(body.titleEn).trim(),
      dateAr: String(body.dateAr).trim(),
      dateEn: String(body.dateEn).trim(),
      timeAr: body.timeAr ? String(body.timeAr).trim() : null,
      timeEn: body.timeEn ? String(body.timeEn).trim() : null,
      locationAr: body.locationAr ? String(body.locationAr).trim() : null,
      locationEn: body.locationEn ? String(body.locationEn).trim() : null,
      categoryAr: body.categoryAr ? String(body.categoryAr).trim() : null,
      categoryEn: body.categoryEn ? String(body.categoryEn).trim() : null,
      descriptionAr: body.descriptionAr ? String(body.descriptionAr).trim() : null,
      descriptionEn: body.descriptionEn ? String(body.descriptionEn).trim() : null,
      imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null,
      status: (body.status as "upcoming" | "past") || "upcoming",
    }).returning();
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create event" });
  }
});

router.put("/events/:id", requireEventsAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const body = req.body as Record<string, unknown>;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.titleAr !== undefined) updates.titleAr = String(body.titleAr).trim();
    if (body.titleEn !== undefined) updates.titleEn = String(body.titleEn).trim();
    if (body.dateAr !== undefined) updates.dateAr = String(body.dateAr).trim();
    if (body.dateEn !== undefined) updates.dateEn = String(body.dateEn).trim();
    if (body.timeAr !== undefined) updates.timeAr = body.timeAr ? String(body.timeAr).trim() : null;
    if (body.timeEn !== undefined) updates.timeEn = body.timeEn ? String(body.timeEn).trim() : null;
    if (body.locationAr !== undefined) updates.locationAr = body.locationAr ? String(body.locationAr).trim() : null;
    if (body.locationEn !== undefined) updates.locationEn = body.locationEn ? String(body.locationEn).trim() : null;
    if (body.categoryAr !== undefined) updates.categoryAr = body.categoryAr ? String(body.categoryAr).trim() : null;
    if (body.categoryEn !== undefined) updates.categoryEn = body.categoryEn ? String(body.categoryEn).trim() : null;
    if (body.descriptionAr !== undefined) updates.descriptionAr = body.descriptionAr ? String(body.descriptionAr).trim() : null;
    if (body.descriptionEn !== undefined) updates.descriptionEn = body.descriptionEn ? String(body.descriptionEn).trim() : null;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    if (body.status !== undefined) updates.status = body.status;

    const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/events/:id", requireEventsAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(events).where(eq(events.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
