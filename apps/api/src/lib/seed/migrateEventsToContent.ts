import { db, events, contentItems, siteSettings } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../logger";
import { createItem } from "../cms/repo";
import { parseContentItem } from "../cms/schemas";

type EventKind = "training" | "workshop" | "seminar" | "conference" | "exhibition";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

const AR_MONTHS: Record<string, number> = {
  يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, ابريل: 3, إبريل: 3, مايو: 4, يونيو: 5, يونيه: 5,
  يوليو: 6, يوليه: 6, أغسطس: 7, اغسطس: 7, سبتمبر: 8, أكتوبر: 9, اكتوبر: 9, نوفمبر: 10, ديسمبر: 11,
};

export function parseLegacyEventDate(ar: string, en: string, time?: string | null): Date | null {
  const hm = time ? toLatinDigits(time).match(/(\d{1,2}):(\d{2})/) : null;
  const withTime = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d, hm ? Number(hm[1]) : 0, hm ? Number(hm[2]) : 0));

  const iso = en.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return withTime(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const enMatch = en.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (enMatch) {
    const probe = new Date(`${enMatch[2]} 1, 2000`);
    if (!Number.isNaN(probe.getTime())) return withTime(Number(enMatch[3]), probe.getMonth(), Number(enMatch[1]));
  }

  const arMatch = toLatinDigits(ar).match(/(\d{1,2})\s+([\u0600-\u06FF]+)\s+(\d{4})/);
  if (arMatch && arMatch[2] in AR_MONTHS) {
    return withTime(Number(arMatch[3]), AR_MONTHS[arMatch[2]], Number(arMatch[1]));
  }
  return null;
}

export function mapLegacyKind(categoryEn: string | null, categoryAr: string | null): EventKind {
  const s = `${categoryEn ?? ""} ${categoryAr ?? ""}`.toLowerCase();
  if (/workshop|ورش/.test(s)) return "workshop";
  if (/conference|مؤتمر/.test(s)) return "conference";
  if (/exhibit|معرض/.test(s)) return "exhibition";
  if (/training|course|تدريب|دورة/.test(s)) return "training";
  return "seminar";
}

const MARKER = "events_migrated_v1";

/**
 * One-time copy of legacy `events` rows into content_items. Guarded by a
 * site_settings marker so events an admin later deletes are not recreated on
 * restart; per-row legacyEventId tracking makes an interrupted run resumable.
 */
export async function migrateEventsToContent(): Promise<{ migrated: number; needsReview: number }> {
  let migrated = 0;
  let needsReview = 0;
  try {
    const [alreadyRun] = await db.select().from(siteSettings).where(eq(siteSettings.key, MARKER));
    if (alreadyRun) return { migrated, needsReview };
    const legacy = await db.select().from(events);
    if (!legacy.length) {
      await markDone();
      return { migrated, needsReview };
    }
    const done = await db
      .select({ id: sql<number>`(${contentItems.details}->>'legacyEventId')::int` })
      .from(contentItems)
      .where(sql`${contentItems.details} ? 'legacyEventId'`);
    const doneIds = new Set(done.map((r) => Number(r.id)));

    for (const e of legacy) {
      if (doneIds.has(e.id)) continue;
      const date = parseLegacyEventDate(e.dateAr, e.dateEn, e.timeEn ?? e.timeAr);
      const online = /online|عن ?بعد|أونلاين|اونلاين/i.test(`${e.locationEn ?? ""} ${e.locationAr ?? ""}`);
      const parsed = parseContentItem({
        type: "event",
        slug: `event-legacy-${e.id}`,
        status: date ? "published" : "review",
        titleAr: e.titleAr,
        titleEn: e.titleEn,
        summaryAr: (e.descriptionAr ?? "").slice(0, 2000),
        summaryEn: (e.descriptionEn ?? "").slice(0, 2000),
        bodyAr: e.descriptionAr ? `<p>${escapeHtml(e.descriptionAr)}</p>` : "",
        bodyEn: e.descriptionEn ? `<p>${escapeHtml(e.descriptionEn)}</p>` : "",
        coverImageUrl: e.imageUrl ?? "",
        publishedAt: e.createdAt,
        details: {
          kind: mapLegacyKind(e.categoryEn, e.categoryAr),
          ...(date ? { startsAt: date.toISOString() } : {}),
          mode: online ? "online" : "in_person",
          venueAr: e.locationAr ?? "",
          venueEn: e.locationEn ?? "",
          registration: e.status === "past" ? "closed" : "interest",
          legacyEventId: e.id,
          ...(date ? {} : { legacyDateText: `${e.dateAr} / ${e.dateEn}` }),
        },
      });
      if (!parsed.ok) {
        logger.warn({ eventId: e.id, issues: parsed.issues }, "Skipping legacy event that fails validation");
        continue;
      }
      try {
        await createItem(parsed.value);
        migrated++;
        if (!date) needsReview++;
      } catch (err) {
        logger.warn({ err, eventId: e.id }, "Skipping legacy event that failed to migrate");
      }
    }
    await markDone();
    if (migrated) logger.info({ migrated, needsReview }, "Migrated legacy events to content_items");
  } catch (err) {
    logger.error({ err }, "Legacy events migration failed");
  }
  return { migrated, needsReview };
}

async function markDone() {
  await db
    .insert(siteSettings)
    .values({ key: MARKER, value: new Date().toISOString(), valueType: "string" })
    .onConflictDoNothing();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n+/g, "<br>");
}
