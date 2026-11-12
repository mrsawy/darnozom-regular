import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, siteSettings } from "@workspace/db";
import { requireAdmin, type AdminAuthRequest } from "../../middlewares/adminAuth";

// Which layout variant the home hero and the About page use. One JSON document in
// site_settings (no migration). Unknown or missing values fall back to "classic" on the client.
const KEY = "page_designs";
const router = Router();

const designInput = z
  .object({
    homeHero: z.enum(["classic", "split", "centered", "magazine", "thumbs", "sidebar", "jusoor", "masarat", "rosewell", "mokha"]),
    about: z.enum(["classic", "split", "editorial", "immersive", "rosewell"]),
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

router.get("/cms/design", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=30");
    return res.json(await load());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load page designs" });
  }
});

router.put("/admin/cms/design", requireAdmin, async (req: AdminAuthRequest, res) => {
  const parsed = designInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "بيانات غير صالحة", issues: parsed.error.issues });
  try {
    const value = JSON.stringify({ ...(await load()), ...parsed.data });
    const updatedBy = req.adminEmail ?? null;
    await db
      .insert(siteSettings)
      .values({ key: KEY, value, valueType: "json", updatedBy })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, valueType: "json", updatedAt: new Date(), updatedBy } });
    return res.json(JSON.parse(value));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save page designs" });
  }
});

export default router;
