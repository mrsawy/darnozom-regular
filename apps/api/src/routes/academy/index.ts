import { Router } from "express";
import { db } from "@workspace/db";
import { academyCourses, courseRegistrations, academyAnnouncements } from "@workspace/db";
import { eq, desc, sql, and, or } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import { rateLimit } from "../../middlewares/rateLimit";
import applicationsRouter from "./applications";

const router = Router();
router.use(applicationsRouter);

const requireAcademyAdmin = requireAdmin;

// Public course-registration form: throttle rapid repeated/bot submissions per
// client without blocking legitimate students (who register a handful of times
// at most).
const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: "academy-register:",
  message: "Too many registration attempts. Please wait a few minutes and try again.",
});

router.get("/academy/courses", async (req, res) => {
  try {
    const courses = await db
      .select({
        id: academyCourses.id,
        titleAr: academyCourses.titleAr,
        titleEn: academyCourses.titleEn,
        descriptionAr: academyCourses.descriptionAr,
        descriptionEn: academyCourses.descriptionEn,
        track: academyCourses.track,
        level: academyCourses.level,
        duration: academyCourses.duration,
        seats: academyCourses.seats,
        price: academyCourses.price,
        startDate: academyCourses.startDate,
        createdAt: academyCourses.createdAt,
        registrationCount: sql<number>`CAST(COUNT(${courseRegistrations.id}) AS INT)`,
      })
      .from(academyCourses)
      .leftJoin(courseRegistrations, eq(courseRegistrations.courseId, academyCourses.id))
      .groupBy(academyCourses.id)
      .orderBy(desc(academyCourses.createdAt));
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list courses" });
  }
});

router.post("/academy/courses", requireAcademyAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.titleAr || typeof body.titleAr !== "string" || !body.titleAr.trim()) {
      return res.status(400).json({ error: "Arabic title is required" });
    }
    if (!body.titleEn || typeof body.titleEn !== "string" || !body.titleEn.trim()) {
      return res.status(400).json({ error: "English title is required" });
    }
    const [course] = await db.insert(academyCourses).values({
      titleAr: String(body.titleAr).trim(),
      titleEn: String(body.titleEn).trim(),
      descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : null,
      track: body.track ? String(body.track) : null,
      level: body.level ? String(body.level) : null,
      duration: body.duration ? String(body.duration) : null,
      seats: body.seats ? parseInt(String(body.seats)) : 0,
      price: body.price ? String(body.price) : null,
      startDate: body.startDate ? String(body.startDate) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
    }).returning();
    return res.status(201).json(course);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create course" });
  }
});

router.put("/academy/courses/:id", requireAcademyAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db.select().from(academyCourses).where(eq(academyCourses.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }
    const body = req.body as Record<string, unknown>;
    if (!body.titleAr || typeof body.titleAr !== "string" || !body.titleAr.trim()) {
      return res.status(400).json({ error: "Arabic title is required" });
    }
    if (!body.titleEn || typeof body.titleEn !== "string" || !body.titleEn.trim()) {
      return res.status(400).json({ error: "English title is required" });
    }
    const [updated] = await db.update(academyCourses)
      .set({
        titleAr: String(body.titleAr).trim(),
        titleEn: String(body.titleEn).trim(),
        descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
        descriptionEn: body.descriptionEn ? String(body.descriptionEn) : null,
        track: body.track ? String(body.track) : null,
        level: body.level ? String(body.level) : null,
        duration: body.duration ? String(body.duration) : null,
        seats: body.seats ? parseInt(String(body.seats)) : 0,
        price: body.price ? String(body.price) : null,
        startDate: body.startDate ? String(body.startDate) : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      })
      .where(eq(academyCourses.id, id))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update course" });
  }
});

