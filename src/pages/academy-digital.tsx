import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, Cpu, ArrowRight,
  CheckCircle2, Compass, Layers, Crown, Cog, GraduationCap, Dot,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { PROGRAMS } from "@/lib/site-content";
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
  outcome: BiText;
}

const LEVELS: Level[] = [
  {
    number: "01",
    name: { ar: "المستوى الأول — التأسيس الرقمي", en: "Level 1 — Digital Foundation" },
    icon: Compass,
    focus: {
      ar: "بناء الثقافة الرقمية الأساسية وفهم البيانات والذكاء الاصطناعي وأدوات الإنتاجية الحديثة.",
      en: "Build foundational digital fluency, data awareness, AI introduction, and modern productivity tools.",
    },
    courses: [
      { ar: "الثقافة الرقمية", en: "Digital Literacy" },
      { ar: "أدوات بيئة العمل الحديثة", en: "Workplace Tools" },
      { ar: "مدخل إلى الذكاء الاصطناعي", en: "Introduction to AI" },
      { ar: "الوعي بالبيانات", en: "Data Awareness" },
      { ar: "أساسيات الأمن السيبراني", en: "Cybersecurity Basics" },
    ],
    outcome: {
      ar: "مهنيون يجيدون استخدام الأدوات الرقمية والبيانات في عملهم اليومي.",
      en: "Professionals fluent in using digital tools and data in their daily work.",
    },
  },
  {
    number: "02",
    name: { ar: "المستوى الثاني — الدبلومات الإدارية", en: "Level 2 — Management Diplomas" },
    icon: Layers,
    focus: {
      ar: "ثمانية دبلومات احترافية تغطي إدارة التحول، الذكاء الاصطناعي للأعمال، الأمن السيبراني، نظم المؤسسات (ERP)، ذكاء الأعمال، التسويق الرقمي، حوكمة البيانات، وأتمتة العمليات.",
      en: "Eight professional diplomas covering transformation management, AI for business, cybersecurity, ERP/business systems, BI & data, digital marketing, data governance, and process automation.",
    },
    diplomas: [
      {
        name: { ar: "دبلوم إدارة التحول الرقمي", en: "Diploma in Digital Transformation Management" },
        bullets: [
          { ar: "الاستراتيجية الرقمية", en: "Digital strategy" },
          { ar: "أُطُر التحول المؤسسي", en: "Transformation frameworks" },
          { ar: "إدارة التغيير", en: "Change management" },
          { ar: "نضج التحول الرقمي", en: "Digital maturity" },
        ],
      },
      {
        name: { ar: "دبلوم الذكاء الاصطناعي للأعمال", en: "Diploma in AI for Business" },
        bullets: [
          { ar: "أساسيات الذكاء الاصطناعي", en: "AI fundamentals" },
          { ar: "حالات استخدام الذكاء الاصطناعي في الأعمال", en: "Business AI use cases" },
          { ar: "نظم الأتمتة", en: "Automation systems" },
          { ar: "الذكاء الاصطناعي الأخلاقي", en: "Ethical AI" },
        ],
      },
      {
        name: { ar: "دبلوم الأمن السيبراني", en: "Diploma in Cybersecurity" },
        bullets: [
          { ar: "أساسيات الأمن السيبراني", en: "Cybersecurity fundamentals" },
          { ar: "إدارة المخاطر", en: "Risk management" },
          { ar: "حماية البيانات", en: "Data protection" },
          { ar: "نظم الأمن المؤسسي", en: "Security systems" },
        ],
      },
      {
        name: { ar: "دبلوم نظم تخطيط الموارد المؤسسية ونظم الأعمال (ERP)", en: "Diploma in ERP & Business Systems" },
        bullets: [
          { ar: "نظم تخطيط الموارد المؤسسية (ERP)", en: "ERP systems" },
          { ar: "نظم إدارة علاقات العملاء (CRM)", en: "CRM systems" },
          { ar: "أتمتة سير العمل", en: "Workflow automation" },
          { ar: "تكامل الأنظمة", en: "System integration" },
        ],
      },
      {
        name: { ar: "دبلوم ذكاء الأعمال والبيانات", en: "Diploma in Business Intelligence & Data" },
        bullets: [
          { ar: "تحليل البيانات", en: "Data analytics" },
          { ar: "نظم مؤشرات الأداء", en: "KPI systems" },
          { ar: "لوحات المعلومات", en: "Dashboards" },
          { ar: "تفسير البيانات واتخاذ القرار", en: "Data interpretation" },
        ],
      },
      {
        name: { ar: "دبلوم التسويق الرقمي", en: "Diploma in Digital Marketing" },
        bullets: [
          { ar: "القنوات الرقمية", en: "Digital channels" },
          { ar: "رحلات العملاء", en: "Customer journeys" },
          { ar: "التسويق عبر إدارة علاقات العملاء (CRM)", en: "CRM marketing" },
          { ar: "نظم النمو الرقمي", en: "Growth systems" },
        ],
      },
      {
        name: { ar: "دبلوم حوكمة البيانات", en: "Diploma in Data Governance" },
        bullets: [
          { ar: "إطار حوكمة البيانات وملكيتها", en: "Data governance framework & ownership" },
          { ar: "جودة البيانات وإدارة البيانات الرئيسية (MDM)", en: "Data quality & Master Data Management (MDM)" },
          { ar: "خصوصية البيانات والامتثال التنظيمي", en: "Data privacy & regulatory compliance" },
          { ar: "كتالوج البيانات وسياسات التصنيف والاحتفاظ", en: "Data catalog, classification & retention policies" },
        ],
      },
      {
        name: { ar: "دبلوم الأتمتة ورقمنة العمليات", en: "Diploma in Automation & Process Digitization" },
        bullets: [
          { ar: "تحليل العمليات وتحديد فرص الأتمتة", en: "Process analysis & automation opportunity mapping" },
          { ar: "أتمتة العمليات الروبوتية (RPA)", en: "Robotic Process Automation (RPA)" },
          { ar: "أتمتة سير العمل وتكامل الأنظمة", en: "Workflow automation & system integration" },
          { ar: "قياس الأثر التشغيلي ومؤشرات الأتمتة", en: "Operational impact measurement & automation KPIs" },
        ],
      },
    ],
    outcome: {
      ar: "مديرون قادرون على قيادة فرق رقمية وتحويل العمليات إلى أنظمة ذكية فاعلة.",
      en: "Managers able to lead digital teams and convert operations into smart, effective systems.",
    },
  },
  {
    number: "03",
    name: { ar: "المستوى الثالث — قيادة التحول الرقمي التنفيذي", en: "Level 3 — Executive Digital Leadership" },
    icon: Crown,
    focus: {
      ar: "صياغة الاستراتيجية الرقمية، توظيف الذكاء الاصطناعي، وقيادة التحول المؤسسي الشامل.",
      en: "Shape digital strategy, leverage AI, and lead enterprise-wide transformation.",
    },
    courses: [
      { ar: "قيادة التحول الرقمي", en: "Digital Transformation Leadership" },
      { ar: "استراتيجية الذكاء الاصطناعي", en: "AI Strategy" },
      { ar: "حوكمة البيانات", en: "Data Governance" },
      { ar: "هندسة نظم المؤسسات", en: "Enterprise Systems Architecture" },
      { ar: "تحويل الثقافة الرقمية", en: "Digital Culture Transformation" },
    ],
    outcome: {
      ar: "قيادات تنفيذية تقود التحول الرقمي للمؤسسة وتبني نموذجًا تشغيليًا حديثًا.",
      en: "Executive leaders who drive enterprise digital transformation and build a modern operating model.",
    },
  },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "التحول الرقمي",
    eyebrow: "مسار التحول الرقمي",
    title: "أكاديمية دار نظم — مسار التحول الرقمي",
    overviewHeading: "نظرة عامة",
    overview:
      "يُعِدّ مسار التحول الرقمي كفاءات قادرة على نقل المؤسسة من العمل التقليدي إلى نموذج رقمي ذكي. ينطلق من بناء الثقافة الرقمية وأساسيات البيانات، ويتدرّج إلى أتمتة العمليات وتكامل الأنظمة، وصولًا إلى قيادة التحول الرقمي وتوظيف الذكاء الاصطناعي على المستوى التنفيذي.",
    levelsHeading: "مستويات المسار",
    levelsSubheading: "ثلاثة مستويات متدرجة من التأسيس الرقمي إلى قيادة التحول التنفيذي.",
    focusLabel: "المحور",
    modulesLabel: "المحتوى",
    outcomeLabel: "المخرَج",
    finalOutcomeHeading: "المخرج العام للمسار",
    finalOutcome:
      "خرّيج مؤهَّل لقيادة التحول الرقمي في مؤسسته: من التطبيق التشغيلي للأدوات، إلى رسم الاستراتيجية الرقمية، وحوكمة البيانات والذكاء الاصطناعي، وبناء ثقافة رقمية مستدامة.",
    ctaTitle: "تواصل مع الأكاديمية",
    ctaDesc: "للاستفسار عن خطة الالتحاق بمسار التحول الرقمي والرسوم وجداول الدفعات.",
    ctaApply: "تقديم",
    ctaWhatsapp: "تواصل عبر واتساب",
    backToAcademy: "العودة إلى الأكاديمية",
    whatsappLink: "https://wa.me/201022044240?text=أرغب في الاستفسار عن مسار التحول الرقمي في أكاديمية دار نظم",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Digital Transformation",
    eyebrow: "Digital Transformation Track",
    title: "DarNozom Academy — Digital Transformation Track",
    overviewHeading: "Overview",
    overview:
      "The Digital Transformation track prepares professionals to move their organization from traditional operations to an intelligent digital model. It starts with digital fluency and data fundamentals, progresses through automation and systems integration, and culminates in leading enterprise-wide transformation and applying AI at the executive level.",
    levelsHeading: "Track Levels",
    levelsSubheading: "Three structured levels — from digital foundation to executive transformation leadership.",
    focusLabel: "Focus",
    modulesLabel: "Modules",
    outcomeLabel: "Outcome",
    finalOutcomeHeading: "Track Outcome",
    finalOutcome:
      "A graduate equipped to lead digital transformation in their institution: from operational mastery of tools, to shaping digital strategy, governing data & AI, and building a sustainable digital culture.",
    ctaTitle: "Contact the Academy",
    ctaDesc: "Inquire about admission, fees, and cohort schedules for the Digital Transformation track.",
    ctaApply: "Apply",
    ctaWhatsapp: "Contact via WhatsApp",
    backToAcademy: "Back to Academy",
    whatsappLink: "https://wa.me/201022044240?text=I'd like to learn more about the Digital Transformation track at DarNozom Academy",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyDigitalPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";
  const program = PROGRAMS.find(p => p.id === "digital")!;

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

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-5 mb-6"
            >
              <Cpu className="w-14 h-14 text-secondary shrink-0" strokeWidth={1.5} />
              <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}>
                {program.title[language]}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-lg max-w-2xl leading-relaxed"
            >
              {program.tagline?.[language]}
            </motion.p>
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
                data-testid={`digital-level-${lvl.number}`}
              >
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="bg-primary text-primary-foreground p-8 flex flex-col items-start justify-between gap-6 md:min-h-[280px]">
                    <div>
                      <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">{isArabic ? `المستوى ${lvl.number}` : `Level ${lvl.number}`}</div>
                      <div className="text-white font-black leading-none" style={{ fontSize: "clamp(3rem, 4vw, 4.5rem)" }}>
                        {lvl.number}
                      </div>
                    </div>
                    <lvl.icon className="w-10 h-10 text-secondary" strokeWidth={1.5} />
                  </div>

                  <div className="p-8 md:p-10">
                    <h3 className="font-black text-primary leading-snug mb-6" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
                      {lvl.name[language]}
                    </h3>

                    <div className="mb-6">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">{t.focusLabel}</div>
                      <p className="text-primary font-semibold leading-relaxed">{lvl.focus[language]}</p>
                    </div>

                    {lvl.courses && (
                      <div className="mb-6">
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-3">{t.modulesLabel}</div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {lvl.courses.map((m, j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between gap-3 bg-muted/40 border border-border px-4 py-2.5 text-sm font-semibold text-primary"
                              data-testid={`digital-course-${lvl.number}-${j}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <Cog className="w-3 h-3 text-secondary shrink-0" />
                                <span className="truncate">{m[language]}</span>
                              </span>
                              <Link
                                href={`/academy/register?program=digital&course=${encodeURIComponent(m.en)}`}
                                data-testid={`apply-digital-course-${lvl.number}-${j}`}
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
                      <div className="mb-6">
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-3">{isArabic ? "الدبلومات" : "Diplomas"}</div>
                        <div className="grid md:grid-cols-2 gap-3">
                          {lvl.diplomas.map((d, j) => (
                            <div
                              key={j}
                              className="bg-muted/30 border border-border p-5 flex flex-col"
                              data-testid={`digital-diploma-${lvl.number}-${j}`}
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
                                  href={`/academy/register?program=digital&diploma=${encodeURIComponent(d.name.en)}`}
                                  data-testid={`apply-digital-diploma-${lvl.number}-${j}`}
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

                    <div className="mt-6 pt-6 border-t border-border bg-secondary/5 -mx-8 -mb-8 md:-mx-10 md:-mb-10 px-8 md:px-10 py-5">
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

      {/* Final Outcome */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-5xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المخرجات" : "Outcome"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-6" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {t.finalOutcomeHeading}
          </h2>
          <div className="flex items-start gap-3 bg-muted/30 border border-border p-6">
            <CheckCircle2 size={22} className="text-secondary shrink-0 mt-1" />
            <p className="text-primary text-lg leading-relaxed font-semibold">{t.finalOutcome}</p>
          </div>
        </div>
      </section>

      {/* Related Pathways */}
      <section className="py-20 bg-muted/20 border-b border-border">
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
                ? "بعد إتمام دبلومات التحول الرقمي، يمكنك التتويج بالدبلوم المتكامل في الأكاديمية، أو تطبيق ما تعلمته عبر خدمة استشارات التحول الرقمي والتقنية."
                : "After completing the Digital Transformation diplomas, cap your journey with the Academy's Integrated Leadership Diploma — or apply what you've learned through the matching Digital Transformation & Technology consulting service."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Link
              href="/academy#integrated-diploma"
              data-testid="cross-link-integrated-diploma"
              className="group bg-background border border-border p-6 hover:border-secondary/60 transition-colors flex flex-col"
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
              href="/services/consulting#digital-transformation"
              data-testid="cross-link-consulting-service"
              className="group bg-background border border-border p-6 hover:border-secondary/60 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <Cpu className="w-7 h-7 text-secondary" strokeWidth={1.5} />
                <span className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase">{isArabic ? "خدمة استشارية" : "Consulting Service"}</span>
              </div>
              <h3 className="font-black text-primary text-lg mb-2 leading-snug">
                {isArabic ? "استشارات التحول الرقمي" : "Digital Transformation Consulting"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isArabic
                  ? "نُهندس خارطة التحول الرقمي وبنية الأنظمة وحوكمة البيانات والذكاء الاصطناعي لنقل مؤسستك إلى نموذج تشغيل رقمي ذكي."
                  : "We engineer the digital roadmap, systems architecture, data and AI governance to move your institution into an intelligent digital operating model."}
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
          <h3 className="font-black text-white text-3xl mb-4">{t.ctaTitle}</h3>
          <p className="text-white/70 leading-relaxed mb-8 max-w-xl mx-auto">{t.ctaDesc}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/academy/apply"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
            >
              {t.ctaApply}
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
