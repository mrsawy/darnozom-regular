export type BookFilters = {
  q: string;
  category: string;
  author: string;
  publisher: string;
  language: "" | "ar" | "en" | "both";
  format: "all" | "paper" | "digital";
};

export const EMPTY_BOOK_FILTERS: BookFilters = { q: "", category: "", author: "", publisher: "", language: "", format: "all" };

const FORMAT_ALIASES: Record<string, BookFilters["format"]> = {
  paper: "paper", hardcopy: "paper", digital: "digital", online: "digital",
};

export function readBookFilters(search: string): BookFilters {
  const p = new URLSearchParams(search);
  const language = p.get("language");
  return {
    q: p.get("q") ?? "",
    category: p.get("category") && p.get("category") !== "all" ? p.get("category")! : "",
    author: p.get("author") ?? "",
    publisher: p.get("publisher") ?? "",
    language: language === "ar" || language === "en" || language === "both" ? language : "",
    format: FORMAT_ALIASES[p.get("format") ?? ""] ?? "all",
  };
}

export function bookFiltersToQuery(f: BookFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.category) p.set("category", f.category);
  if (f.author) p.set("author", f.author);
  if (f.publisher) p.set("publisher", f.publisher);
  if (f.language) p.set("language", f.language);
  if (f.format !== "all") p.set("format", f.format);
  return p.toString();
}
