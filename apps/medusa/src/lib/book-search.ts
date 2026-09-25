import type { BookProfileRow } from "../modules/book-catalog";
import { normalizeIsbn, normalizeSearchText, searchTokens } from "./book-text";

export type CategoryNode = { id: string; parent_category_id: string | null; name: string; name_ar: string | null; handle: string };
export type BookSearchEntry = {
  product_id: string;
  title: string;
  subtitle: string | null;
  created_at: string;
  category_ids: string[];
  formats: ("paper" | "digital")[];
  profile: BookProfileRow | null;
};
export type Facet = { value: string; count: number };
export type BookSearchFilters = {
  q?: string;
  category_id?: string;
  author?: string;
  publisher?: string;
  language?: "ar" | "en" | "both";
  format?: "paper" | "digital";
  limit: number;
  offset: number;
};
export type BookSearchResult = {
  product_ids: string[];
  count: number;
  facets: { authors: Facet[]; publishers: Facet[]; languages: Facet[] };
};

export function descendantIds(categories: CategoryNode[], rootId: string): Set<string> {
  const out = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_category_id && out.has(c.parent_category_id) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Category names (and their parents' names), both languages. */
function categoryTrailText(categories: CategoryNode[], ids: string[]): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parts: string[] = [];
  for (const id of ids) {
    let c = byId.get(id);
    while (c) {
      parts.push(c.name, c.name_ar ?? "");
      c = c.parent_category_id ? byId.get(c.parent_category_id) : undefined;
    }
  }
  return parts.join(" ");
}

const people = (p: BookProfileRow | null) => [...(p?.authors ?? []), ...(p?.editors ?? []), ...(p?.translators ?? [])];

function haystack(e: BookSearchEntry, categories: CategoryNode[]): string {
  const p = e.profile;
  return normalizeSearchText(
    [
      e.title,
      e.subtitle ?? "",
      ...people(p),
      p?.publisher ?? "",
      ...(p?.keywords ?? []),
      p?.target_audience ?? "",
      categoryTrailText(categories, e.category_ids),
    ].join(" "),
  );
}

function facet(values: string[]): Facet[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "ar"));
}

const newestFirst = (a: BookSearchEntry, b: BookSearchEntry) => b.created_at.localeCompare(a.created_at);

export function searchBooks(entries: BookSearchEntry[], categories: CategoryNode[], f: BookSearchFilters): BookSearchResult {
  const tokens = searchTokens(f.q);
  const isbnQuery = normalizeIsbn(f.q);
  const inCategory = f.category_id ? descendantIds(categories, f.category_id) : null;

  // Base set: search text, category, format. Facets describe this set.
  const scored: { e: BookSearchEntry; score: number }[] = [];
  for (const e of entries) {
    if (inCategory && !e.category_ids.some((id) => inCategory.has(id))) continue;
    if (f.format && !e.formats.includes(f.format)) continue;
    let score = 1;
    if (tokens.length) {
      const isbnHit = !!isbnQuery && isbnQuery.length >= 10 && e.profile?.isbn === isbnQuery;
      const text = haystack(e, categories);
      if (!isbnHit && !tokens.every((t) => text.includes(t))) continue;
      const title = normalizeSearchText(`${e.title} ${e.subtitle ?? ""}`);
      score = isbnHit || tokens.every((t) => title.includes(t)) ? 2 : 1;
    }
    scored.push({ e, score });
  }

  const facets = {
    authors: facet(scored.flatMap(({ e }) => e.profile?.authors ?? [])),
    publishers: facet(scored.flatMap(({ e }) => (e.profile?.publisher ? [e.profile.publisher] : []))),
    languages: facet(scored.map(({ e }) => e.profile?.language ?? "ar")),
  };

  const author = normalizeSearchText(f.author);
  const publisher = normalizeSearchText(f.publisher);
  const results = scored
    .filter(({ e }) => !author || people(e.profile).some((n) => normalizeSearchText(n) === author))
    .filter(({ e }) => !publisher || normalizeSearchText(e.profile?.publisher) === publisher)
    .filter(({ e }) => !f.language || (e.profile?.language ?? "ar") === f.language)
    .sort((a, b) => b.score - a.score || newestFirst(a.e, b.e));

  return {
    product_ids: results.slice(f.offset, f.offset + f.limit).map(({ e }) => e.product_id),
    count: results.length,
    facets,
  };
}

/** Up to `limit` books that share a category, an author or a keyword. */
export function relatedBooks(entries: BookSearchEntry[], productId: string, limit = 8): string[] {
  const target = entries.find((e) => e.product_id === productId);
  if (!target) return [];
  const tAuthors = new Set((target.profile?.authors ?? []).map(normalizeSearchText));
  const tKeywords = new Set((target.profile?.keywords ?? []).map(normalizeSearchText));
  const tPrimary = target.profile?.primary_category_id;
  return entries
    .filter((e) => e.product_id !== productId)
    .map((e) => {
      let score = 0;
      if (tPrimary && e.category_ids.includes(tPrimary)) score += 3;
      score += e.category_ids.filter((id) => target.category_ids.includes(id)).length;
      score += 2 * (e.profile?.authors ?? []).filter((a) => tAuthors.has(normalizeSearchText(a))).length;
      score += (e.profile?.keywords ?? []).filter((k) => tKeywords.has(normalizeSearchText(k))).length;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || newestFirst(a.e, b.e))
    .slice(0, limit)
    .map((x) => x.e.product_id);
}
