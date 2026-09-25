export type BookProfileFormValue = {
  authors: string;
  editors: string;
  translators: string;
  publisher: string;
  isbn: string;
  external_id: string;
  publication_year: string;
  edition_number: string;
  pages: string;
  volumes: string;
  language: "ar" | "en" | "both";
  primary_category_id: string;
  keywords: string;
  target_audience: string;
  table_of_contents: string;
  digital_rights: boolean;
};

export const EMPTY_PROFILE_FORM: BookProfileFormValue = {
  authors: "", editors: "", translators: "", publisher: "", isbn: "", external_id: "",
  publication_year: "", edition_number: "", pages: "", volumes: "1", language: "ar",
  primary_category_id: "", keywords: "", target_audience: "", table_of_contents: "",
  digital_rights: false,
};

/** One name per line; the Arabic comma also separates. ("Smith, John" stays one name.) */
export function splitPeople(text: string): string[] {
  return text.split(/[\n،]/).map((s) => s.trim()).filter(Boolean);
}

export function splitKeywords(text: string): string[] {
  return text.split(/[\n,،]/).map((s) => s.trim()).filter(Boolean);
}

const num = (s: string) => (s.trim() ? Number(s.trim()) : null);
const text = (s: string) => (s.trim() ? s.trim() : null);

export function toProfilePayload(v: BookProfileFormValue): Record<string, unknown> {
  return {
    authors: splitPeople(v.authors),
    editors: splitPeople(v.editors),
    translators: splitPeople(v.translators),
    publisher: text(v.publisher),
    isbn: text(v.isbn),
    external_id: text(v.external_id),
    publication_year: num(v.publication_year),
    edition_number: num(v.edition_number),
    pages: num(v.pages),
    volumes: num(v.volumes) ?? 1,
    language: v.language,
    primary_category_id: text(v.primary_category_id),
    keywords: splitKeywords(v.keywords),
    target_audience: text(v.target_audience),
    table_of_contents: text(v.table_of_contents),
    digital_rights: v.digital_rights,
  };
}

const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
const str = (x: unknown) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");

export function fromProfile(p: Record<string, unknown> | null): BookProfileFormValue {
  if (!p) return { ...EMPTY_PROFILE_FORM };
  const language = p.language === "en" || p.language === "both" ? p.language : "ar";
  return {
    authors: list(p.authors).join("\n"),
    editors: list(p.editors).join("\n"),
    translators: list(p.translators).join("\n"),
    publisher: str(p.publisher),
    isbn: str(p.isbn),
    external_id: str(p.external_id),
    publication_year: str(p.publication_year),
    edition_number: str(p.edition_number),
    pages: str(p.pages),
    volumes: str(p.volumes) || "1",
    language,
    primary_category_id: str(p.primary_category_id),
    keywords: list(p.keywords).join("، "),
    target_audience: str(p.target_audience),
    table_of_contents: str(p.table_of_contents),
    digital_rights: p.digital_rights === true,
  };
}
