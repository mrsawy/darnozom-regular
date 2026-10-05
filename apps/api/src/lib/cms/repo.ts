import { randomUUID } from "crypto";
import { and, asc, count, desc, eq, ilike, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";
import { db, contentItems, featuredSlides, type ContentItem, type FeaturedSlide } from "@workspace/db";
import { sanitizeItem } from "./sanitize";
import { slugify, withSuffix } from "./slug";
import { contentPath } from "./paths";
import type { ContentArea, ContentItemInput, ContentStatus, ContentType, FeaturedSlideInput } from "./schemas";

export class SlugConflictError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" is already used`);
  }
}
export class TypeChangeError extends Error {
  constructor() {
    super("An item's type cannot be changed");
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

async function slugTaken(slug: string, excludeId?: number): Promise<boolean> {
  const where = excludeId
    ? and(eq(contentItems.slug, slug), ne(contentItems.id, excludeId))
    : eq(contentItems.slug, slug);
  const [row] = await db.select({ id: contentItems.id }).from(contentItems).where(where).limit(1);
  return !!row;
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const rows = await db
    .select({ slug: contentItems.slug, id: contentItems.id })
    .from(contentItems)
    .where(like(contentItems.slug, `${base}%`));
  const taken = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  for (let n = 1; ; n++) {
    const candidate = withSuffix(base, n);
    if (!taken.has(candidate)) return candidate;
  }
}

async function resolveSlug(input: ContentItemInput, excludeId?: number): Promise<string> {
  if (input.slug) {
    if (await slugTaken(input.slug, excludeId)) throw new SlugConflictError(input.slug);
    return input.slug;
  }
  const base = slugify(input.titleEn) || `${input.type}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
  return uniqueSlug(base, excludeId);
}

export async function getItemById(id: number): Promise<ContentItem | null> {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.id, id));
  return row ?? null;
}

export async function getItemBySlug(slug: string): Promise<ContentItem | null> {
  const [row] = await db.select().from(contentItems).where(eq(contentItems.slug, slug));
  return row ?? null;
}

export async function createItem(input: ContentItemInput): Promise<ContentItem> {
  const clean = sanitizeItem(input);
  const slug = await resolveSlug(clean);
  const publishedAt = clean.publishedAt ?? (clean.status === "published" ? new Date() : null);
  try {
    const [row] = await db.insert(contentItems).values({ ...clean, slug, publishedAt }).returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugConflictError(slug);
    throw err;
  }
}

export async function updateItem(id: number, input: ContentItemInput): Promise<ContentItem | null> {
  const existing = await getItemById(id);
  if (!existing) return null;
  if (existing.type !== input.type) throw new TypeChangeError();
  const clean = sanitizeItem(input);
  const slug = !clean.slug || clean.slug === existing.slug ? existing.slug : await resolveSlug(clean, id);
  const publishedAt =
    clean.publishedAt ?? existing.publishedAt ?? (clean.status === "published" ? new Date() : null);
  try {
    const [row] = await db
      .update(contentItems)
      .set({ ...clean, slug, publishedAt, updatedAt: new Date() })
      .where(eq(contentItems.id, id))
      .returning();
    return row ?? null;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugConflictError(slug);
    throw err;
  }
}

export async function deleteItem(id: number): Promise<boolean> {
  const rows = await db.delete(contentItems).where(eq(contentItems.id, id)).returning({ id: contentItems.id });
  return rows.length > 0;
}

export function searchCondition(q: string): SQL {
  const pattern = `%${q}%`;
  return or(
    ilike(contentItems.titleAr, pattern),
    ilike(contentItems.titleEn, pattern),
    ilike(contentItems.summaryAr, pattern),
    ilike(contentItems.summaryEn, pattern),
  )!;
}

export async function adminList(p: {
  type: ContentType;
  status?: ContentStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(p.pageSize ?? 25, 1), 100);
  const page = Math.max(p.page ?? 1, 1);
  const conds: SQL[] = [eq(contentItems.type, p.type)];
  if (p.status) conds.push(eq(contentItems.status, p.status));
  if (p.q) conds.push(searchCondition(p.q));
  const where = and(...conds);
  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(contentItems)
      .where(where)
      .orderBy(desc(contentItems.updatedAt), desc(contentItems.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(contentItems).where(where),
  ]);
  return { items, total, page, pageSize };
}

export type ListParams = {
  types: ContentType[];
  area?: ContentArea;
  kind?: string;
  region?: string;
  when?: "upcoming" | "past";
  q?: string;
  page?: number;
  pageSize?: number;
};

const startsAt = sql`(${contentItems.details}->>'startsAt')::timestamptz`;

export async function listPublished(p: ListParams) {
  const pageSize = Math.min(Math.max(p.pageSize ?? 12, 1), 48);
  const page = Math.max(p.page ?? 1, 1);
  const conds: SQL[] = [eq(contentItems.status, "published"), inArray(contentItems.type, p.types)];
  if (p.area) conds.push(eq(contentItems.area, p.area));
  if (p.kind) conds.push(sql`${contentItems.details}->>'kind' = ${p.kind}`);
  if (p.region) conds.push(sql`${contentItems.details}->>'region' = ${p.region}`);
  if (p.when === "upcoming") conds.push(sql`(${startsAt} is null or ${startsAt} >= now())`);
  if (p.when === "past") conds.push(sql`${startsAt} < now()`);
  if (p.q) conds.push(searchCondition(p.q));
  const where = and(...conds);
  const order =
    p.when === "upcoming"
      ? [sql`${startsAt} asc nulls last`, desc(contentItems.id)]
      : p.when === "past"
        ? [sql`${startsAt} desc`, desc(contentItems.id)]
        : [sql`${contentItems.publishedAt} desc nulls last`, desc(contentItems.id)];
  const [items, [{ total }]] = await Promise.all([
    db.select().from(contentItems).where(where).orderBy(...order).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(contentItems).where(where),
  ]);
  return { items, total, page, pageSize };
}

export async function getPublishedBySlug(slug: string): Promise<ContentItem | null> {
  const [row] = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.slug, slug), eq(contentItems.status, "published")));
  return row ?? null;
}

export async function getRelated(item: ContentItem, limit = 3): Promise<ContentItem[]> {
  const conds: SQL[] = [
    eq(contentItems.status, "published"),
    eq(contentItems.type, item.type),
    ne(contentItems.id, item.id),
  ];
  if (item.area) conds.push(eq(contentItems.area, item.area));
  return db
    .select()
    .from(contentItems)
    .where(and(...conds))
    .orderBy(sql`${contentItems.publishedAt} desc nulls last`)
    .limit(limit);
}

export async function getHome() {
  const take = (types: ContentType[], n: number) => listPublished({ types, pageSize: n }).then((r) => r.items);
  const [featured, observatory, articles, studies, publications, newsEvents] = await Promise.all([
    resolveFeatured(),
    take(["observatory"], 4),
    take(["article"], 3),
    take(["study"], 2),
    take(["publication"], 4),
    take(["news", "event"], 3),
  ]);
  return {
    featured,
    observatory: { lead: observatory[0] ?? null, others: observatory.slice(1) },
    articles,
    studies,
    publications,
    newsEvents,
  };
}

export type FeaturedCard = {
  id: number;
  sourceKind: "content" | "book" | "custom";
  medusaProductId: string | null;
  contentType: ContentType | null;
  contentKind: string | null;
  badgeAr: string;
  badgeEn: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  imageUrl: string;
  ctaLabelAr: string;
  ctaLabelEn: string;
  href: string;
};

const pick = (override: string, fallback: string) => (override.trim() ? override : fallback);

export async function resolveFeatured(limit = 6): Promise<FeaturedCard[]> {
  const slides = await db
    .select()
    .from(featuredSlides)
    .where(eq(featuredSlides.isActive, true))
    .orderBy(asc(featuredSlides.position), asc(featuredSlides.id));
  const ids = slides.map((s) => s.contentItemId).filter((x): x is number => x != null);
  const linked = ids.length
    ? await db
        .select()
        .from(contentItems)
        .where(and(inArray(contentItems.id, ids), eq(contentItems.status, "published")))
    : [];
  const byId = new Map(linked.map((i) => [i.id, i]));
  const cards: FeaturedCard[] = [];
  for (const s of slides) {
    if (cards.length >= limit) break;
    const base = {
      id: s.id,
      sourceKind: s.sourceKind,
      medusaProductId: s.medusaProductId,
      contentType: null as ContentType | null,
      contentKind: null as string | null,
      badgeAr: s.badgeAr,
      badgeEn: s.badgeEn,
      titleAr: s.titleAr,
      titleEn: s.titleEn,
      summaryAr: s.summaryAr,
      summaryEn: s.summaryEn,
      imageUrl: s.imageUrl,
      ctaLabelAr: s.ctaLabelAr,
      ctaLabelEn: s.ctaLabelEn,
      href: s.href,
    };
    if (s.sourceKind === "content") {
      const item = s.contentItemId != null ? byId.get(s.contentItemId) : undefined;
      if (!item) continue;
      cards.push({
        ...base,
        contentType: item.type,
        contentKind: typeof item.details.kind === "string" ? item.details.kind : null,
        titleAr: pick(s.titleAr, item.titleAr),
        titleEn: pick(s.titleEn, item.titleEn),
        summaryAr: pick(s.summaryAr, item.summaryAr),
        summaryEn: pick(s.summaryEn, item.summaryEn),
        imageUrl: pick(s.imageUrl, item.coverImageUrl),
        href: pick(s.href, contentPath(item.type, item.slug)),
      });
    } else if (s.sourceKind === "book") {
      if (!s.medusaProductId) continue;
      cards.push({ ...base, href: pick(s.href, `/services/store/books/${s.medusaProductId}`) });
    } else {
      if (!s.titleAr || !s.href) continue;
      cards.push(base);
    }
  }
  return cards;
}

export async function listSlidesAdmin() {
  const slides = await db.select().from(featuredSlides).orderBy(asc(featuredSlides.position), asc(featuredSlides.id));
  const ids = slides.map((s) => s.contentItemId).filter((x): x is number => x != null);
  const linked = ids.length
    ? await db
        .select({ id: contentItems.id, titleAr: contentItems.titleAr, status: contentItems.status })
        .from(contentItems)
        .where(inArray(contentItems.id, ids))
    : [];
  const byId = new Map(linked.map((i) => [i.id, i]));
  return slides.map((s) => ({
    ...s,
    linkedTitleAr: s.contentItemId != null ? (byId.get(s.contentItemId)?.titleAr ?? null) : null,
    linkedStatus: s.contentItemId != null ? (byId.get(s.contentItemId)?.status ?? null) : null,
  }));
}

export async function createSlide(v: FeaturedSlideInput): Promise<FeaturedSlide> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${featuredSlides.position}), -1)` })
    .from(featuredSlides);
  const [row] = await db
    .insert(featuredSlides)
    .values({ ...v, position: Number(max) + 1 })
    .returning();
  return row;
}

export async function updateSlide(id: number, v: FeaturedSlideInput): Promise<FeaturedSlide | null> {
  const [row] = await db
    .update(featuredSlides)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(featuredSlides.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSlide(id: number): Promise<boolean> {
  const rows = await db.delete(featuredSlides).where(eq(featuredSlides.id, id)).returning({ id: featuredSlides.id });
  return rows.length > 0;
}

export async function reorderSlides(ids: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx.update(featuredSlides).set({ position, updatedAt: new Date() }).where(eq(featuredSlides.id, id));
    }
  });
}
