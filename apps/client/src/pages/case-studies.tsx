import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  FileText,
  Phone,
  Compass,
  RotateCcw,
  Filter,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import CaseStudyCard from "@/components/case-study-card";
import {
  CASE_STUDIES,
  INDUSTRIES,
  PRACTICES,
  GEOGRAPHIES,
  type TaxonomyTag,
} from "@/lib/case-studies";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const ALL = "__ALL__";

export default function CaseStudies() {
  const { language, isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  const [industry, setIndustry] = useState<string>(ALL);
  const [practice, setPractice] = useState<string>(ALL);
  const [geography, setGeography] = useState<string>(ALL);

  const t = {
    eyebrow: isArabic ? "نماذج الأعمال" : "Case Studies",
    breadcrumbHome: isArabic ? "الرئيسية" : "Home",
    breadcrumbCurrent: isArabic ? "نماذج الأعمال" : "Case Studies",
    introTitle: isArabic
      ? "نماذج من أثرنا في تطوير المؤسسات"
      : "Examples of our impact in institutional development",
    introBody: isArabic
      ? "نقود التحول المؤسسي ونبني أنظمة تشغيل متكاملة تجمع بين الكفاءة الإدارية والامتثال الشرعي عبر قطاعات وأسواق متعددة."
      : "We lead organizational transformation and build integrated operating systems that combine managerial efficiency with Sharia compliance across multiple sectors and markets.",
    confidentialityTitle: isArabic ? "ملاحظة السرية" : "Confidentiality note",
    confidentiality: isArabic
      ? "نلتزم في عدد من المشاريع بالسرية المهنية، لذا تظل أسماء العملاء محجوبة وتُصاغ الحالات بأسلوب يحافظ على هويتهم."
      : "Several engagements are bound by professional confidentiality, so client names remain withheld and the cases are written in a manner that preserves their identity.",

    stats: [
      { value: "10", label: isArabic ? "مشاريع موثّقة" : "Documented engagements" },
      { value: "5", label: isArabic ? "دول" : "Countries" },
      { value: "6", label: isArabic ? "قطاعات" : "Industries" },
      { value: "7", label: isArabic ? "خطوط خدمة" : "Practice areas" },
    ],

    filtersTitle: isArabic ? "تصفية الحالات" : "Filter case studies",
    filtersHint: isArabic
      ? "اختر قطاعًا أو خط خدمة أو منطقة جغرافية لتضييق النتائج."
      : "Pick an industry, practice, or geography to narrow the results.",
    industryLabel: isArabic ? "القطاع" : "Industry",
    practiceLabel: isArabic ? "خط الخدمة" : "Practice",
    geographyLabel: isArabic ? "المنطقة الجغرافية" : "Geography",
    allOption: isArabic ? "الكل" : "All",
    reset: isArabic ? "إعادة تعيين" : "Reset",
    resultsCount: (n: number) =>
      isArabic
        ? n === 1
          ? "حالة واحدة مطابقة"
          : `${n} حالات مطابقة`
        : `${n} matching ${n === 1 ? "case" : "cases"}`,
    emptyTitle: isArabic ? "لا توجد حالات مطابقة" : "No matching cases",
    emptyBody: isArabic
      ? "جرّب تعديل الفلاتر أو إعادة تعيينها لعرض جميع الحالات."
      : "Try adjusting the filters or reset them to view all cases.",

    finalEyebrow: isArabic ? "ابدأ معنا" : "Get Started",
    finalHeading: isArabic
      ? "هل تواجه مؤسستك تحديًا مماثلًا؟"
      : "Is your organization facing a similar challenge?",
    finalBody: isArabic
      ? "أرسل طلبك الاستشاري وسيتواصل معك أحد مهندسي النظم لتحديد جلسة تعارف وتقدير المشروع."
      : "Submit a consulting request and one of our systems architects will reach out to schedule a discovery session and scope the engagement.",
    requestCta: isArabic ? "اطلب خدمة" : "Request a Service",
    contactCta: isArabic ? "تواصل معنا مباشرة" : "Contact Us Directly",
    copyright: isArabic ? "جميع الحقوق محفوظة" : "All rights reserved",
  };

  const filtered = useMemo(() => {
    return CASE_STUDIES.filter((c) => {
      if (industry !== ALL && c.tags.industry.slug !== industry) return false;
      if (practice !== ALL && c.tags.practice.slug !== practice) return false;
      if (geography !== ALL && c.tags.geography.slug !== geography) return false;
      return true;
    });
  }, [industry, practice, geography]);

  const isFiltered = industry !== ALL || practice !== ALL || geography !== ALL;

  const renderSelect = (
    id: string,
    label: string,
    options: TaxonomyTag[],
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-secondary text-[10px] font-bold tracking-[0.22em] uppercase"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border focus:border-secondary outline-none px-4 py-3 text-sm font-medium text-primary appearance-none cursor-pointer"
        data-testid={`case-filter-${id}`}
      >
        <option value={ALL}>{t.allOption}</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o[language]}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground font-sans"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-muted-foreground text-xs mb-10 uppercase tracking-widest"
          >
            <Link href="/" className="hover:text-primary transition-colors">
              {t.breadcrumbHome}
            </Link>
            <span className="text-border">·</span>
            <span className="text-primary">{t.breadcrumbCurrent}</span>
          </motion.div>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <Compass className="text-primary" size={18} />
              <div className="h-px w-10 bg-primary/40" />
              <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
                {t.eyebrow}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-medium text-foreground leading-[1.12] mb-6"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
                fontFamily: isArabic
                  ? "'IBM Plex Sans Arabic', sans-serif"
                  : "Georgia, 'Times New Roman', 'Noto Serif', serif",
              }}
            >
              {t.introTitle}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-muted-foreground text-lg max-w-3xl leading-relaxed mb-10"
            >
              {t.introBody}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-start gap-3 bg-white border border-border px-5 py-4 max-w-2xl"
              data-testid="confidentiality-note"
            >
              <Lock size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
                  {t.confidentialityTitle}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.confidentiality}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats ribbon */}
      <section className="bg-primary text-primary-foreground border-y border-secondary/20">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-secondary/15 rtl:divide-x-reverse">
            {t.stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="px-6 py-10 text-center"
              >
                <div
                  className="font-black text-secondary mb-2 tabular-nums leading-none"
                  style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}
                >
                  {s.value}
                </div>
                <div className="text-white/60 text-xs md:text-sm font-medium tracking-wide">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter bar + grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-3">
            <Filter size={16} className="text-secondary" />
            <h2 className="font-black text-primary text-xl md:text-2xl">
              {t.filtersTitle}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl">
            {t.filtersHint}
          </p>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            data-testid="case-filter-bar"
          >
            {renderSelect("industry", t.industryLabel, INDUSTRIES, industry, setIndustry)}
            {renderSelect("practice", t.practiceLabel, PRACTICES, practice, setPractice)}
            {renderSelect(
              "geography",
              t.geographyLabel,
              GEOGRAPHIES,
              geography,
              setGeography,
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 mb-10">
            <div
              className="text-sm text-muted-foreground"
              data-testid="case-results-count"
            >
              {t.resultsCount(filtered.length)}
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setIndustry(ALL);
                  setPractice(ALL);
                  setGeography(ALL);
                }}
                className="inline-flex items-center gap-2 text-sm font-bold text-secondary border-b border-secondary pb-0.5 hover:gap-3 transition-all"
                data-testid="case-filter-reset"
              >
                <RotateCcw size={14} />
                {t.reset}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div
              className="border border-dashed border-border p-10 text-center"
              data-testid="case-empty-state"
            >
              <h3 className="font-bold text-primary text-lg mb-2">{t.emptyTitle}</h3>
              <p className="text-muted-foreground text-sm">{t.emptyBody}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((cs, i) => (
                <CaseStudyCard key={cs.id} caseStudy={cs} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#F4ECD7] py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="text-primary/[0.04] font-black text-[18rem] leading-none">ن</span>
        </div>
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <span className="text-secondary text-xs font-bold tracking-[0.25em] uppercase border border-secondary/30 px-4 py-2">
                {t.finalEyebrow}
              </span>
            </div>
            <h2
              className="font-black text-primary mb-6 leading-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {t.finalHeading}
            </h2>
            <p className="text-primary/70 text-lg mb-10 leading-relaxed">{t.finalBody}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/service-registration"
                className="group inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-black text-base hover:bg-secondary/90 transition-all"
                data-testid="cta-request-proposal"
              >
                <FileText size={16} />
                {t.requestCta}
                <Arrow size={16} className="group-hover:translate-x-[-2px] transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 border border-primary/30 text-primary px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
                data-testid="cta-contact"
              >
                <Phone size={16} />
                {t.contactCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
