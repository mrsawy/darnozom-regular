import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { jobApplications } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import {
  savePrivateObject,
  openPrivateObjectStream,
  privateObjectExists,
  readPrivateObjectMeta,
} from "../../lib/objectStore";
import { sendJobApplicationNotification, PLATFORM_URL } from "../../lib/email/email";

const router = Router();

const ALLOWED_RESUME_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_RESUME_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_RESUME_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
  },
});

const PUBLIC_BASE_URL = PLATFORM_URL;

const STATUS_VALUES = new Set(["new", "reviewing", "accepted", "rejected"]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "resume";
}

router.post(
  "/job-applications",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("resume")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(400).json({ error: "حجم الملف يتجاوز 10 ميجابايت / File too large (max 10 MB)" });
        return res.status(400).json({ error: err.message });
      }
      if (err) return res.status(400).json({ error: (err as Error).message });
      return next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, string>;
      const jobId = Number(body.jobId);
      const jobTitleAr = (body.jobTitleAr || "").trim();
      const jobTitleEn = (body.jobTitleEn || "").trim();
      const fullName = (body.fullName || "").trim();
      const email = (body.email || "").trim();
      const phone = (body.phone || "").trim();
      const yearsExperienceRaw = (body.yearsExperience || "").trim();
      const yearsExperience = yearsExperienceRaw === "" ? null : Number(yearsExperienceRaw);
      const coverLetter = (body.coverLetter || "").trim().slice(0, 5000) || null;

      if (!Number.isFinite(jobId) || jobId <= 0) {
        return res.status(400).json({ error: "Invalid jobId" });
      }
      if (!jobTitleAr || !jobTitleEn) {
        return res.status(400).json({ error: "Job title required" });
      }
      if (!fullName) return res.status(400).json({ error: "الاسم مطلوب / Name is required" });
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: "بريد إلكتروني غير صالح / Invalid email" });
      if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب / Phone is required" });
      if (yearsExperience !== null && (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 80))
        return res.status(400).json({ error: "سنوات الخبرة غير صالحة / Invalid years of experience" });
      if (!req.file)
        return res.status(400).json({ error: "السيرة الذاتية مطلوبة / Resume file is required" });
      if (!ALLOWED_RESUME_MIME.has(req.file.mimetype))
        return res.status(400).json({ error: "صيغة الملف غير مدعومة (PDF / DOC / DOCX) / Unsupported file format" });

      const objectId = randomUUID();
      const safeName = sanitizeFileName(req.file.originalname);
      const resumePath = `job-applications/${objectId}-${safeName}`;
      await savePrivateObject(resumePath, req.file.buffer, req.file.mimetype, {
        cacheControl: "private, max-age=0, no-store",
      });

      const [inserted] = await db
        .insert(jobApplications)
        .values({
          jobId,
          jobTitleAr,
          jobTitleEn,
          fullName,
          email,
          phone,
          yearsExperience,
          coverLetter,
          resumePath,
          resumeFileName: req.file.originalname.slice(0, 500) || safeName,
          resumeMimeType: req.file.mimetype,
          resumeSize: req.file.size,
        })
        .returning();

      const resumeUrl = `${PUBLIC_BASE_URL}/api/job-applications/${inserted.id}/resume`;
      const adminUrl = `${PUBLIC_BASE_URL}/admin/job-applications?id=${inserted.id}`;

      sendJobApplicationNotification({
        applicationId: inserted.id,
        jobTitleAr,
        jobTitleEn,
        fullName,
        email,
        phone,
        yearsExperience,
        coverLetter,
        resumeUrl,
        resumeFileName: inserted.resumeFileName,
        adminUrl,
      }).catch((err) => console.error("[job-applications] Email notification failed:", err));

      return res.status(201).json({ ok: true, id: inserted.id });
    } catch (err) {
      console.error("[job-applications] submit error:", err);
      return res.status(500).json({ error: "Failed to submit application" });
    }
  },
);

router.get("/job-applications", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(jobApplications)
      .orderBy(desc(jobApplications.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load applications" });
  }
});

router.get("/job-applications/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select().from(jobApplications).where(eq(jobApplications.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.put("/job-applications/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    const status = String((req.body as Record<string, string>)?.status || "");
    if (!STATUS_VALUES.has(status)) return res.status(400).json({ error: "Invalid status" });
    const [updated] = await db
      .update(jobApplications)
      .set({ status: status as "new" | "reviewing" | "accepted" | "rejected", updatedAt: new Date() })
      .where(eq(jobApplications.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/job-applications/:id/resume", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select().from(jobApplications).where(eq(jobApplications.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });

    if (!(await privateObjectExists(row.resumePath))) {
      return res.status(404).json({ error: "Resume file not found" });
    }

    const safeName = sanitizeFileName(row.resumeFileName);
    const meta = await readPrivateObjectMeta(row.resumePath);
    res.setHeader("Content-Type", row.resumeMimeType || meta?.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=0, no-store");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    if (row.resumeSize || meta?.size) {
      res.setHeader("Content-Length", String(row.resumeSize || meta?.size));
    }

    const nodeStream = openPrivateObjectStream(row.resumePath);
    nodeStream.on("error", (e) => {
      console.error("[job-applications] stream error:", e);
      if (!res.headersSent) res.status(500).json({ error: "Failed to read file" });
      else res.end();
    });
    nodeStream.pipe(res);
    return;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to download resume" });
  }
});

export default router;
