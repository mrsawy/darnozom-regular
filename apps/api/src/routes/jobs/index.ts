import { Router } from "express";
import { db } from "@workspace/db";
import { jobOpenings } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

const STATUS_VALUES = new Set(["active", "archived"]);
const TYPE_VALUES = new Set(["full-time", "part-time", "contract", "internship"]);

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .slice(0, 50);
}

type JobInput = {
  titleAr: string; titleEn: string;
  deptAr: string; deptEn: string;
  locationAr: string; locationEn: string;
  type: string; typeAr: string; typeEn: string;
  posted: string; remote: boolean;
  descAr: string; descEn: string;
  skillsAr: string[]; skillsEn: string[];
  category: string;
  status: "active" | "archived";
};

function parseBody(body: Record<string, unknown>, partial: boolean): { data?: Partial<JobInput>; error?: string } {
  const out: Partial<JobInput> = {};
  const requireStr = (key: keyof JobInput, max: number) => {
    const v = body[key];
    if (v === undefined) {
      if (partial) return null;
      return `${String(key)} is required`;
    }
    if (typeof v !== "string" || !v.trim()) return `${String(key)} is required`;
    if (v.length > max) return `${String(key)} too long`;
    (out as Record<string, unknown>)[key] = v.trim();
    return null;
  };
  const optionalStr = (key: keyof JobInput, max: number) => {
    const v = body[key];
    if (v === undefined) return null;
    if (v === null) { (out as Record<string, unknown>)[key] = ""; return null; }
    if (typeof v !== "string") return `${String(key)} must be a string`;
    if (v.length > max) return `${String(key)} too long`;
    (out as Record<string, unknown>)[key] = v;
    return null;
  };

  for (const [k, max] of [
    ["titleAr", 500], ["titleEn", 500],
    ["deptAr", 200], ["deptEn", 200],
    ["locationAr", 300], ["locationEn", 300],
    ["typeAr", 100], ["typeEn", 100],
    ["category", 100],
  ] as const) {
    const e = requireStr(k as keyof JobInput, max);
    if (e) return { error: e };
  }
  for (const [k, max] of [["descAr", 5000], ["descEn", 5000]] as const) {
    const e = optionalStr(k as keyof JobInput, max);
    if (e) return { error: e };
  }

  if (body.type !== undefined) {
    if (typeof body.type !== "string" || !TYPE_VALUES.has(body.type)) {
      return { error: "Invalid type" };
    }
    out.type = body.type;
  } else if (!partial) {
    return { error: "type is required" };
  }

  if (body.posted !== undefined) {
    if (typeof body.posted !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.posted)) {
      return { error: "posted must be YYYY-MM-DD" };
    }
    out.posted = body.posted;
  } else if (!partial) {
    return { error: "posted is required" };
  }

  if (body.remote !== undefined) {
    out.remote = Boolean(body.remote);
  } else if (!partial) {
    out.remote = false;
  }

  if (body.skillsAr !== undefined) out.skillsAr = toStringArray(body.skillsAr);
  else if (!partial) out.skillsAr = [];
  if (body.skillsEn !== undefined) out.skillsEn = toStringArray(body.skillsEn);
  else if (!partial) out.skillsEn = [];

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !STATUS_VALUES.has(body.status)) {
      return { error: "Invalid status" };
    }
    out.status = body.status as "active" | "archived";
  } else if (!partial) {
    out.status = "active";
  }

  return { data: out };
}

router.get("/jobs", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(jobOpenings)
      .where(eq(jobOpenings.status, "active"))
      .orderBy(desc(jobOpenings.posted), desc(jobOpenings.id));
    return res.json(rows);
  } catch (err) {
    console.error("[jobs] list error", err);
    return res.status(500).json({ error: "Failed to list jobs" });
  }
});

router.get("/admin/jobs", requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "");
    const where = STATUS_VALUES.has(status)
      ? eq(jobOpenings.status, status as "active" | "archived")
      : undefined;
    const rows = await db
      .select()
      .from(jobOpenings)
      .where(where)
      .orderBy(desc(jobOpenings.posted), desc(jobOpenings.id));
    return res.json(rows);
  } catch (err) {
    console.error("[jobs] admin list error", err);
    return res.status(500).json({ error: "Failed to list jobs" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select().from(jobOpenings).where(eq(jobOpenings.id, id)).limit(1);
    if (!row || row.status !== "active") return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[jobs] get error", err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/jobs/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    const [row] = await db.select().from(jobOpenings).where(eq(jobOpenings.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[jobs] admin get error", err);
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/jobs", requireAdmin, async (req, res) => {
  try {
    const { data, error } = parseBody(req.body || {}, false);
    if (error || !data) return res.status(400).json({ error: error || "Invalid input" });
    const [row] = await db.insert(jobOpenings).values(data as JobInput).returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error("[jobs] create error", err);
    return res.status(500).json({ error: "Failed to create job" });
  }
});

router.put("/jobs/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    const { data, error } = parseBody(req.body || {}, true);
    if (error || !data) return res.status(400).json({ error: error || "Invalid input" });
    const [row] = await db
      .update(jobOpenings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobOpenings.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[jobs] update error", err);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

router.delete("/jobs/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
    await db.delete(jobOpenings).where(eq(jobOpenings.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error("[jobs] delete error", err);
    return res.status(500).json({ error: "Failed to delete job" });
  }
});

export default router;
