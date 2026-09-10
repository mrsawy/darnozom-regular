import { Router } from "express";
import { db } from "@workspace/db";
import { academyApplications } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import { sendAcademyApplicationNotification, PLATFORM_URL } from "../../lib/email";

const router = Router();

const VALID_TYPES = new Set(["program", "level", "diploma", "course", "exec", "path", "general"]);

router.post("/academy/applications", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;

    const applyType = String(body.applyType || "general").trim();
    if (!VALID_TYPES.has(applyType)) {
      return res.status(400).json({ error: "Invalid applyType" });
    }

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!fullName) return res.status(400).json({ error: "Full name is required" });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const truncate = (val: unknown, max: number): string | null => {
      if (typeof val !== "string") return null;
      const v = val.trim();
      return v ? v.slice(0, max) : null;
    };

    const [application] = await db.insert(academyApplications).values({
      applyType,
      programId: truncate(body.programId, 100),
      levelCode: truncate(body.levelCode, 50),
      diplomaId: truncate(body.diplomaId, 100),
      courseId: truncate(body.courseId, 100),
      execProgramId: truncate(body.execProgramId, 100),
      contextLabelAr: truncate(body.contextLabelAr, 500),
      contextLabelEn: truncate(body.contextLabelEn, 500),
      fullName: fullName.slice(0, 255),
      email: email.slice(0, 255),
      phone: phone.slice(0, 50),
      organization: truncate(body.organization, 255),
      country: truncate(body.country, 100),
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    }).returning();

    const adminUrl = `${PLATFORM_URL}/admin/registrations`;

    sendAcademyApplicationNotification({
      applicationId: application.id,
      applyType: application.applyType,
      contextLabelAr: application.contextLabelAr,
      contextLabelEn: application.contextLabelEn,
      fullName: application.fullName,
      email: application.email,
      phone: application.phone,
      organization: application.organization,
      country: application.country,
      notes: application.notes,
      adminUrl,
    }).catch(err => {
      console.error("[academy-applications] email send failed:", err);
    });

    return res.status(201).json({ id: application.id, ok: true });
  } catch (err) {
    console.error("[academy-applications] insert failed:", err);
    return res.status(500).json({ error: "Failed to submit application" });
  }
});

router.get("/academy/applications", requireAdmin, async (req, res) => {
  try {
    const applications = await db
      .select()
      .from(academyApplications)
      .orderBy(desc(academyApplications.createdAt));
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list applications" });
  }
});

router.patch("/academy/applications/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const status = String((req.body as Record<string, unknown>)?.status || "").trim();
    if (!status) return res.status(400).json({ error: "status required" });
    const [updated] = await db
      .update(academyApplications)
      .set({ status: status.slice(0, 30) })
      .where(eq(academyApplications.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Application not found" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
