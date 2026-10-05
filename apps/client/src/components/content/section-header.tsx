import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function SectionHeader({ title, subtitle, href, linkLabel, as = "h2" }: {
  title: string; subtitle?: string; href?: string; linkLabel?: string; as?: "h1" | "h2";
}) {
  const { isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const H = as;
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <H className="text-[25px] lg:text-[30px] font-bold text-navy leading-tight">{title}</H>
        {subtitle && <p className="text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="shrink-0 inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-navy hover:text-gold">
          {linkLabel} <Arrow className="w-4 h-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
