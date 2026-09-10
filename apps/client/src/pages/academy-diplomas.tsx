import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, GraduationCap, Award, ArrowRight, Filter,
  Clock, BookOpen, CheckCircle2, X,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import {
  DIPLOMAS, PROGRAM_FILTERS, TAG_FILTERS, PROGRAM_META,
  type ProgramId,
} from "@/lib/academy-diplomas";
import { SiteFooter } from "@/components/site-footer";

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "الدبلومات",
    eyebrow: "كل الدبلومات",
    heroTitle: "دبلومات أكاديمية دار نظم",
    heroDesc: "تسعة عشر دبلومًا احترافيًا عبر أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي. استخدم المرشّحات للوصول إلى الدبلوم الأنسب لمسارك أو مؤسستك.",
    filterByProgram: "حسب البرنامج",
    filterByTag: "حسب التخصص",
    clearFilters: "مسح المرشّحات",
    noResults: "لا توجد دبلومات مطابقة. جرّب تخفيف المرشّحات.",
    showing: (n: number, total: number) => `عرض ${n} من ${total} دبلوم`,
    durationLabel: "المدة",
    coursesLabel: "المحاور",
    viewProgram: "تصفّح البرنامج",
    apply: "قدّم الآن",
    ctaTitle: "لا تعرف أي دبلوم يناسبك؟",
    ctaDesc: "احجز جلسة استشارية مع فريق الأكاديمية لاختيار الدبلوم الأمثل بناءً على دورك ومؤسستك.",
    ctaConsult: "احجز جلسة استشارية",
    ctaApply: "ابدأ التقديم",
    backToAcademy: "العودة إلى الأكاديمية",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Diplomas",
    eyebrow: "All Diplomas",
    heroTitle: "DarNozom Academy Diplomas",
    heroDesc: "Nineteen professional diplomas across Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation. Use the filters to find the diploma that fits your role or your organization.",
    filterByProgram: "By program",
    filterByTag: "By specialization",
    clearFilters: "Clear filters",
    noResults: "No diplomas match these filters. Try loosening them.",
    showing: (n: number, total: number) => `Showing ${n} of ${total} diplomas`,
    durationLabel: "Duration",
    coursesLabel: "Modules",
    viewProgram: "View program",
    apply: "Apply Now",
    ctaTitle: "Not sure which diploma fits?",
    ctaDesc: "Book a consultation with the Academy team to pick the right diploma for your role and your organization.",
    ctaConsult: "Book a Consultation",
    ctaApply: "Start your Application",
    backToAcademy: "Back to Academy",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyDiplomasPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";

  const [program, setProgram] = useState<ProgramId | "all">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return DIPLOMAS.filter((d) => {
      if (program !== "all" && d.program !== program) return false;
      if (activeTags.length > 0 && !activeTags.some((tg) => d.tags.includes(tg))) return false;
      return true;
    });
  }, [program, activeTags]);

  const toggleTag = (tagId: string) => {
    setActiveTags((prev) => (prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId]));
  };

  const clearAll = () => {
    setProgram("all");
    setActiveTags([]);
  };

  const hasFilters = program !== "all" || activeTags.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-36 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute -bottom-20 left-0 text-[14rem] font-black text-secondary/5 leading-none select-none pointer-events-none">D</div>
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-white/40 text-xs mb-10 uppercase tracking-widest"
          >
            <Link href="/" className="hover:text-secondary transition-colors">{t.breadcrumbHome}</Link>
            <span className="text-white/20">·</span>
            <Link href="/academy" className="hover:text-secondary transition-colors">{t.breadcrumbAcademy}</Link>
            <span className="text-white/20">·</span>
            <span className="text-secondary">{t.breadcrumbCurrent}</span>
          </motion.div>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 mb-8 bg-secondary/10 border border-secondary text-secondary px-4 py-2 font-black text-xs tracking-[0.2em] uppercase"
            >
              <GraduationCap size={14} />
              {t.eyebrow}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-black text-white leading-tight mb-6"
              style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}
            >
              {t.heroTitle}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/70 text-lg max-w-3xl leading-relaxed"
            >
              {t.heroDesc}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-10 bg-background border-b border-border sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <div className="container mx-auto px-6 md:px-12">
          {/* Program tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <Filter className="w-4 h-4 text-secondary me-2" strokeWidth={1.8} />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground me-2">{t.filterByProgram}</span>
            {PROGRAM_FILTERS.map((p) => {
              const isActive = program === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setProgram(p.id)}
                  className={`px-4 py-2 text-xs font-bold tracking-wider uppercase border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-primary border-border hover:border-secondary"
                  }`}
                  data-testid={`filter-program-${p.id}`}
                >
                  {p.label[language]}
                </button>
              );
            })}
          </div>

          {/* Tag chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground me-2">{t.filterByTag}</span>
            {TAG_FILTERS.map((tg) => {
              const isActive = activeTags.includes(tg.id);
              return (
                <button
                  key={tg.id}
                  onClick={() => toggleTag(tg.id)}
                  className={`px-3 py-1.5 text-[11px] font-semibold border rounded-full transition-all ${
                    isActive
                      ? "bg-secondary text-primary border-secondary"
                      : "bg-background text-muted-foreground border-border hover:border-secondary hover:text-primary"
                  }`}
                  data-testid={`filter-tag-${tg.id}`}
                >
                  {tg.label[language]}
                </button>
              );
            })}

            {hasFilters && (
              <button
                onClick={clearAll}
                className="ms-auto inline-flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                data-testid="clear-filters"
              >
                <X size={14} />
                {t.clearFilters}
              </button>
            )}
          </div>

          <div className="mt-5 text-xs text-muted-foreground" data-testid="results-count">
            {t.showing(filtered.length, DIPLOMAS.length)}
          </div>
        </div>
      </section>

      {/* Cards grid */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-6 md:px-12">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" strokeWidth={1.5} />
              <p>{t.noResults}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((d, i) => {
                const meta = PROGRAM_META[d.program];
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="bg-background border border-border hover:border-secondary/60 transition-all p-7 flex flex-col group"
                    data-testid={`diploma-card-${d.id}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${meta.accent}`}>
                        {meta.label[language]}
                      </span>
                      <GraduationCap className="w-6 h-6 text-secondary" strokeWidth={1.5} />
                    </div>

                    <h3 className="font-black text-primary text-lg mb-3 leading-snug min-h-[3.5rem]">
                      {d.name[language]}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={12} className="text-secondary" />
                        {d.duration[language]}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen size={12} className="text-secondary" />
                        {d.bullets.length} {t.coursesLabel}
                      </span>
                      {d.certification && (
                        <span className="inline-flex items-center gap-1.5 bg-secondary/10 text-secondary px-2 py-0.5 font-bold rounded-full">
                          <Award size={12} />
                          {d.certification[language]}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                      {d.bullets.slice(0, 4).map((b, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                          <CheckCircle2 size={14} className="text-secondary shrink-0 mt-0.5" />
                          <span>{b[language]}</span>
                        </li>
                      ))}
                      {d.bullets.length > 4 && (
                        <li className="text-[11px] text-muted-foreground/70 ms-6">
                          {isArabic ? `+ ${d.bullets.length - 4} محاور إضافية` : `+ ${d.bullets.length - 4} more modules`}
                        </li>
                      )}
                    </ul>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <Link
                        href={d.programHref}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-primary hover:text-secondary transition-colors"
                      >
                        <span>{t.viewProgram}</span>
                        <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                      </Link>
                      <Link
                        href={`/academy/register?type=diploma&diploma=${encodeURIComponent(d.id)}`}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase bg-secondary text-primary px-3 py-1.5 hover:bg-secondary/90 transition-colors"
                        data-testid={`apply-diploma-${d.id}`}
                      >
                        {t.apply}
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
          <h3 className="font-black text-white text-3xl mb-4">{t.ctaTitle}</h3>
          <p className="text-white/70 leading-relaxed mb-8 max-w-xl mx-auto">{t.ctaDesc}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
            >
              {t.ctaConsult}
            </Link>
            <Link
              href="/academy/register"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
            >
              {t.ctaApply}
              <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </section>

      {/* Back */}
      <section className="py-10 border-t border-border bg-[#F4ECD7]">
        <div className="container mx-auto px-6 md:px-12">
          <Link
            href="/academy"
            className="inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors font-semibold group"
            data-testid="link-back-to-academy"
          >
            <ChevronLeft size={18} className={`group-hover:-translate-x-1 transition-transform ${isArabic ? "" : "rotate-180"}`} />
            <span>{t.backToAcademy}</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
