import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { contentPath, ctaLabel, pickLang, typeBadge } from "@/lib/cms-labels";
import { CategoryBadge } from "@/components/content/category-badge";
import { ContentCard } from "@/components/content/content-card";
import { SectionHeader } from "@/components/content/section-header";

export function ObservatorySection({ lead, others }: { lead: ContentItem | null; others: ContentItem[] }) {
  const { language: lang, isArabic } = useLanguage();
  if (!lead) return null;
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-6 mt-14">
      <SectionHeader title={t("المرصد", "Observatory")} subtitle={t("رصد وتحليل لقضايا الشأن العام والإنتاج الفكري والبحثي", "Monitoring and analysis of public affairs and new research")} href="/observatory" linkLabel={t("تابع المرصد", "Follow the Observatory")} />
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <article className="relative rounded-[4px] overflow-hidden bg-navy text-white min-h-[320px]">
          {lead.coverImageUrl && <img src={lead.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
          <div className="relative p-6 lg:p-8 flex flex-col h-full justify-end bg-gradient-to-t from-navy-deep/90 via-navy/50 to-transparent">
            <CategoryBadge>{typeBadge(lead.type, lead.details, lang)}</CategoryBadge>
            <h3 className="mt-3 text-2xl lg:text-[28px] font-bold leading-snug">{pickLang(lead, "title", lang)}</h3>
            <p className="mt-2 text-white/85 max-w-xl">{pickLang(lead, "summary", lang)}</p>
            <Link href={contentPath(lead.type, lead.slug)} className="mt-4 inline-flex items-center gap-2 min-h-11 font-semibold">
              {ctaLabel(lead.type, lead.details, lang)} <Arrow className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </article>
        <div className="grid gap-4">{others.map((o) => <ContentCard key={o.id} item={o} variant="compact" />)}</div>
      </div>
    </section>
  );
}
