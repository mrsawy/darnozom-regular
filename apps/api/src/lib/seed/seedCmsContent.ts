import { count, eq } from "drizzle-orm";
import { db, featuredSlides, siteSettings } from "@workspace/db";
import { logger } from "../logger";
import { createItem, createSlide, getItemBySlug } from "../cms/repo";
import { parseContentItem } from "../cms/schemas";
import { SEED_ITEMS, SEED_SLIDES } from "./cmsSeedData";

const MARKER = "cms_seed_v1";

/** Runs once per database (guarded by a site_settings row) so deleted seed items never come back. */
export async function seedCmsContent(): Promise<void> {
  try {
    const [done] = await db.select().from(siteSettings).where(eq(siteSettings.key, MARKER));
    if (done) return;

    for (const raw of SEED_ITEMS) {
      const parsed = parseContentItem(raw);
      if (!parsed.ok) throw new Error(`Invalid seed item ${String(raw.slug)}: ${JSON.stringify(parsed.issues)}`);
      if (!(await getItemBySlug(parsed.value.slug))) await createItem(parsed.value);
    }

    const [{ n }] = await db.select({ n: count() }).from(featuredSlides);
    if (Number(n) === 0) for (const s of SEED_SLIDES) await createSlide(s);

    await db
      .insert(siteSettings)
      .values({ key: MARKER, value: new Date().toISOString(), valueType: "string" })
      .onConflictDoNothing();
    logger.info("Seeded CMS home content");
  } catch (err) {
    logger.error({ err }, "CMS seed failed");
  }
}
