import { BookOpen, CalendarDays, FileText, Newspaper, Radar, type LucideIcon } from "lucide-react";
import type { ContentType } from "@/lib/cms-types";

const ICONS: Partial<Record<ContentType, LucideIcon>> = {
  article: FileText,
  study: BookOpen,
  publication: BookOpen,
  news: Newspaper,
  event: CalendarDays,
  observatory: Radar,
};

/** Branded stand-in for items that have no cover image; `className` sets its size/shape like the real image would. */
export function CoverPlaceholder({ type, className = "" }: { type: ContentType; className?: string }) {
  const Icon = ICONS[type] ?? FileText;
  return (
    <div
      aria-hidden
      data-testid="cover-placeholder"
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-navy to-[#2b4f73] text-white/80 ${className}`}
    >
      <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_14px)]" />
      <Icon className="relative h-1/3 max-h-14 w-auto min-h-6" strokeWidth={1.25} />
    </div>
  );
}
