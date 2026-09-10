import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies";
import { useLanguage } from "@/lib/language-context";

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  index?: number;
  showCta?: boolean;
}

export function CaseStudyCard({
  caseStudy,
  index = 0,
  showCta = true,
}: CaseStudyCardProps) {
  const { language, isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  const t = {
    cta: isArabic ? "اقرأ الحالة كاملة" : "Read the full case",
    challengeLabel: isArabic ? "التحدي" : "Challenge",
    impactLabel: isArabic ? "الأثر" : "Impact",
  };

  // Bilingual tag chip used in the card header — three chips per the
  // Industry · Practice · Geography taxonomy.
  const tagChip = (label: string, tone: "primary" | "muted") => (
    <span
      className={`text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 border ${
        tone === "primary"
          ? "bg-secondary/10 text-secondary border-secondary/40"
          : "bg-muted text-muted-foreground border-border"
      }`}
    >
      {label}
    </span>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      className="relative group bg-background border border-border hover:border-secondary/60 transition-colors flex flex-col"
      data-testid={`case-study-${caseStudy.id}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-secondary/40 group-hover:bg-secondary transition-colors" />

      <div className="p-7 md:p-8 flex flex-col flex-1">
        {/* Three-tag taxonomy header */}
        <div className="flex flex-wrap gap-2 mb-5">
          {tagChip(caseStudy.tags.industry[language], "primary")}
          {tagChip(caseStudy.tags.practice[language], "muted")}
          {tagChip(caseStudy.tags.geography[language], "muted")}
        </div>

        {/* Title */}
        <h3 className="font-black leading-tight text-primary text-xl md:text-2xl group-hover:text-secondary transition-colors mb-3">
          {caseStudy.title[language]}
        </h3>

        {/* Tagline */}
        <p className="text-sm md:text-base leading-relaxed text-muted-foreground mb-6">
          {caseStudy.tagline[language]}
        </p>

        {/* Lightweight challenge / impact preview */}
        <div className="space-y-4 mb-7 flex-1">
          {caseStudy.challenge[0] && (
            <div>
              <div className="text-secondary text-[10px] font-bold tracking-[0.22em] uppercase mb-1.5">
                {t.challengeLabel}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                {caseStudy.challenge[0][language]}
              </p>
            </div>
          )}
          {caseStudy.impact[0] && (
            <div>
              <div className="text-secondary text-[10px] font-bold tracking-[0.22em] uppercase mb-1.5">
                {t.impactLabel}
              </div>
              <p className="text-sm text-primary/90 font-medium leading-relaxed line-clamp-3">
                {caseStudy.impact[0][language]}
              </p>
            </div>
          )}
        </div>

        {/* CTA — link to dedicated case-study page */}
        {showCta && (
          <div className="pt-5 mt-auto border-t border-border">
            <Link
              href={`/case-studies/${caseStudy.id}`}
              className="inline-flex items-center gap-2 font-bold text-sm text-secondary border-b border-secondary pb-0.5 hover:gap-3 transition-all"
              data-testid={`case-study-cta-${caseStudy.id}`}
            >
              {t.cta}
              <Arrow size={14} />
            </Link>
          </div>
        )}
        {!showCta && (
          <div className="pt-5 mt-auto">
            <Link
              href={`/case-studies/${caseStudy.id}`}
              className="inline-flex items-center gap-2 font-bold text-sm text-secondary hover:gap-3 transition-all"
              data-testid={`case-study-link-${caseStudy.id}`}
            >
              {t.cta}
              <Arrow size={14} />
            </Link>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export default CaseStudyCard;
