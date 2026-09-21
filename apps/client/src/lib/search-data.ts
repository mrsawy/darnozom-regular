import { SERVICES, EVENTS, PROGRAMS } from "./site-content";

export type SearchCategory = "service" | "event" | "academy" | "book";

export interface SearchResult {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  category: SearchCategory;
  href: string;
}

function serviceHref(slug: string): string {
  if (slug === "academy") return "/academy";
  if (slug === "store") return "/services/store/books";
  return `/services/${slug}`;
}

const SERVICES_RESULTS: SearchResult[] = SERVICES.map(s => ({
  id: `service-${s.slug}`,
  titleAr: s.title.ar,
  titleEn: s.title.en,
  descAr: s.desc.ar,
  descEn: s.desc.en,
  category: "service",
  href: serviceHref(s.slug),
}));

const EVENTS_RESULTS: SearchResult[] = EVENTS.map(e => ({
  id: `event-${e.id}`,
  titleAr: e.title.ar,
  titleEn: e.title.en,
  descAr: e.desc.ar,
  descEn: e.desc.en,
  category: "event",
  href: "/events",
}));

const ACADEMY_RESULTS: SearchResult[] = PROGRAMS.map(p => ({
  id: `academy-${p.id}`,
  titleAr: p.title.ar,
  titleEn: p.title.en,
  descAr: p.desc.ar,
  descEn: p.desc.en,
  category: "academy",
  href: p.href,
}));

const ALL_STATIC: SearchResult[] = [
  ...SERVICES_RESULTS,
  ...EVENTS_RESULTS,
  ...ACADEMY_RESULTS,
];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function score(item: SearchResult, query: string): number {
  const q = normalize(query);
  const titleAr = normalize(item.titleAr);
  const titleEn = normalize(item.titleEn);
  const descAr = normalize(item.descAr);
  const descEn = normalize(item.descEn);

  if (titleAr === q || titleEn === q) return 100;
  if (titleAr.startsWith(q) || titleEn.startsWith(q)) return 80;
  if (titleAr.includes(q) || titleEn.includes(q)) return 60;
  if (descAr.includes(q) || descEn.includes(q)) return 30;
  return 0;
}

export function searchStatic(query: string): SearchResult[] {
  if (!query.trim()) return [];
  return ALL_STATIC
    .map(item => ({ item, s: score(item, query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map(x => x.item)
    .slice(0, 8);
}

export function getStaticItemCount(): number {
  return ALL_STATIC.length;
}
