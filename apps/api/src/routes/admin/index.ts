import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  books,
  storeCourses,
  events,
  academyCourses,
  courseRegistrations,
  adminUsers,
  adminUserEvents,
  orders,
} from "@workspace/db";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import multer from "multer";
import { randomUUID } from "crypto";
import {
  checkAdminStatus,
  requireAdmin,
  getBootstrapAdminEmails,
  getClerkUserEmails,
  type AdminAuthRequest,
} from "../../middlewares/adminAuth";
import { ObjectStorageService, objectStorageClient } from "../../lib/objectStorage";

const router = Router();
const objectStorageService = new ObjectStorageService();
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, and WebP images are allowed"));
  },
});

router.post(
  "/admin/upload-image",
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File too large (max 10 MB)" });
        return res.status(400).json({ error: err.message });
      }
      if (err) return res.status(400).json({ error: (err as Error).message });
      return next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image file provided" });
      const folderRaw = (req.query.folder as string | undefined) || "uploads";
      const folder = folderRaw.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "uploads";
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/${folder}/${objectId}`;
      const pathParts = fullPath.replace(/^\//, "").split("/");
      const bucketName = pathParts[0];
      const objectName = pathParts.slice(1).join("/");
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: { cacheControl: "public, max-age=31536000" },
      });
      const url = `/api/storage/objects/${folder}/${objectId}`;
      return res.json({ url });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to upload image" });
    }
  }
);

router.get("/admin/me", async (req, res) => {
  try {
    const status = await checkAdminStatus(req);
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      [{ c: booksCount }],
      [{ c: storeCoursesCount }],
      [{ c: academyCoursesCount }],
      [{ c: upcomingEventsCount }],
      [{ c: totalEventsCount }],
      [{ c: monthRegistrationsCount }],
      [{ c: totalRegistrationsCount }],
      [{ c: pendingOrdersCount }],
      [{ c: totalOrdersCount }],
    ] = await Promise.all([
      db.select({ c: count() }).from(books),
      db.select({ c: count() }).from(storeCourses),
      db.select({ c: count() }).from(academyCourses),
      db.select({ c: count() }).from(events).where(eq(events.status, "upcoming")),
      db.select({ c: count() }).from(events),
      db
        .select({ c: count() })
        .from(courseRegistrations)
        .where(gte(courseRegistrations.registeredAt, monthStart)),
      db.select({ c: count() }).from(courseRegistrations),
      db.select({ c: count() }).from(orders).where(eq(orders.status, "pending")),
      db.select({ c: count() }).from(orders),
    ]);

    res.json({
      books: booksCount,
      storeCourses: storeCoursesCount,
      academyCourses: academyCoursesCount,
      upcomingEvents: upcomingEventsCount,
      totalEvents: totalEventsCount,
      registrationsThisMonth: monthRegistrationsCount,
      totalRegistrations: totalRegistrationsCount,
      pendingOrders: pendingOrdersCount,
      totalOrders: totalOrdersCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// Admin user management ------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/admin/admins", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(adminUsers)
      .orderBy(sql`${adminUsers.createdAt} DESC`);

    const dbEmails = new Set(rows.map((r) => r.email.toLowerCase()));
    const bootstrap = getBootstrapAdminEmails().filter((e) => !dbEmails.has(e));

    res.json({
      currentEmail: req.adminEmail ?? null,
      admins: rows.map((r) => ({
        id: r.id,
        email: r.email,
        addedByEmail: r.addedByEmail,
        note: r.note,
        createdAt: r.createdAt,
        source: "db" as const,
      })),
      bootstrapAdmins: bootstrap.map((email) => ({ email, source: "env" as const })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load admins" });
  }
});

router.get("/admin/admins/events", requireAdmin, async (_req: AdminAuthRequest, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(adminUserEvents)
      .orderBy(desc(adminUserEvents.createdAt))
      .limit(50);
    res.json({
      events: rows.map((r) => ({
        id: r.id,
        action: r.action,
        targetEmail: r.targetEmail,
        actorEmail: r.actorEmail,
        note: r.note,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load admin events" });
  }
});

router.post("/admin/admins", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const emailRaw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : null;
    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return res.status(400).json({ error: "بريد إلكتروني غير صالح" });
    }
    const existing = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(sql`lower(${adminUsers.email}) = ${emailRaw}`)
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "هذا البريد مضاف مسبقًا" });
    }
    let actorEmail = req.adminEmail ?? null;
    if (!actorEmail && req.adminClerkUserId) {
      const { primary, all } = await getClerkUserEmails(req.adminClerkUserId);
      actorEmail = primary ?? all[0] ?? null;
    }
    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(adminUsers)
        .values({
          email: emailRaw,
          addedByEmail: actorEmail,
          note: note || null,
        })
        .returning();
      await tx.insert(adminUserEvents).values({
        action: "added",
        targetEmail: inserted.email,
        actorEmail,
        note: note || null,
      });
      return inserted;
    });
    return res.status(201).json({
      id: row.id,
      email: row.email,
      addedByEmail: row.addedByEmail,
      note: row.note,
      createdAt: row.createdAt,
      source: "db",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل إضافة المشرف" });
  }
});

router.delete("/admin/admins/:id", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
    if (!row) {
      return res.status(404).json({ error: "المشرف غير موجود" });
    }
    const actorEmails = new Set<string>();
    if (req.adminEmail) actorEmails.add(req.adminEmail.toLowerCase());
    if (req.adminClerkUserId) {
      const { all } = await getClerkUserEmails(req.adminClerkUserId);
      for (const e of all) actorEmails.add(e);
    }
    if (actorEmails.has(row.email.toLowerCase())) {
      return res.status(400).json({ error: "لا يمكنك حذف نفسك" });
    }
    const actorEmail = req.adminEmail ?? (actorEmails.size > 0 ? Array.from(actorEmails)[0] : null);
    await db.transaction(async (tx) => {
      await tx.delete(adminUsers).where(eq(adminUsers.id, id));
      await tx.insert(adminUserEvents).values({
        action: "removed",
        targetEmail: row.email,
        actorEmail,
        note: row.note ?? null,
      });
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل حذف المشرف" });
  }
});


export default router;
