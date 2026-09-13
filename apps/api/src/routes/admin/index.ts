import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  books,
  storeCourses,
  events,
  academyCourses,
  courseRegistrations,
  adminUserEvents,
  orders,
  users,
} from "@workspace/db";
import { count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import multer from "multer";
import { randomUUID } from "crypto";
import {
  checkAdminStatus,
  requireAdmin,
  getBootstrapAdminEmails,
  type AdminAuthRequest,
} from "../../middlewares/adminAuth";
import { savePrivateObject } from "../../lib/objectStore";

const router = Router();
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
      const objectId = randomUUID();
      await savePrivateObject(`${folder}/${objectId}`, req.file.buffer, req.file.mimetype, {
        cacheControl: "public, max-age=31536000",
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

const ADMIN_ROLES = ["admin", "super_admin"] as const;

/**
 * Admins are users carrying an admin role — there is no separate allowlist
 * table any more, so "admin" and "has an account" can no longer disagree.
 *
 * `bootstrapAdmins` still reports ADMIN_EMAILS entries that have not signed up
 * yet: those addresses get the role automatically on first sign-up, and the UI
 * shows them as pending so an operator can tell "invited" from "active".
 */
router.get("/admin/admins", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.role, [...ADMIN_ROLES]))
      .orderBy(desc(users.createdAt));

    // The audit log is the only record of who granted whom, so it is joined in
    // here rather than denormalised onto the user row.
    const grants = await db
      .select({
        targetEmail: adminUserEvents.targetEmail,
        actorEmail: adminUserEvents.actorEmail,
        note: adminUserEvents.note,
      })
      .from(adminUserEvents)
      .where(eq(adminUserEvents.action, "added"))
      .orderBy(desc(adminUserEvents.createdAt));

    const grantByEmail = new Map<string, { actorEmail: string | null; note: string | null }>();
    for (const g of grants) {
      const key = g.targetEmail.toLowerCase();
      if (!grantByEmail.has(key)) {
        grantByEmail.set(key, { actorEmail: g.actorEmail, note: g.note });
      }
    }

    const existing = new Set(rows.map((r) => r.email.toLowerCase()));
    const bootstrap = getBootstrapAdminEmails().filter((e) => !existing.has(e));

    res.json({
      currentEmail: req.adminEmail ?? null,
      admins: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        addedByEmail: grantByEmail.get(r.email.toLowerCase())?.actorEmail ?? null,
        note: grantByEmail.get(r.email.toLowerCase())?.note ?? null,
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

/**
 * Grants the admin role to an existing account.
 *
 * Behaviour change from the Clerk-era allowlist: the person must already have
 * an account. Previously an arbitrary email could be added to `admin_users` and
 * would take effect whenever that person eventually signed up. With the role
 * living on the user row there is nothing to attach a grant to until the row
 * exists, so this answers 404 with an actionable message instead of silently
 * recording a grant that may never apply. ADMIN_EMAILS still covers the
 * bootstrap case of seeding admins before anyone has signed up.
 */
router.post("/admin/admins", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const emailRaw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : null;
    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return res.status(400).json({ error: "بريد إلكتروني غير صالح" });
    }

    const [target] = await db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(sql`lower(${users.email}) = ${emailRaw}`)
      .limit(1);

    if (!target) {
      return res.status(404).json({
        error: "لا يوجد حساب بهذا البريد. اطلب من الشخص إنشاء حساب أولاً ثم أضفه كمشرف.",
      });
    }
    if (target.role === "admin" || target.role === "super_admin") {
      return res.status(409).json({ error: "هذا المستخدم مشرف بالفعل" });
    }

    const actorEmail = req.adminEmail ?? null;

    const row = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.id, target.id))
        .returning();
      await tx.insert(adminUserEvents).values({
        action: "added",
        targetEmail: updated.email,
        actorEmail,
        note: note || null,
      });
      return updated;
    });

    return res.status(201).json({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      addedByEmail: actorEmail,
      note: note || null,
      createdAt: row.createdAt,
      source: "db",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل إضافة المشرف" });
  }
});

/**
 * Revokes admin. The user is demoted to `client` rather than deleted — the
 * account, its orders and its bookings all survive. `client` is deliberate:
 * the pre-promotion role is not recorded anywhere, so least privilege is the
 * only safe assumption.
 */
router.delete("/admin/admins/:id", requireAdmin, async (req: AdminAuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "معرّف غير صالح" });
    }
    const [row] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!row || (row.role !== "admin" && row.role !== "super_admin")) {
      return res.status(404).json({ error: "المشرف غير موجود" });
    }
    if (req.adminEmail && req.adminEmail.toLowerCase() === row.email.toLowerCase()) {
      return res.status(400).json({ error: "لا يمكنك حذف نفسك" });
    }
    // Only a super-admin may demote a super-admin; otherwise any admin could
    // strip the owner's access.
    if (row.role === "super_admin") {
      const [actor] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, req.adminUserId ?? ""))
        .limit(1);
      if (actor?.role !== "super_admin") {
        return res.status(403).json({ error: "لا يمكن إزالة مشرف عام إلا بواسطة مشرف عام" });
      }
    }

    const actorEmail = req.adminEmail ?? null;
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: "client", updatedAt: new Date() })
        .where(eq(users.id, id));
      await tx.insert(adminUserEvents).values({
        action: "removed",
        targetEmail: row.email,
        actorEmail,
        note: null,
      });
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "فشل حذف المشرف" });
  }
});


export default router;
