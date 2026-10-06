import { Link } from "wouter";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { useAreas } from "@/lib/cms-areas";
import { contentPath, ctaLabel, formatDate, itemDate, pickLang, typeBadge } from "@/lib/cms-labels";
import { CategoryBadge } from "./category-badge";

type Variant = "vertical" | "horizontal" | "compact";

/** `bare` is the home-page look: badge, title, summary and one link, with no area/author/date row.
 *  `imageEnd` puts a horizontal card's image on the end side instead of the start side. */
export function ContentCard({ item, variant = "vertical", bare = false, imageEnd = false }: { item: ContentItem; variant?: Variant; bare?: boolean; imageEnd?: boolean }) {
  const { language: lang, isArabic } = useLanguage();
  const { labelFor } = useAreas();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const Chevron = isArabic ? ChevronLeft : ChevronRight;
  const href = contentPath(item.type, item.slug);
  const title = pickLang(item, "title", lang);
  const summary = pickLang(item, "summary", lang);
  const author = pickLang(item, "author", lang);
  const date = itemDate(item);
  const dateText = item.type === "event" && !item.details?.startsAt
    ? (isArabic ? "الموعد يُعلن لاحقًا" : "Date to be announced")
    : formatDate(date, lang, false, item.type === "event" ? item.details?.timezone || "Africa/Cairo" : undefined);

  const image = item.coverImageUrl ? (
    <img
      src={item.coverImageUrl}
      alt=""
      loading="lazy"
      className={
        variant === "vertical" ? (bare ? "w-full aspect-[2.3/1] object-cover" : "w-full aspect-[16/9] object-cover")
        : variant === "horizontal" ? "w-2/5 shrink-0 object-cover min-h-[160px]"
        : bare ? "w-24 sm:w-28 self-stretch shrink-0 object-cover" : "w-28 h-20 shrink-0 object-cover"
      }
    />
  ) : null;

  if (bare && variant === "compact") {
    return (
      <Link href={href} className="group bg-white border border-line rounded-[4px] overflow-hidden flex items-stretch hover:shadow-md transition-shadow">
        {image}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1">
          <h3 className="font-bold text-navy leading-snug">{title}</h3>
          {summary && <p className="text-sm text-ink-muted line-clamp-2">{summary}</p>}
        </div>
        <span className="flex items-center px-3 text-navy" aria-hidden><Chevron className="w-5 h-5" /></span>
      </Link>
    );
  }

  return (
    <article className={`group bg-white border border-line rounded-[4px] overflow-hidden flex ${variant === "vertical" ? "flex-col" : "flex-row"} hover:shadow-md transition-shadow`}>
      {variant !== "compact" && !(variant === "horizontal" && imageEnd) && image}
      <div className="flex-1 p-4 lg:p-5 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge>{typeBadge(item.type, item.details, lang)}</CategoryBadge>
          {item.isExternal && <CategoryBadge tone="outline">{isArabic ? "مرجع من جهة أخرى" : "External reference"}</CategoryBadge>}
          {item.area && variant !== "compact" && !bare && (
            <span className="text-xs text-ink-muted">{labelFor(item.area, lang)}</span>
          )}
        </div>
        <h3 className={`font-bold text-navy leading-snug ${variant === "compact" ? "text-base" : "text-lg"}`}>
          <Link href={href} className="hover:underline">{title}</Link>
        </h3>
        {summary && <p className={`text-sm text-ink-muted ${variant === "compact" ? "line-clamp-2" : "line-clamp-3"}`}>{summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-ink-muted">
          <span className={bare ? "hidden" : "flex flex-wrap gap-x-1.5"}>
            {author && <span>{author}</span>}
            {author && dateText && <span aria-hidden>·</span>}
            {dateText && <span>{dateText}</span>}
          </span>
          <Link href={href} className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-sm font-semibold text-navy min-h-11">
            {ctaLabel(item.type, item.details, lang)} <Arrow className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </div>
      {variant === "compact" && image}
      {variant === "horizontal" && imageEnd && image}
    </article>
  );
}
