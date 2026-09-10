import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, BookOpen, ArrowRight, Filter, X, Compass, Crown, Layers,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import {
  COURSES, COURSE_PROGRAM_FILTERS, COURSE_LEVEL_FILTERS,
  type CourseLevel,
} from "@/lib/academy-courses";
import { PROGRAM_META, type ProgramId } from "@/lib/academy-diplomas";
import { SiteFooter } from "@/components/site-footer";

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "كل الكورسات",
    eyebrow: "كل الكورسات",
    heroTitle: "كورسات أكاديمية دار نظم",
    heroDesc: "أربعة وأربعون كورسًا فرديًا عبر برامج أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي — على ثلاثة مستويات: التأسيس · الإدارة · القيادة التنفيذية. اختر الكورس الأنسب لمسارك.",
    filterByProgram: "حسب البرنامج",
    filterByLevel: "حسب المستوى",
    clearFilters: "مسح المرشّحات",
    noResults: "لا توجد كورسات مطابقة. جرّب تخفيف المرشّحات.",
    showing: (n: number, total: number) => `عرض ${n} من ${total} كورس`,
    levelLabel: "المستوى",
    apply: "قدّم على الكورس",
    viewProgram: "تصفّح البرنامج",
    ctaTitle: "تريد التسجيل في أكثر من كورس؟",
    ctaDesc: "احجز جلسة استشارية لاختيار الكورسات الأنسب لمسارك المهني، أو قدّم مباشرة عبر صفحة التقديم.",
    ctaConsult: "احجز جلسة استشارية",
    ctaApply: "ابدأ التقديم",
    backToAcademy: "العودة إلى الأكاديمية",
    copyright: "جميع الحقوق محفوظة",
    levelShort: (l: CourseLevel) => (l === 1 ? "م.١ — التأسيس" : l === 2 ? "م.٢ — الإدارة" : "م.٣ — تنفيذي"),
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "All Courses",
    eyebrow: "All Courses",
    heroTitle: "DarNozom Academy Courses",
    heroDesc: "Forty-four individual courses across the Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation programs — across three levels: Foundation · Management · Executive. Pick the course that fits your path.",
    filterByProgram: "By program",
    filterByLevel: "By level",
    clearFilters: "Clear filters",
    noResults: "No courses match these filters. Try loosening them.",
    showing: (n: number, total: number) => `Showing ${n} of ${total} courses`,
    levelLabel: "Level",
    apply: "Apply for course",
    viewProgram: "View program",
    ctaTitle: "Want to enroll in more than one course?",
    ctaDesc: "Book a consultation to pick the best mix for your career, or apply directly through the application page.",
    ctaConsult: "Book a Consultation",
    ctaApply: "Start your Application",
    backToAcademy: "Back to Academy",
    copyright: "All rights reserved",
    levelShort: (l: CourseLevel) => (l === 1 ? "L1 — Foundation" : l === 2 ? "L2 — Management" : "L3 — Executive"),
  },
} as const;

