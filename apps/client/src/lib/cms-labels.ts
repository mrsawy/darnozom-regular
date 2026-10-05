import type { ContentArea, ContentItem, ContentType, Lang } from "./cms-types";

type Pair = { ar: string; en: string };
const pair = (ar: string, en: string): Pair => ({ ar, en });

export const AREA_LABELS: Record<ContentArea, Pair> = {
  sharia_policy: pair("السياسة الشرعية والفكر الإسلامي", "Sharia Policy and Islamic Thought"),
  public_policy_admin: pair("السياسات والإدارة العامة", "Public Policy and Public Administration"),
  leadership_governance: pair("القيادة والإدارة والحوكمة", "Leadership, Management and Governance"),
};

export const REGION_LABELS: Record<string, Pair> = {
  egypt: pair("مصر", "Egypt"),
  middle_east: pair("الشرق الأوسط", "Middle East"),
  islamic_world: pair("العالم الإسلامي", "Islamic World"),
  rest_of_world: pair("بقية العالم", "Rest of the World"),
};

export const OBSERVATORY_KINDS: Record<string, Pair> = {
  daily_brief: pair("الموجز اليومي", "Daily Brief"),
  weekly_review: pair("المراجعة الأسبوعية", "Weekly Review"),
  research_output: pair("الإنتاج الفكري والبحثي", "Research Output"),
  follow_up_file: pair("ملفات المتابعة", "Follow-up Files"),
};

export const PUBLICATION_KINDS: Record<string, Pair> = {
  book: pair("كتاب", "Book"),
  report: pair("تقرير", "Report"),
  periodical: pair("دورية", "Periodical"),
  research: pair("بحث علمي", "Research"),
};

export const EVENT_KINDS: Record<string, Pair> = {
  training: pair("تدريب", "Training"),
  workshop: pair("ورشة عمل", "Workshop"),
  seminar: pair("ندوة", "Seminar"),
  conference: pair("مؤتمر", "Conference"),
  exhibition: pair("معرض", "Exhibition"),
};

const TYPE_BADGES: Record<ContentType, Pair> = {
  observatory: pair("موجز المرصد", "Observatory"),
  article: pair("مقال", "Article"),
  study: pair("دراسة", "Study"),
  publication: pair("إصدار", "Publication"),
  news: pair("خبر", "News"),
  event: pair("فعالية", "Event"),
};

const CTAS: Record<string, Pair> = {
  observatory: pair("اقرأ الموجز", "Read the brief"),
  article: pair("اقرأ المقال", "Read article"),
  study: pair("اطّلع على الدراسة", "View study"),
  report: pair("اطّلع على التقرير", "View report"),
  periodical: pair("تصفح الدورية", "Browse periodical"),
  research: pair("عرض البحث", "View research"),
  book: pair("تفاصيل الكتاب", "Book details"),
  news: pair("تفاصيل الخبر", "News details"),
  event: pair("تفاصيل الفعالية", "Event details"),
};

export function pickLang(item: Record<string, any>, field: string, lang: Lang): string {
  const ar = item[`${field}Ar`] ?? "";
  const en = item[`${field}En`] ?? "";
  return lang === "en" && en ? en : ar;
}

export function typeBadge(type: ContentType, details: Record<string, any>, lang: Lang): string {
  if (type === "publication" && PUBLICATION_KINDS[details?.kind]) return PUBLICATION_KINDS[details.kind][lang];
  if (type === "event" && EVENT_KINDS[details?.kind]) return EVENT_KINDS[details.kind][lang];
  return TYPE_BADGES[type][lang];
}

export function ctaLabel(type: ContentType | "book", details: Record<string, any>, lang: Lang): string {
  if (type === "publication") return (CTAS[details?.kind] ?? CTAS.report)[lang];
  return CTAS[type][lang];
}

const BASE: Record<ContentType, string> = {
  observatory: "/observatory",
  article: "/articles",
  study: "/studies",
  publication: "/publications",
  news: "/news-events",
  event: "/news-events",
};

export function contentPath(type: ContentType, slug: string): string {
  return `${BASE[type]}/${slug}`;
}

export function formatDate(iso: string | null | undefined, lang: Lang, withTime = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function eventCta(details: Record<string, any>, lang: Lang): { label: string; href: string | null } {
  const past = details?.startsAt ? Date.parse(details.startsAt) < Date.now() : false;
  if (past) return { label: lang === "ar" ? "اطّلع على ملخص الفعالية" : "View event summary", href: null };
  if (details?.registration === "open") {
    return { label: lang === "ar" ? "سجّل للمشاركة" : "Register to attend", href: details.registrationUrl || "/contact" };
  }
  if (details?.registration === "closed") return { label: lang === "ar" ? "التسجيل مغلق" : "Registration closed", href: null };
  return { label: lang === "ar" ? "سجّل اهتمامك" : "Register your interest", href: "/contact" };
}

export function itemDate(item: Pick<ContentItem, "type" | "details" | "publishedAt">): string | null {
  return item.type === "event" && item.details?.startsAt ? item.details.startsAt : item.publishedAt;
}
