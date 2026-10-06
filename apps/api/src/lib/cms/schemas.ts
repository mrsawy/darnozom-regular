import { z } from "zod";

export const CONTENT_TYPES = ["observatory", "article", "study", "publication", "news", "event"] as const;
export const CONTENT_STATUSES = ["draft", "review", "published", "archived"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];
/** Slug of an admin-managed row in content_areas (validated against the table on write). */
export type ContentArea = string;

const optText = (max: number) => z.string().trim().max(max).optional().default("");
const html = z.string().max(200_000).optional().default("");
// Only http(s) URLs or same-site paths. "//host" and "/\host" are protocol-relative
// (another origin), so they are rejected as paths. Values are rendered as href/src.
const isSitePath = (v: string) => v.startsWith("/") && !/^\/[\/\\]/.test(v);
const isHttpUrl = (v: string) => /^https?:\/\/[^\s/\\]/i.test(v);
const urlOrPath = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || isSitePath(v) || isHttpUrl(v), "Must be an http(s) URL or a site path")
  .optional()
  .default("");
const link = z.object({
  title: z.string().trim().min(1).max(300),
  url: z.string().trim().max(1000).refine(isHttpUrl, "Link must be an http(s) URL"),
});
const links = z.array(link).max(50).optional().default([]);
const isoDate = z.string().datetime({ offset: true });
const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const DETAILS_SCHEMAS = {
  observatory: z.object({
    kind: z.enum(["daily_brief", "weekly_review", "research_output", "follow_up_file"]),
    region: z.enum(["egypt", "middle_east", "islamic_world", "rest_of_world"]).optional(),
    whatHappenedAr: html,
    whatHappenedEn: html,
    ourReadingAr: html,
    ourReadingEn: html,
    researchQuestionsAr: html,
    researchQuestionsEn: html,
    sources: links,
  }),
  article: z.object({ relatedLinks: links }),
  study: z.object({
    questionAr: html,
    questionEn: html,
    methodAr: html,
    methodEn: html,
    findingsAr: html,
    findingsEn: html,
    recommendationsAr: html,
    recommendationsEn: html,
    keywords: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([]),
    pdfUrl: urlOrPath,
  }),
  publication: z.object({
    kind: z.enum(["report", "periodical", "research"]),
    issueNumber: optText(50),
    pdfUrl: urlOrPath,
  }),
  news: z.object({ relatedLinks: links }),
  event: z
    .object({
      kind: z.enum(["training", "workshop", "seminar", "conference", "exhibition"]),
      startsAt: isoDate.optional(),
      endsAt: isoDate.optional(),
      timezone: z.string().trim().max(64).refine(isTimeZone, "Unknown timezone").optional().default("Africa/Cairo"),
      mode: z.enum(["in_person", "online", "hybrid"]).optional().default("in_person"),
      venueAr: optText(500),
      venueEn: optText(500),
      registration: z.enum(["open", "closed", "interest"]).optional().default("interest"),
      registrationUrl: urlOrPath,
      isExternalEvent: z.boolean().optional().default(false),
      organizerName: optText(300),
      organizerUrl: urlOrPath,
      legacyEventId: z.number().int().optional(),
      legacyDateText: optText(400),
    })
    .refine((d) => !d.startsAt || !d.endsAt || Date.parse(d.endsAt) >= Date.parse(d.startsAt), {
      message: "endsAt must be after startsAt",
      path: ["endsAt"],
    }),
} as const;

export const HTML_DETAIL_KEYS = [
  "whatHappenedAr",
  "whatHappenedEn",
  "ourReadingAr",
  "ourReadingEn",
  "researchQuestionsAr",
  "researchQuestionsEn",
  "questionAr",
  "questionEn",
  "methodAr",
  "methodEn",
  "findingsAr",
  "findingsEn",
  "recommendationsAr",
  "recommendationsEn",
] as const;

export const contentItemInput = z.object({
  type: z.enum(CONTENT_TYPES),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Slug may contain only a-z, 0-9 and single dashes")
    .optional()
    .default(""),
  status: z.enum(CONTENT_STATUSES).optional().default("draft"),
  titleAr: z.string().trim().min(1, "Arabic title is required").max(500),
  titleEn: optText(500),
  summaryAr: optText(2000),
  summaryEn: optText(2000),
  bodyAr: html,
  bodyEn: html,
  coverImageUrl: urlOrPath,
  area: z.string().trim().min(1).max(64).nullable().optional().default(null),
  authorAr: optText(300),
  authorEn: optText(300),
  isExternal: z.boolean().optional().default(false),
  externalUrl: urlOrPath,
  publishedAt: z.coerce.date().nullable().optional().default(null),
  details: z.record(z.unknown()).optional().default({}),
});
export type ContentItemInput = z.infer<typeof contentItemInput>;

export type ParseResult = { ok: true; value: ContentItemInput } | { ok: false; issues: z.ZodIssue[] };

export function parseContentItem(body: unknown): ParseResult {
  const base = contentItemInput.safeParse(body);
  if (!base.success) return { ok: false, issues: base.error.issues };
  const details = DETAILS_SCHEMAS[base.data.type].safeParse(base.data.details);
  if (!details.success) {
    return {
      ok: false,
      issues: details.error.issues.map((i) => ({ ...i, path: ["details", ...i.path] })),
    };
  }
  return { ok: true, value: { ...base.data, details: details.data as Record<string, unknown> } };
}

export const featuredSlideInput = z
  .object({
    sourceKind: z.enum(["content", "book", "custom"]),
    contentItemId: z.number().int().positive().nullable().optional().default(null),
    medusaProductId: z.string().trim().max(100).nullable().optional().default(null),
    isActive: z.boolean().optional().default(true),
    badgeAr: optText(100),
    badgeEn: optText(100),
    titleAr: optText(500),
    titleEn: optText(500),
    summaryAr: optText(1000),
    summaryEn: optText(1000),
    imageUrl: urlOrPath,
    ctaLabelAr: optText(100),
    ctaLabelEn: optText(100),
    href: urlOrPath,
  })
  .superRefine((v, ctx) => {
    if (v.sourceKind === "content" && !v.contentItemId) {
      ctx.addIssue({ code: "custom", path: ["contentItemId"], message: "Pick a content item" });
    }
    if (v.sourceKind === "book" && !v.medusaProductId) {
      ctx.addIssue({ code: "custom", path: ["medusaProductId"], message: "Pick a book" });
    }
    if (v.sourceKind === "custom") {
      for (const k of ["titleAr", "href", "imageUrl"] as const) {
        if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: `${k} is required for a custom card` });
      }
    }
  });
export type FeaturedSlideInput = z.infer<typeof featuredSlideInput>;
