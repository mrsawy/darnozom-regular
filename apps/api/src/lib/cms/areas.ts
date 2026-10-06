import { asc, eq, sql } from "drizzle-orm";
import { db, contentAreas, contentItems, type ContentAreaRow } from "@workspace/db";
import { logger } from "../logger";

export class AreaConflictError extends Error {}
export class AreaInUseError extends Error {
  constructor(public count: number) {
    super(`Area is used by ${count} content item(s); deactivate it instead`);
  }
}

const DEFAULT_AREAS = [
  { slug: "sharia_policy", labelAr: "السياسة الشرعية والفكر الإسلامي", labelEn: "Sharia Policy and Islamic Thought" },
  { slug: "public_policy_admin", labelAr: "السياسات والإدارة العامة", labelEn: "Public Policy and Public Administration" },
  { slug: "leadership_governance", labelAr: "القيادة والإدارة والحوكمة", labelEn: "Leadership, Management and Governance" },
];

/**
 * Idempotent bootstrap: creates content_areas, converts content_items.area from the old
 * enum to varchar, and seeds the three original areas once (only when the table is empty,
 * so areas an admin deletes never come back).
 */
export async function ensureContentAreas(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS content_areas (
      id serial PRIMARY KEY,
      slug varchar(64) NOT NULL,
      label_ar varchar(200) NOT NULL,
      label_en varchar(200) NOT NULL DEFAULT '',
      position integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS content_areas_slug_uq ON content_areas (slug)`);
  await db.execute(sql`
    DO $$ BEGIN
      IF (SELECT data_type FROM information_schema.columns
          WHERE table_name = 'content_items' AND column_name = 'area') = 'USER-DEFINED' THEN
        ALTER TABLE content_items ALTER COLUMN area TYPE varchar(64) USING area::text;
      END IF;
    END $$`);
  const existing = await db.select({ id: contentAreas.id }).from(contentAreas).limit(1);
  if (existing.length === 0) {
    await db.insert(contentAreas).values(DEFAULT_AREAS.map((a, i) => ({ ...a, position: i }))).onConflictDoNothing();
    logger.info("Seeded content areas");
  }
}

export const listAreas = (activeOnly = false): Promise<ContentAreaRow[]> =>
  db
    .select()
    .from(contentAreas)
    .where(activeOnly ? eq(contentAreas.isActive, true) : undefined)
    .orderBy(asc(contentAreas.position), asc(contentAreas.id));

export async function areaExists(slug: string): Promise<boolean> {
  const [r] = await db.select({ id: contentAreas.id }).from(contentAreas).where(eq(contentAreas.slug, slug));
  return !!r;
}

type AreaInput = { slug: string; labelAr: string; labelEn: string; isActive: boolean };

export async function createArea(v: AreaInput): Promise<ContentAreaRow> {
  if (await areaExists(v.slug)) throw new AreaConflictError(`Slug "${v.slug}" is already used`);
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${contentAreas.position}), -1)` }).from(contentAreas);
  const [row] = await db.insert(contentAreas).values({ ...v, position: Number(max) + 1 }).returning();
  return row;
}

/** Slug is immutable: content items reference it. */
export async function updateArea(id: number, v: Omit<AreaInput, "slug">): Promise<ContentAreaRow | null> {
  const [row] = await db.update(contentAreas).set({ ...v, updatedAt: new Date() }).where(eq(contentAreas.id, id)).returning();
  return row ?? null;
}

export async function deleteArea(id: number): Promise<boolean> {
  const [area] = await db.select().from(contentAreas).where(eq(contentAreas.id, id));
  if (!area) return false;
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(contentItems).where(eq(contentItems.area, area.slug));
  if (Number(n) > 0) throw new AreaInUseError(Number(n));
  await db.delete(contentAreas).where(eq(contentAreas.id, id));
  return true;
}

export async function reorderAreas(ids: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) await tx.update(contentAreas).set({ position: i }).where(eq(contentAreas.id, ids[i]));
  });
}
