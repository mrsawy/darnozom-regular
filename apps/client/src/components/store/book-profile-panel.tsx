import type { ReactNode } from "react";
import { Link } from "wouter";
import type { BookCategoryRef, BookProfile } from "@/lib/book-catalog";

const L = {
  ar: { authors: "المؤلف", editors: "المحرر", translators: "المترجم", publisher: "الناشر", isbn: "ردمك (ISBN)", year: "سنة النشر", edition: "الطبعة", pages: "عدد الصفحات", volumes: "عدد المجلدات", language: "لغة الكتاب", section: "القسم العلمي", keywords: "الكلمات المفتاحية", audience: "الفئة المستهدفة", toc: "فهرس المحتويات", languages: { ar: "العربية", en: "الإنجليزية", both: "العربية والإنجليزية" } },
  en: { authors: "Author", editors: "Editor", translators: "Translator", publisher: "Publisher", isbn: "ISBN", year: "Year", edition: "Edition", pages: "Pages", volumes: "Volumes", language: "Language", section: "Section", keywords: "Keywords", audience: "Target audience", toc: "Table of contents", languages: { ar: "Arabic", en: "English", both: "Arabic & English" } },
} as const;

export function bookTextDir(language: BookProfile["language"] | undefined): { dir: "rtl" | "ltr" | "auto"; lang: string | undefined } {
  if (language === "en") return { dir: "ltr", lang: "en" };
  if (language === "ar") return { dir: "rtl", lang: "ar" };
  return { dir: "auto", lang: undefined };
}

function formatIsbn(isbn: string): string {
  return isbn.length === 13 ? `${isbn.slice(0, 3)}-${isbn.slice(3, 4)}-${isbn.slice(4, 7)}-${isbn.slice(7, 12)}-${isbn.slice(12)}` : isbn;
}

export default function BookProfilePanel({ profile, categories, isArabic }: { profile: BookProfile; categories: BookCategoryRef[]; isArabic: boolean }) {
  const t = isArabic ? L.ar : L.en;
  const name = (c: { name: string; name_ar: string | null }) => (isArabic && c.name_ar ? c.name_ar : c.name);
  const rows: [string, ReactNode][] = [];
  const people = (label: string, list: string[]) => list.length && rows.push([label, <span className="flex flex-col">{list.map((p) => <span key={p}>{p}</span>)}</span>]);
  people(t.authors, profile.authors);
  people(t.editors, profile.editors);
  people(t.translators, profile.translators);
  if (profile.publisher) rows.push([t.publisher, profile.publisher]);
  if (profile.isbn) rows.push([t.isbn, <span dir="ltr">{formatIsbn(profile.isbn)}</span>]);
  if (profile.publication_year) rows.push([t.year, String(profile.publication_year)]);
  if (profile.edition_number) rows.push([t.edition, String(profile.edition_number)]);
  if (profile.pages) rows.push([t.pages, String(profile.pages)]);
  if (profile.volumes > 1) rows.push([t.volumes, String(profile.volumes)]);
  rows.push([t.language, t.languages[profile.language]]);
  if (categories.length) {
    rows.push([
      t.section,
      <span className="flex flex-col">
        {categories.map((c) => (
          <Link key={c.id} href={`/services/store/books?category=${c.id}`} className="text-secondary hover:underline">
            {c.parent ? `${name(c.parent)} › ${name(c)}` : name(c)}
          </Link>
        ))}
      </span>,
    ]);
  }
  if (profile.target_audience) rows.push([t.audience, profile.target_audience]);

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-border border border-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground/90">{value}</dd>
          </div>
        ))}
      </dl>
      {profile.keywords.length > 0 && (
        <div>
          <div className="text-xs font-bold text-muted-foreground mb-2">{t.keywords}</div>
          <div className="flex flex-wrap gap-1.5">
            {profile.keywords.map((k) => (
              <Link key={k} href={`/services/store/books?q=${encodeURIComponent(k)}`} className="text-xs px-2 py-1 border border-border hover:border-secondary">
                {k}
              </Link>
            ))}
          </div>
        </div>
      )}
      {profile.table_of_contents && (
        <details className="border border-border">
          <summary className="px-4 py-2.5 cursor-pointer text-sm font-bold">{t.toc}</summary>
          <ol className="px-8 py-3 list-decimal space-y-1 text-sm" {...bookTextDir(profile.language)}>
            {profile.table_of_contents.split("\n").filter((l) => l.trim()).map((line, i) => <li key={i}>{line.trim()}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