router.delete("/academy/courses/:id", requireAcademyAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db.select().from(academyCourses).where(eq(academyCourses.id, id));
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }
    await db.delete(courseRegistrations).where(eq(courseRegistrations.courseId, id));
    await db.delete(academyCourses).where(eq(academyCourses.id, id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete course" });
  }
});

router.get("/academy/courses/:id/registrations", requireAcademyAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [course] = await db.select().from(academyCourses).where(eq(academyCourses.id, id));
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    const registrations = await db
      .select()
      .from(courseRegistrations)
      .where(eq(courseRegistrations.courseId, id))
      .orderBy(desc(courseRegistrations.registeredAt));
    return res.json(registrations);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get registrations" });
  }
});

router.post("/academy/courses/:id/register", registerRateLimit, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [course] = await db
      .select({
        id: academyCourses.id,
        seats: academyCourses.seats,
        registrationCount: sql<number>`CAST(COUNT(${courseRegistrations.id}) AS INT)`,
      })
      .from(academyCourses)
      .leftJoin(courseRegistrations, eq(courseRegistrations.courseId, academyCourses.id))
      .where(eq(academyCourses.id, id))
      .groupBy(academyCourses.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (course.seats > 0 && course.registrationCount >= course.seats) {
      return res.status(400).json({ error: "Course is full" });
    }

    const body = req.body as Record<string, unknown>;
    if (!body.fullName || typeof body.fullName !== "string" || !body.fullName.trim()) {
      return res.status(400).json({ error: "Full name is required" });
    }
    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!body.phone || typeof body.phone !== "string" || !body.phone.trim()) {
      return res.status(400).json({ error: "Phone is required" });
    }

    const email = String(body.email).trim();
    const phone = String(body.phone).trim();

    // Duplicate-submission guard: refuse a second registration for the same
    // course from the same email or phone. Blocks accidental double-submits and
    // simple repeat spam without affecting distinct legitimate students.
    const [duplicate] = await db
      .select({ id: courseRegistrations.id })
      .from(courseRegistrations)
      .where(
        and(
          eq(courseRegistrations.courseId, id),
          or(
            sql`lower(${courseRegistrations.email}) = lower(${email})`,
            eq(courseRegistrations.phone, phone),
          ),
        ),
      )
      .limit(1);
    if (duplicate) {
      return res.status(409).json({
        error: "You are already registered for this course with this email or phone.",
      });
    }

    const [registration] = await db.insert(courseRegistrations).values({
      courseId: id,
      fullName: String(body.fullName).trim(),
      email,
      phone,
      organization: body.organization ? String(body.organization).trim() : null,
    }).returning();
    return res.status(201).json(registration);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to register for course" });
  }
});

router.get("/academy/announcements", async (req, res) => {
  try {
    const announcements = await db
      .select()
      .from(academyAnnouncements)
      .orderBy(desc(academyAnnouncements.createdAt));
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list announcements" });
  }
});

router.post("/academy/announcements", requireAcademyAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.titleAr || typeof body.titleAr !== "string" || !body.titleAr.trim()) {
      return res.status(400).json({ error: "Arabic title is required" });
    }
    if (!body.titleEn || typeof body.titleEn !== "string" || !body.titleEn.trim()) {
      return res.status(400).json({ error: "English title is required" });
    }
    const [announcement] = await db.insert(academyAnnouncements).values({
      titleAr: String(body.titleAr).trim(),
      titleEn: String(body.titleEn).trim(),
      descriptionAr: body.descriptionAr ? String(body.descriptionAr) : null,
      descriptionEn: body.descriptionEn ? String(body.descriptionEn) : null,
      price: body.price ? String(body.price) : null,
      startDate: body.startDate ? String(body.startDate) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      registrationUrl: body.registrationUrl ? String(body.registrationUrl) : null,
    }).returning();
    return res.status(201).json(announcement);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.delete("/academy/announcements/:id", requireAcademyAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [deleted] = await db
      .delete(academyAnnouncements)
      .where(eq(academyAnnouncements.id, id))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
