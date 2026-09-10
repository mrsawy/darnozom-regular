import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  Landmark,
  BookOpen,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import CaseStudyCard from "@/components/case-study-card";
import { getCaseStudiesByIndustry } from "@/lib/case-studies";
import type { CaseStudy } from "@/lib/case-studies";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const SECTOR_INDUSTRY_MAP: Record<string, string[]> = {
  individuals: ["family-business-sme"],
  organizations: [
    "industrial-manufacturing",
    "financial-services",
    "family-business-sme",
  ],
  government: ["non-profit"],
  research: ["education-religious-sciences"],
};

function casesForSector(sectorId: string): CaseStudy[] {
  const industries = SECTOR_INDUSTRY_MAP[sectorId] ?? [];
  const seen = new Set<string>();
  const out: CaseStudy[] = [];
  for (const industrySlug of industries) {
    for (const cs of getCaseStudiesByIndustry(industrySlug)) {
      if (!seen.has(cs.id)) {
        seen.add(cs.id);
        out.push(cs);
      }
    }
  }
  return out;
}

const COPY = {
  ar: {
    label: "القطاعات",
    title: "نخدم مَن يصنع الأثر",
    sub: "نخدم مجموعة واسعة من القطاعات بحلول مصممة خصيصاً لتلبية احتياجات كل فئة.",
    sectionLabel: "القطاعات",
    casesEyebrow: "نماذج الأعمال — Case Studies",
    casesTitle: "حالات من قطاعاتنا",
    casesSub:
      "اطّلع على نماذج فعلية من عملنا في القطاعات التي نخدمها — موزّعة عبر مصر وألمانيا.",
    casesCta: "عرض جميع نماذج الأعمال",
    sectorCasesPrefix: "حالات في قطاع",
    noSectorCases: "لا توجد حالات منشورة لهذا القطاع حالياً.",
    items: [
      { id: "individuals", num: "01", title: "الأفراد", sub: "أفراد", icon: Users, desc: "استشارات شرعية وإدارية وحياتية، وبرامج تدريبية لتطوير مهارات القيادة الشخصية والمهنية." },
      { id: "organizations", num: "02", title: "المؤسسات والشركات", sub: "مؤسسات", icon: Building2, desc: "حلول شاملة في الحوكمة الشرعية والاستشارات الإدارية والتحول الرقمي وإدارة الأداء." },
      { id: "government", num: "03", title: "الحكومة والقطاع العام", sub: "حكومة", icon: Landmark, desc: "تطوير برامج وطنية للحوكمة ومؤشرات أداء قائمة على القيم ودعم اتخاذ القرار." },
      { id: "research", num: "04", title: "البحث والترجمة والنشر", sub: "بحث ونشر", icon: BookOpen, desc: "إنتاج وتطوير أبحاث إدارية وشرعية وكتب متخصصة وترجمة الدراسات العالمية." },
    ],
  },
  en: {
    label: "Sectors",
    title: "We Serve Those Who Make Impact",
    sub: "We serve a wide range of sectors with solutions tailored to meet the needs of each group.",
    sectionLabel: "Sectors",
    casesEyebrow: "Case Studies",
    casesTitle: "Cases from our sectors",
    casesSub:
      "Explore real examples of our work across the sectors we serve — spanning Egypt and Germany.",
    casesCta: "View all case studies",
    sectorCasesPrefix: "Cases in",
    noSectorCases: "No published cases for this sector yet.",
    items: [
      { id: "individuals", num: "01", title: "Individuals", sub: "Individuals", icon: Users, desc: "Sharia, managerial, and life consulting, with training programs for personal and professional leadership development." },
      { id: "organizations", num: "02", title: "Organizations & Corporates", sub: "Organizations", icon: Building2, desc: "Comprehensive solutions in Sharia governance, management consulting, digital transformation, and performance management." },
      { id: "government", num: "03", title: "Government & Public Sector", sub: "Government", icon: Landmark, desc: "Developing national governance programs, value-based KPIs, and decision-support frameworks." },
      { id: "research", num: "04", title: "Research, Translation & Publishing", sub: "Research & Publishing", icon: BookOpen, desc: "Producing managerial and Sharia research, specialized books, and translation of global studies." },
    ],
  },
};

export default function Sectors() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <section className="dark pt-40 pb-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#CFA63D_0%,transparent_60%)]" />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative">
          <div className="text-secondary text-xs font-bold tracking-[0.3em] uppercase mb-4">
            {t.sectionLabel}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {t.title}
          </h1>
          <p className="text-white/70 text-lg max-w-2xl leading-relaxed">{t.sub}</p>
        </div>
      </section>

      <section id="sectors" className="py-24 bg-background">
        <div className="container mx-auto px-6 md:px-12 max-w-[1100px]">
          <div className="space-y-0 divide-y divide-border">
            {t.items.map((sector, i) => (
              <motion.div
                key={i}
                id={sector.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex items-start gap-8 py-10 hover:px-4 transition-all scroll-mt-28"
              >
                <span className="text-secondary/30 font-black text-3xl shrink-0 group-hover:text-secondary transition-colors leading-none mt-1">
                  {sector.num}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <sector.icon className="w-5 h-5 text-secondary shrink-0" />
                    <div>
                      <span className="font-black text-primary text-2xl">{sector.title}</span>
                      <span className="text-muted-foreground text-xs ml-2 rtl:mr-2 rtl:ml-0 uppercase tracking-wider">· {sector.sub}</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-base leading-relaxed">{sector.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case studies from our sector portfolio */}
      <section className="py-24 bg-[#F4ECD7] border-t border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <div className="text-secondary text-xs font-bold tracking-[0.3em] uppercase mb-3">
                {t.casesEyebrow}
              </div>
              <h2 className="font-black text-primary text-3xl md:text-4xl leading-tight mb-3">
                {t.casesTitle}
              </h2>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
                {t.casesSub}
              </p>
            </div>
            <Link
              href="/case-studies"
              className="inline-flex items-center gap-2 text-secondary font-bold border-b-2 border-secondary pb-1 hover:gap-3 transition-all w-fit"
              data-testid="sectors-cta-all-cases"
            >
              {t.casesCta}
              <Arrow size={14} />
            </Link>
          </div>

          <div className="space-y-16">
            {t.items.map((sector) => {
              const sectorCases = casesForSector(sector.id);
              return (
                <div
                  key={sector.id}
                  data-testid={`sector-cases-block-${sector.id}`}
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <span className="text-secondary/40 font-black text-2xl shrink-0 leading-none">
                      {sector.num}
                    </span>
                    <sector.icon className="w-5 h-5 text-secondary shrink-0" />
                    <h3 className="font-black text-primary text-xl md:text-2xl">
                      {t.sectorCasesPrefix} {sector.title}
                    </h3>
                  </div>
                  {sectorCases.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sectorCases.map((cs, i) => (
                        <CaseStudyCard
                          key={cs.id}
                          caseStudy={cs}
                          index={i}
                        />
                      ))}
                    </div>
                  ) : (
                    <p
                      className="text-muted-foreground text-sm"
                      data-testid={`sector-cases-empty-${sector.id}`}
                    >
                      {t.noSectorCases}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
