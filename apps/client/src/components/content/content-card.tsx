import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { AREA_LABELS, contentPath, ctaLabel, formatDate, itemDate, pickLang, typeBadge } from "@/lib/cms-labels";
import { CategoryBadge } from "./category-badge";

type Variant = "vertical" | "horizontal" | "compact";

export function ContentCard({ item, variant = "vertical" }: { item: ContentItem; variant?: Variant }) {
  const { language: lang, isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const href = contentPath(item.type, item.slug);
  const title = pickLang(item, "title", lang);
  const summary = pickLang(item, "summary", lang);
  const author = pickLang(item, "author", lang);
  const date = itemDate(item);
  const dateText = item.type === "event" && !item.details?.startsAt
    ? (isArabic ? "الموعد يُعلن لاحقًا" : "Date to be announced")
    : formatDate(date, lang);

  const image = item.coverImageUrl ? (
    <img
      src={item.coverImageUrl}
      alt=""
      loading="lazy"
      className={
        variant === "vertical" ? "w-full aspect-[16/9] object-cover"
        : variant === "horizontal" ? "w-2/5 shrink-0 object-cover min-h-[160px]"
        : "w-28 h-20 shrink-0 object-cover"
      }
    />
  ) : null;

  return (
    <article className={`group bg-white border border-line rounded-[4px] overflow-hidden flex ${variant === "vertical" ? "flex-col" : "flex-row"} hover:shadow-md transition-shadow`}>
      {variant !== "compact" && image}
      <div className="flex-1 p-4 lg:p-5 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge>{typeBadge(item.type, item.details, lang)}</CategoryBadge>
          {item.isExternal && <CategoryBadge tone="outline">{isArabic ? "مرجع من جهة أخرى" : "External reference"}</CategoryBadge>}
          {item.area && variant !== "compact" && (
            <span className="text-xs text-ink-muted">{AREA_LABELS[item.area][lang]}</span>
          )}
        </div>
        <h3 className={`font-bold text-navy leading-snug ${variant === "compact" ? "text-base" : "text-lg"}`}>
          <Link href={href} className="hover:underline">{title}</Link>
        </h3>
        {summary && <p className={`text-sm text-ink-muted ${variant === "compact" ? "line-clamp-2" : "line-clamp-3"}`}>{summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-ink-muted">
          <span className="flex flex-wrap gap-x-1.5">
            {author && <span>{author}</span>}
            {author && dateText && <span aria-hidden>·</span>}
            {dateText && <span>{dateText}</span>}
          </span>
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-navy min-h-11">
            {ctaLabel(item.type, item.details, lang)} <Arrow className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </div>
      {variant === "compact" && image}
    </article>
  );
}
