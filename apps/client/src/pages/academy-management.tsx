import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, CheckCircle2, ArrowRight,
  Compass, Layers, Crown, Award, BookOpen, GraduationCap, Dot,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

interface BiText { ar: string; en: string }
interface Diploma { name: BiText; bullets: BiText[] }
interface Level {
  number: string;
  name: BiText;
  icon: React.ElementType;
  focus: BiText;
  courses?: BiText[];
  diplomas?: Diploma[];
  domains?: BiText;
  outcome: BiText;
}

const LEVELS: Level[] = [
  {
    number: "01",
    name: { ar: "المستوى الأول — التأسيس", en: "Level 1 — Foundation" },
    icon: Compass,
    focus: {
      ar: "قيادة الذات، التواصل، وفهم الأعمال والوعي المؤسسي.",
      en: "Self-leadership, communication, business understanding, and organizational awareness.",
    },
    courses: [
      { ar: "قيادة الذات والإنتاجية الشخصية", en: "Self-Leadership & Productivity" },
      { ar: "مهارات التواصل المهني", en: "Communication Skills" },
      { ar: "أساسيات الأعمال", en: "Business Fundamentals" },
      { ar: "الوعي المؤسسي", en: "Organizational Awareness" },
      { ar: "ثقافة الأعمال (المالية ومؤشرات الأداء)", en: "Business Literacy (Finance & KPIs)" },
    ],
    outcome: {
      ar: "مهنيون منضبطون مستعدون لشغل أدوار تنظيمية فاعلة.",
      en: "Disciplined professionals ready for organizational roles.",
    },
  },
  {
    number: "02",
    name: { ar: "المستوى الثاني — الدبلومات الإدارية", en: "Level 2 — Management Diplomas" },
    icon: Layers,
    focus: {
      ar: "اثنا عشر دبلومًا احترافيًا تغطي المجالات الإدارية الأساسية: المشاريع · الموارد البشرية · المالية · التسويق · المبيعات · العمليات · ذكاء الأعمال · الابتكار · الاستراتيجية · تطوير الأعمال · التصميم التنظيمي · إدارة الأداء.",
      en: "Twelve professional diplomas covering the core management domains: Projects · HR · Finance · Marketing · Sales · Operations · BI · Innovation · Strategy · Business Development · Organizational Design · Performance Management.",
    },
    diplomas: [
      {
        name: { ar: "دبلوم إدارة المشاريع (مسار PMP)", en: "Diploma in Project Management (PMP Path)" },
        bullets: [
          { ar: "دورة حياة المشروع", en: "Project lifecycle" },
          { ar: "التخطيط والتنفيذ", en: "Planning & execution" },
          { ar: "إدارة المخاطر والجودة", en: "Risk & quality" },
          { ar: "المنهجيات الرشيقة (Agile)", en: "Agile methods" },
          { ar: "الإعداد لشهادة PMP", en: "PMP preparation" },
        ],
      },
      {
        name: { ar: "دبلوم إدارة الموارد البشرية (SHRM / ACHRM)", en: "Diploma in HR Management (SHRM / ACHRM)" },
        bullets: [
          { ar: "الاستقطاب والتوظيف", en: "Recruitment" },
          { ar: "إدارة الأداء", en: "Performance management" },
          { ar: "التدريب والتطوير", en: "Training & development" },
          { ar: "أنظمة التعويضات والمزايا", en: "Compensation systems" },
          { ar: "الإعداد لشهادتي SHRM / ACHRM", en: "SHRM / ACHRM preparation" },
        ],
      },
      {
        name: { ar: "دبلوم الإدارة المالية", en: "Diploma in Financial Management" },
        bullets: [
          { ar: "إعداد الموازنات", en: "Budgeting" },
          { ar: "ضبط التكاليف", en: "Cost control" },
          { ar: "التقارير المالية", en: "Financial reporting" },
          { ar: "المحاسبة الإدارية", en: "Managerial accounting" },
        ],
      },
      {
        name: { ar: "دبلوم التسويق والنمو", en: "Diploma in Marketing & Growth" },
        bullets: [
          { ar: "استراتيجية التسويق", en: "Marketing strategy" },
          { ar: "بناء العلامة التجارية", en: "Branding" },
          { ar: "تقسيم العملاء", en: "Customer segmentation" },
          { ar: "نظم النمو", en: "Growth systems" },
        ],
      },
      {
        name: { ar: "دبلوم المبيعات والإيرادات", en: "Diploma in Sales & Revenue" },
        bullets: [
          { ar: "نظم المبيعات", en: "Sales systems" },
          { ar: "إدارة علاقات العملاء (CRM)", en: "CRM" },
          { ar: "التفاوض", en: "Negotiation" },
          { ar: "تخطيط الإيرادات", en: "Revenue planning" },
        ],
      },
      {
        name: { ar: "دبلوم إدارة العمليات", en: "Diploma in Operations Management" },
        bullets: [
          { ar: "تحسين العمليات", en: "Process optimization" },
          { ar: "سلاسل الإمداد", en: "Supply chain" },
          { ar: "نظم الجودة", en: "Quality systems" },
          { ar: "استراتيجية العمليات", en: "Operations strategy" },
        ],
      },
      {
        name: { ar: "دبلوم ذكاء الأعمال", en: "Diploma in Business Intelligence" },
        bullets: [
          { ar: "نظم مؤشرات الأداء", en: "KPI systems" },
          { ar: "لوحات المعلومات", en: "Dashboards" },
          { ar: "التقارير المعتمدة على البيانات", en: "Data reporting" },
          { ar: "أساسيات التحليل", en: "Analytics basics" },
        ],
      },
      {
        name: { ar: "دبلوم الابتكار وإدارة المنتجات", en: "Diploma in Innovation & Product" },
        bullets: [
          { ar: "التفكير التصميمي", en: "Design thinking" },
          { ar: "دورة حياة المنتج", en: "Product lifecycle" },
          { ar: "تطوير المنتج الأولي (MVP)", en: "MVP development" },
          { ar: "نظم الابتكار", en: "Innovation systems" },
        ],
      },
      {
        name: { ar: "دبلوم الاستراتيجية والتخطيط المؤسسي", en: "Diploma in Strategy & Corporate Planning" },
        bullets: [
          { ar: "صياغة الرؤية والرسالة والخطة الاستراتيجية", en: "Vision, mission & strategic plan formulation" },
          { ar: "تصميم نموذج الأعمال والتحقق منه", en: "Business model design & validation" },
          { ar: "التحليل الاستراتيجي وقراءة البيئة التنافسية", en: "Strategic analysis & competitive environment scanning" },
          { ar: "ترجمة الاستراتيجية إلى مبادرات قابلة للتنفيذ", en: "Translating strategy into actionable initiatives" },
        ],
      },
      {
        name: { ar: "دبلوم تطوير الأعمال والشراكات", en: "Diploma in Business Development & Partnerships" },
        bullets: [
          { ar: "خطط دخول الأسواق والتوسع الجغرافي", en: "Market-entry & geographic expansion playbooks" },
          { ar: "أُطُر الشراكات والتحالفات الاستراتيجية", en: "Strategic partnership & alliance frameworks" },
          { ar: "حوكمة الفرص وقمع الصفقات (Deal Pipeline)", en: "Opportunity governance & deal pipeline" },
          { ar: "نماذج التطوير المؤسسي والاستحواذ", en: "Corporate development & acquisition models" },
        ],
      },
      {
        name: { ar: "دبلوم التصميم التنظيمي", en: "Diploma in Organizational Design" },
        bullets: [
          { ar: "هندسة الهيكل التنظيمي وحدود الإدارات", en: "Org structure engineering & departmental boundaries" },
          { ar: "تصميم نموذج التشغيل (Operating Model)", en: "Operating model design" },
          { ar: "توصيفات وظيفية ومسارات مهنية", en: "Job descriptions & career paths" },
          { ar: "مصفوفات الصلاحيات والمسؤوليات (RACI)", en: "Authority & responsibility matrices (RACI)" },
        ],
      },
      {
        name: { ar: "دبلوم إدارة الأداء (OKR/BSC)", en: "Diploma in Performance Management (OKR/BSC)" },
        bullets: [
          { ar: "تصميم نظام الأداء المؤسسي", en: "Designing the institutional performance system" },
          { ar: "بطاقة الأداء المتوازن (BSC)", en: "Balanced Scorecard (BSC)" },
          { ar: "الأهداف والنتائج الرئيسية (OKRs)", en: "Objectives & Key Results (OKRs)" },
          { ar: "حوكمة المراجعات الفصلية ومتابعة الأداء", en: "Quarterly review governance & performance tracking" },
        ],
      },
    ],
    domains: {
      ar: "الشركات · المنظمات غير الربحية · القطاع الحكومي",
      en: "Corporate · NGO · Government",
    },
    outcome: {
      ar: "مديرون مؤهلون قادرون على الأداء داخل المنظمات الحقيقية.",
      en: "Capable managers in real organizations.",
    },
  },
  {
    number: "03",
    name: { ar: "المستوى الثالث — القيادة التنفيذية", en: "Level 3 — Executive" },
    icon: Crown,
    focus: {
      ar: "القيادة الاستراتيجية، والتصميم المؤسسي، والتحول التنظيمي.",
      en: "Strategic leadership, organizational design, and transformation.",
    },
    courses: [
      { ar: "القيادة التنفيذية", en: "Executive Leadership" },
      { ar: "الاستراتيجية المؤسسية", en: "Corporate Strategy" },
      { ar: "التصميم المؤسسي", en: "Organizational Design" },
      { ar: "اتخاذ القرارات المالية", en: "Financial Decision-Making" },
      { ar: "الحوكمة وإدارة المخاطر", en: "Governance & Risk" },
    ],
    domains: {
      ar: "الشركات · الأثر الاجتماعي · القطاع العام",
      en: "Corporate · Social Impact · Public Sector",
    },
    outcome: {
      ar: "قيادات تنفيذية قادرة على بناء المنظمات وتوسيع نطاقها.",
      en: "Executive leaders who build and scale organizations.",
    },
  },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "الإدارة المهنية",
    eyebrow: "تطوير القيادة والإدارة",
    title: "أكاديمية دار نظم — برامج تطوير القيادة والإدارة",
    intro:
      "تطوّر أكاديمية دار نظم المهنيين والمديرين والقيادات التنفيذية عبر نظام تعليمي متكامل في القيادة والإدارة والفكر المؤسسي. نُعِدّ الكفاءات للشركات والمنظمات غير الربحية والمؤسسات الحكومية وفق منهج موحّد.",
    overviewHeading: "نظرة عامة",
    overview:
      "مسار الإدارة المهنية يقدّم نظامًا تعليميًا متدرّجًا يبني المهنيين والمديرين والقيادات التنفيذية في القيادة والإدارة والفكر المؤسسي. يعتمد المسار على منهج موحّد قابل للتطبيق في الشركات والمنظمات غير الربحية والقطاع الحكومي، مع تدرّج واضح من التأسيس إلى القيادة التنفيذية.",
    outcomesHeading: "مخرجات المسار",
    outcomes: [
      "مهنيون منضبطون قادرون على الأداء داخل بيئات العمل المؤسسية.",
      "مديرون قادرون على قيادة الفرق وإدارة العمليات والمشاريع بكفاءة.",
      "قيادات تنفيذية قادرة على التصميم المؤسسي وقيادة التحول وتوسيع المنظمات.",
      "خرّيجون يجمعون بين الكفاءة الإدارية والوعي المؤسسي عبر القطاعات الثلاثة.",
    ],
    levelsHeading: "مستويات البرنامج",
    levelsSubheading: "ثلاثة مستويات متدرجة تأخذك من التأسيس إلى القيادة التنفيذية.",
    focusLabel: "المحور",
    pillarsLabel: "المجالات",
    coursesLabel: "الكورسات",
    diplomasLabel: "الدبلومات",
    domainsLabel: "القطاعات",
    outcomeLabel: "المخرَج",
    ctaApply: "تقديم",
    ctaTitle: "تواصل مع الأكاديمية",
    ctaDesc: "للاستفسار عن خطة الالتحاق ببرامج الإدارة المهنية والرسوم وجداول الدفعات.",
    ctaWhatsapp: "تواصل عبر واتساب",
    ctaEmail: "راسلنا بالبريد",
    backToAcademy: "العودة إلى الأكاديمية",
    whatsappLink: "https://wa.me/201022044240?text=أرغب في الاستفسار عن برامج الإدارة المهنية في أكاديمية دار نظم",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Professional Management",
    eyebrow: "Leadership & Management Development",
    title: "Dar Nozom Academy — Leadership & Management Development Programs",
    intro:
      "Dar Nozom Academy develops professionals, managers, and executive leaders through a structured learning system in leadership, management, and organizational thinking. We prepare talent for businesses, NGOs, and public institutions using one unified approach.",
    overviewHeading: "Overview",
    overview:
      "The Professional Management track offers a structured learning system that builds professionals, managers, and executive leaders in leadership, management, and organizational thinking. The track follows one unified approach applicable to corporates, NGOs, and the public sector, with a clear ladder from foundation to executive leadership.",
    outcomesHeading: "Track Outcomes",
    outcomes: [
      "Disciplined professionals ready to perform inside real organizational settings.",
      "Managers capable of leading teams and running operations and projects efficiently.",
      "Executive leaders capable of organizational design, leading transformation, and scaling institutions.",
      "Graduates combining managerial competence with institutional awareness across the three sectors.",
    ],
    levelsHeading: "Program Levels",
    levelsSubheading: "Three structured levels taking you from Foundation to Executive leadership.",
    focusLabel: "Focus",
    pillarsLabel: "Pillars",
    coursesLabel: "Courses",
    diplomasLabel: "Diplomas",
    domainsLabel: "Domains",
    outcomeLabel: "Outcome",
    ctaApply: "Apply",
    ctaTitle: "Contact the Academy",
    ctaDesc: "Inquire about admission, fees, and cohort schedules for the Professional Management programs.",
    ctaWhatsapp: "Contact via WhatsApp",
    ctaEmail: "Email Us",
    backToAcademy: "Back to Academy",
    whatsappLink: "https://wa.me/201022044240?text=I'd like to learn more about the Professional Management programs at DarNozom Academy",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyManagementPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-36 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

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
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.eyebrow}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-black text-white leading-tight mb-8"
              style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}
            >
              {t.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/70 text-lg max-w-3xl leading-relaxed"
            >
              {t.intro}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-white/60 text-sm tracking-wide"
            >
              {LEVELS.map((lvl, i) => (
                <div key={lvl.number} className="flex items-center gap-3">
                  <span className="text-secondary font-black">{lvl.number}</span>
                  <span className="font-semibold text-white">{lvl.name[language]}</span>
                  {i < LEVELS.length - 1 && <span className="text-white/20">→</span>}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "نظرة عامة" : "Overview"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-6" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {t.overviewHeading}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">{t.overview}</p>
        </div>
      </section>

      {/* Levels */}
      <section className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "مستويات البرنامج" : "Program Levels"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {t.levelsHeading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.levelsSubheading}</p>
          </div>

          <div className="space-y-8">
            {LEVELS.map((lvl, i) => (
              <motion.article
                key={lvl.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background border border-border hover:border-secondary/50 transition-colors"
                data-testid={`level-${lvl.number}`}
              >
                <div className="grid md:grid-cols-[220px_1fr]">
                  {/* Number rail */}
                  <div className="bg-primary text-primary-foreground p-8 flex flex-col items-start justify-between gap-6 md:min-h-[280px]">
                    <div>
                      <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">{isArabic ? `المستوى ${lvl.number}` : `Level ${lvl.number}`}</div>
                      <div className="text-white font-black leading-none" style={{ fontSize: "clamp(3rem, 4vw, 4.5rem)" }}>
                        {lvl.number}
                      </div>
                    </div>
                    <lvl.icon className="w-10 h-10 text-secondary" strokeWidth={1.5} />
                  </div>

                  {/* Body */}
                  <div className="p-8 md:p-10">
                    <h3 className="font-black text-primary leading-snug mb-6" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
                      {lvl.name[language]}
                    </h3>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">{t.focusLabel}</div>
                        <p className="text-primary font-semibold leading-relaxed">{lvl.focus[language]}</p>
                      </div>

                      {lvl.domains && (
                        <div>
                          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">{t.domainsLabel}</div>
                          <p className="text-primary font-semibold leading-relaxed">{lvl.domains[language]}</p>
                        </div>
                      )}
                    </div>

                    {lvl.courses && (
                      <div className="mt-6">
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-3">{t.coursesLabel}</div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {lvl.courses.map((c, j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between gap-3 bg-muted/40 border border-border px-4 py-2.5 text-sm font-semibold text-primary"
                              data-testid={`mgmt-course-${lvl.number}-${j}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <BookOpen className="w-3 h-3 text-secondary shrink-0" />
                                <span className="truncate">{c[language]}</span>
                              </span>
                              <Link
                                href={`/academy/register?program=management&course=${encodeURIComponent(c.en)}`}
                                data-testid={`apply-mgmt-course-${lvl.number}-${j}`}
                                className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-secondary hover:text-secondary/80 shrink-0"
                              >
                                {t.ctaApply}
                                <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {lvl.diplomas && (
                      <div className="mt-6">
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-3">{t.diplomasLabel}</div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {lvl.diplomas.map((d, j) => (
                            <div
                              key={j}
                              className="bg-muted/30 border border-border p-5 flex flex-col"
                              data-testid={`mgmt-diploma-${lvl.number}-${j}`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <GraduationCap className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                                <h4 className="font-black text-primary text-base leading-snug">{d.name[language]}</h4>
                              </div>
                              <ul className="space-y-1.5 ms-8 mt-auto">
                                {d.bullets.map((b, k) => (
                                  <li key={k} className="flex items-start gap-2 text-sm text-primary leading-relaxed">
                                    <Dot className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                    <span>{b[language]}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 pt-3 border-t border-border/60 ms-8">
                                <Link
                                  href={`/academy/register?program=management&diploma=${encodeURIComponent(d.name.en)}`}
                                  data-testid={`apply-mgmt-diploma-${lvl.number}-${j}`}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-secondary hover:text-secondary/80"
                                >
                                  {t.ctaApply}
                                  <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-border bg-secondary/5 -mx-8 -mb-8 md:-mx-10 md:-mb-10 px-8 md:px-10 py-5">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">{t.outcomeLabel}</div>
                      <p className="text-primary font-bold leading-relaxed">{lvl.outcome[language]}</p>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المخرجات" : "Outcomes"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-12" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {t.outcomesHeading}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {t.outcomes.map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 bg-muted/30 border border-border p-5"
              >
                <CheckCircle2 size={20} className="text-secondary shrink-0 mt-0.5" />
                <div className="text-primary leading-relaxed font-semibold">{o}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Pathways */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "مسارات ذات صلة" : "Related Pathways"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-3" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
              {isArabic ? "اربط هذا المسار بالأكاديمية والاستشارات" : "Connect this track to the Academy & Consulting"}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {isArabic
                ? "بعد إتمام الدبلومات الإدارية، يمكنك التتويج بالدبلوم المتكامل في الأكاديمية، أو تطبيق ما تعلمته عبر خدمة الاستشارات الإدارية والتنظيمية."
                : "After completing the management diplomas, cap your journey with the Academy's Integrated Leadership Diploma — or apply what you've learned through the matching Organizational & Management consulting service."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Link
              href="/academy#integrated-diploma"
              data-testid="cross-link-integrated-diploma"
              className="group bg-muted/30 border border-border p-6 hover:border-secondary/60 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <Crown className="w-7 h-7 text-secondary" strokeWidth={1.5} />
                <span className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase">{isArabic ? "الدبلوم الرائد" : "Capstone Diploma"}</span>
              </div>
              <h3 className="font-black text-primary text-lg mb-2 leading-snug">
                {isArabic ? "دبلوم القيادة المتكاملة" : "Integrated Leadership Diploma"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isArabic
                  ? "الشهادة الرائدة لأكاديمية دار نظم — تجمع أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي في تجربة قيادية واحدة."
                  : "DarNozom Academy's flagship credential — fusing Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation into one leadership experience."}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-secondary group-hover:text-secondary/80">
                {isArabic ? "استكشف الدبلوم" : "Explore the Diploma"}
                <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
              </span>
            </Link>

            <Link
              href="/services/consulting#organizational-management"
              data-testid="cross-link-consulting-service"
              className="group bg-muted/30 border border-border p-6 hover:border-secondary/60 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <Layers className="w-7 h-7 text-secondary" strokeWidth={1.5} />
                <span className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase">{isArabic ? "خدمة استشارية" : "Consulting Service"}</span>
              </div>
              <h3 className="font-black text-primary text-lg mb-2 leading-snug">
                {isArabic ? "استشارات الإدارة والتنظيم" : "Organizational & Management Consulting"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isArabic
                  ? "نُعيد تصميم الطريقة التي تُدار بها مؤسستك — استراتيجيةً، وهيكلًا، وأداءً، وعمليات — لتنتقل من إدارة الجهود إلى تشغيل نظام إداري متكامل."
                  : "We redesign how your organization is run — strategy, structure, performance, and operations — moving it from managing effort to operating a complete management system."}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-secondary group-hover:text-secondary/80">
                {isArabic ? "تعرّف على الخدمة" : "Explore the Service"}
                <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
          <Award className="w-10 h-10 text-secondary mx-auto mb-4" />
          <h3 className="font-black text-white text-3xl mb-4">{t.ctaTitle}</h3>
          <p className="text-white/70 leading-relaxed mb-8 max-w-xl mx-auto">{t.ctaDesc}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/academy/apply"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
            >
              {language === "ar" ? "قدّم الآن" : "Apply Now"}
            </Link>
            <a
              href={t.whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t.ctaWhatsapp}
            </a>
            <a
              href="mailto:info@darnozom.com"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t.ctaEmail}
            </a>
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