export default function AcademyCoursesPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";

  const search = useSearch();
  const initial = useMemo(() => {
    const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const programParam = qs.get("program");
    const levelParam = (qs.get("level") || "").toLowerCase();
    const levelMap: Record<string, CourseLevel> = {
      foundation: 1, "1": 1,
      management: 2, "2": 2,
      executive: 3, "3": 3,
    };
    const validProgram: ProgramId | "all" =
      programParam === "islamic" || programParam === "management" || programParam === "digital"
        ? programParam : "all";
    return {
      program: validProgram,
      level: levelMap[levelParam] ?? "all",
    } as { program: ProgramId | "all"; level: CourseLevel | "all" };
  }, [search]);

  const [program, setProgram] = useState<ProgramId | "all">(initial.program);
  const [level, setLevel] = useState<CourseLevel | "all">(initial.level);

  useEffect(() => {
    setProgram(initial.program);
    setLevel(initial.level);
  }, [initial]);

  const filtered = useMemo(() => {
    return COURSES.filter((c) => {
      if (program !== "all" && c.program !== program) return false;
      if (level !== "all" && c.level !== level) return false;
      return true;
    });
  }, [program, level]);

  const hasActive = program !== "all" || level !== "all";
  const clearAll = () => {
    setProgram("all");
    setLevel("all");
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteNav />

      {/* Hero */}
      <section className="bg-primary text-primary-foreground border-b border-primary">
        <div className="container mx-auto px-6 md:px-12 pt-32 pb-20">
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-8" aria-label="breadcrumb">
            <Link href="/" className="hover:text-secondary">{t.breadcrumbHome}</Link>
            <ChevronLeft className={`w-3 h-3 ${isArabic ? "" : "rotate-180"}`} />
            <Link href="/academy" className="hover:text-secondary">{t.breadcrumbAcademy}</Link>
            <ChevronLeft className={`w-3 h-3 ${isArabic ? "" : "rotate-180"}`} />
            <span className="text-secondary">{t.breadcrumbCurrent}</span>
          </nav>

          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-5 h-5 text-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.eyebrow}</span>
          </div>

          <h1 className="font-black leading-[1.05] mb-6 max-w-4xl" style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}>
            {t.heroTitle}
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-3xl">
            {t.heroDesc}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-10 bg-muted/20 border-b border-border sticky top-16 z-30 backdrop-blur-sm">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-secondary" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary">{t.filterByProgram}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COURSE_PROGRAM_FILTERS.map((f) => {
                  const active = program === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setProgram(f.id)}
                      data-testid={`filter-program-${f.id}`}
                      className={`px-4 py-2 text-xs font-bold tracking-wide uppercase border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-primary border-border hover:border-secondary"
                      }`}
                    >
                      {f.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-3.5 h-3.5 text-secondary" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary">{t.filterByLevel}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COURSE_LEVEL_FILTERS.map((f) => {
                  const active = level === f.id;
                  return (
                    <button
                      key={String(f.id)}
                      type="button"
                      onClick={() => setLevel(f.id)}
                      data-testid={`filter-level-${f.id}`}
                      className={`px-4 py-2 text-xs font-bold tracking-wide uppercase border transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-primary border-border hover:border-secondary"
                      }`}
                    >
                      {f.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground" data-testid="results-count">
                {t.showing(filtered.length, COURSES.length)}
              </span>
              {hasActive && (
                <button
                  type="button"
                  onClick={clearAll}
                  data-testid="clear-filters"
                  className="inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-primary hover:text-secondary transition-colors"
                >
                  <X className="w-3 h-3" />
                  {t.clearFilters}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 md:px-12">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground" data-testid="empty-state">
              {t.noResults}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c, i) => {
                const meta = PROGRAM_META[c.program];
                const Icon = c.level === 1 ? Compass : c.level === 2 ? Layers : Crown;
                return (
                  <motion.article
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="bg-background border border-border hover:border-secondary transition-colors p-6 flex flex-col"
                    data-testid={`course-card-${c.id}`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary">
                        {meta.label[language]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                        {t.levelShort(c.level)}
                      </span>
                    </div>

                    <div className="flex items-start gap-3 mb-6 flex-1">
                      <Icon className="w-5 h-5 text-secondary shrink-0 mt-0.5" strokeWidth={1.75} />
                      <h3 className="font-black text-primary text-base leading-snug">{c.name[language]}</h3>
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border">
                      <Link
                        href={`/academy/register?course=${encodeURIComponent(c.id)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-wide uppercase bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-1 justify-center"
                        data-testid={`apply-${c.id}`}
                      >
                        {t.apply}
                        <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                      </Link>
                      <Link
                        href={c.programHref}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-wide uppercase border border-border text-primary hover:border-secondary hover:text-secondary transition-colors"
                        data-testid={`view-program-${c.id}`}
                      >
                        {t.viewProgram}
                      </Link>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-[#F4ECD7] text-primary">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
          <h2 className="font-black mb-4 leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {t.ctaTitle}
          </h2>
          <p className="text-primary/70 text-lg leading-relaxed mb-10">{t.ctaDesc}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-primary font-bold tracking-widest uppercase text-xs hover:bg-secondary/90 transition-colors"
              data-testid="cta-consult"
            >
              {t.ctaConsult}
            </Link>
            <Link
              href="/academy/apply"
              className="inline-flex items-center gap-2 px-6 py-3 border border-primary/30 text-primary font-bold tracking-widest uppercase text-xs hover:border-secondary hover:text-secondary transition-colors"
              data-testid="cta-apply"
            >
              {t.ctaApply}
              <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
            </Link>
          </div>
          <div className="mt-10">
            <Link href="/academy" className="text-secondary text-xs font-bold tracking-widest uppercase hover:text-secondary/80">
              {t.backToAcademy}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
