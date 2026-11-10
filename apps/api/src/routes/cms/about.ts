import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, siteSettings } from "@workspace/db";
import { requireAdmin, type AdminAuthRequest } from "../../middlewares/adminAuth";

// The About page copy is one JSON document in site_settings (no migration).
// Only overrides are stored; the client merges them over its built-in defaults.
const KEY = "about_page";
const router = Router();

const str = (max: number) => z.string().max(max);
const aboutInput = z
  .object({
    imageUrl: str(500),
    titleAr: str(200), titleEn: str(200),
    introAr: str(5000), introEn: str(5000),
    visionAr: str(3000), visionEn: str(3000),
    missionAr: str(3000), missionEn: str(3000),
    approachIntroAr: str(3000), approachIntroEn: str(3000),
    steps: z.array(z.object({ ar: str(200), en: str(200), descAr: str(2000), descEn: str(2000) })).max(12),
    values: z.array(z.object({ ar: str(200), en: str(200) })).max(24),
  })
  .partial()
  .strict();

async function load(): Promise<Record<string, unknown>> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY));
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

router.get("/cms/about", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json(await load());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load about content" });
  }
});

router.get("/admin/cms/about", requireAdmin, async (_req, res) => {
  try {
    return res.json(await load());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load about content" });
  }
});

router.put("/admin/cms/about", requireAdmin, async (req: AdminAuthRequest, res) => {
  const parsed = aboutInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بيانات غير صالحة", issues: parsed.error.issues });
  try {
    const value = JSON.stringify(parsed.data);
    const updatedBy = req.adminEmail ?? null;
    await db
      .insert(siteSettings)
      .values({ key: KEY, value, valueType: "json", updatedBy })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, valueType: "json", updatedAt: new Date(), updatedBy } });
    return res.json(parsed.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save about content" });
  }
});

export default router;
