import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, Star, ArrowRight,
  CheckCircle2, BookOpen, Scale, Coins, ShieldCheck,
  Compass, Layers, Crown, GraduationCap, Dot,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { PROGRAMS } from "@/lib/site-content";
import { SiteFooter } from "@/components/site-footer";

const PILLARS = [
  {
    icon: Scale,
    title: { ar: "الحوكمة الشرعية", en: "Sharia Governance" },
    desc: {
      ar: "بناء هياكل حوكمة شرعية واضحة، ومجالس رقابة فاعلة، وسياسات وإجراءات تضمن الانضباط الشرعي للمؤسسة.",
      en: "Building clear Sharia governance structures, effective supervisory boards, and policies that ensure institutional Sharia discipline.",
    },
  },
  {
    icon: Coins,
    title: { ar: "التمويل الإسلامي", en: "Islamic Finance" },
    desc: {
      ar: "إتقان أدوات وعقود التمويل الإسلامي وتطبيقاتها العملية في المصارف والمؤسسات المالية والشركات.",
      en: "Mastering Islamic finance tools, contracts, and their practical applications across banks, financial institutions, and corporates.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: "الامتثال الشرعي", en: "Sharia Compliance" },
    desc: {
      ar: "تأهيل كوادر للتدقيق والمراجعة الشرعية، وضبط المخاطر، وتوثيق الالتزام الشرعي بالمعايير المعتمدة.",
      en: "Qualifying professionals for Sharia audit, review, risk control, and documentation of compliance against recognized standards.",
    },
  },
];

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
    name: { ar: "المستوى الأول — التأسيس الشرعي", en: "Level 1 — Sharia Foundation" },
    icon: Compass,
    focus: {
      ar: "بناء أساس شرعي متين لفهم النظم الإسلامية وتطبيقاتها المعاصرة.",
      en: "Build a solid Sharia foundation for understanding Islamic systems and their contemporary application.",
    },
    courses: [
      { ar: "مبادئ القيادة الإسلامية", en: "Islamic Leadership Principles" },
      { ar: "مقاصد الشريعة في المؤسسات", en: "Maqasid Al-Shariah in Organizations" },
      { ar: "الأخلاق والنزاهة في بيئات العمل", en: "Ethics & Integrity in Workplaces" },
      { ar: "مدخل إلى التمويل الإسلامي", en: "Introduction to Islamic Finance" },
      { ar: "أساسيات الحوكمة", en: "Governance Fundamentals" },
    ],
    outcome: {
      ar: "مهنيون يفهمون الإطار الشرعي ويميّزون بين الأحكام والتطبيقات المؤسسية.",
      en: "Professionals who understand the Sharia framework and can distinguish rulings from institutional applications.",
    },
  },
  {
    number: "02",
    name: { ar: "المستوى الثاني — الدبلومات الإدارية", en: "Level 2 — Management Diplomas" },
    icon: Layers,
    focus: {
      ar: "سبعة دبلومات احترافية تبني وحدات الحوكمة والامتثال والتمويل والعقود والتمويل الاجتماعي والتدقيق الشرعي وأخلاقيات المؤسسة.",
      en: "Seven professional diplomas that build governance, compliance, finance, contracts, social-finance, Sharia audit, and organizational-ethics units inside institutions.",
    },
    diplomas: [
      {
        name: { ar: "دبلوم الحوكمة والامتثال الشرعي", en: "Diploma in Islamic Governance & Compliance" },
        bullets: [
          { ar: "نظام الحوكمة الشرعية للشركات والمؤسسات", en: "Sharia Governance System for companies & institutions" },
          { ar: "نظام الامتثال الشرعي للشركات والمؤسسات", en: "Sharia Compliance System for companies & institutions" },
          { ar: "أُطُر المساءلة والمسؤولية المؤسسية", en: "Accountability & institutional responsibility frameworks" },
          { ar: "آليات التدقيق والمراجعة الشرعية", en: "Sharia audit & review mechanisms" },
        ],
      },
      {
        name: { ar: "دبلوم نظم التمويل الإسلامي", en: "Diploma in Islamic Finance Systems" },
        bullets: [
          { ar: "نظام التمويل الإسلامي (شركاء · مستثمرين · بنوك) مع الضوابط الشرعية", en: "Islamic Finance System (partners · investors · banks) with Sharia controls" },
          { ar: "الصيرفة الإسلامية والأنظمة الخالية من الربا", en: "Islamic banking & riba-free systems" },
          { ar: "نظام التأمين التكافلي", en: "Takaful (Cooperative Insurance) System" },
          { ar: "نظام البورصة والاستثمارات الإسلامية", en: "Islamic Stock Market & Investments System" },
          { ar: "هياكل الاستثمار والحوكمة المالية", en: "Investment structures & financial governance" },
        ],
      },
      {
        name: { ar: "دبلوم العقود والنظم القانونية الإسلامية", en: "Diploma in Islamic Contracts & Legal Systems" },
        bullets: [
          { ar: "نظام إنشاء العقود الإسلامية (مرابحة · مضاربة · مشاركة · استصناع · تطوير)", en: "Islamic Contracts Creation System (Murabaha · Mudaraba · Musharaka · Istisna · Development)" },
          { ar: "تصميم العقود وأُطُر الإثبات الشرعي", en: "Contract design & legal validation frameworks" },
          { ar: "أُطُر الملكية والتصرّفات الشرعية", en: "Ownership frameworks & legitimate dispositions" },
          { ar: "التحكيم الشرعي في النزاعات المالية", en: "Sharia Arbitration in Financial Disputes" },
        ],
      },
      {
        name: { ar: "دبلوم النظم الشركاتية الإسلامية", en: "Diploma in Islamic Corporate Systems" },
        bullets: [
          { ar: "الشراكات وهياكل الملكية المؤسسية", en: "Partnerships & institutional ownership structures" },
          { ar: "نظام وإجراءات انضمام الشركاء وقواعد التحكم والتقييم", en: "Partner onboarding system, governance rules & valuation" },
          { ar: "آليات الانفصال (اختياري أو بسبب الوفاة) وصلاحيات الانتفاع بالاسم التجاري", en: "Separation mechanisms (voluntary / on death) & trade-name usage rights" },
          { ar: "التصفية: التقييم والأحكام الشرعية في مرحلة الانفصال", en: "Liquidation: valuation & Sharia rulings during separation" },
          { ar: "استمرارية المؤسسات وتوارث الحوكمة", en: "Institutional continuity & governance succession" },
        ],
      },
      {
        name: { ar: "دبلوم الزكاة والتمويل الاجتماعي", en: "Diploma in Zakat & Social Finance" },
        bullets: [
          { ar: "نظم الزكاة والاحتساب المؤسسي", en: "Zakat systems & institutional calculation" },
          { ar: "توزيع الثروة ومصارف الزكاة", en: "Wealth distribution & Zakat channels" },
          { ar: "تمويل الأثر الاجتماعي والوقف المعاصر", en: "Social impact finance & contemporary Waqf" },
        ],
      },
      {
        name: { ar: "دبلوم التدقيق الشرعي وإدارة المخاطر", en: "Diploma in Sharia Audit & Risk Management" },
        bullets: [
          { ar: "أُطُر التدقيق الشرعي وفق المعايير المعتمدة", en: "Sharia audit frameworks per recognized standards" },
          { ar: "خرائط المخاطر والضوابط (RCM)", en: "Risk & Control Mapping (RCM)" },
          { ar: "أدلة المراجعة والتدقيق الشرعي للعمليات", en: "Sharia audit playbooks for operational reviews" },
          { ar: "تقارير التدقيق ومتابعة المعالجات", en: "Audit reporting & remediation tracking" },
        ],
      },
      {
        name: { ar: "دبلوم أخلاقيات المؤسسة وأنظمة الإبلاغ", en: "Diploma in Organizational Ethics & Whistleblowing Systems" },
        bullets: [
          { ar: "ميثاق الأخلاق المؤسسية والسلوك المهني", en: "Corporate code of ethics & professional conduct" },
          { ar: "تصميم قنوات الإبلاغ الداخلي وحماية المُبلِّغين", en: "Designing internal whistleblowing channels & whistleblower protection" },
          { ar: "حوكمة التحقيقات الداخلية وضوابط السرية", en: "Internal investigation governance & confidentiality controls" },
          { ar: "بناء ثقافة النزاهة والامتثال السلوكي", en: "Building a culture of integrity & behavioural compliance" },
        ],
      },
    ],
    outcome: {
      ar: "مديرون قادرون على بناء وإدارة وحدات شرعية مؤسسية وفق المعايير المعتمدة.",
      en: "Managers able to build and run institutional Sharia units against recognized standards.",
    },
  },
  {
    number: "03",
    name: { ar: "المستوى الثالث — القيادة الشرعية التنفيذية", en: "Level 3 — Executive Sharia Leadership" },
    icon: Crown,
    focus: {
      ar: "قيادة المؤسسات من منظور شرعي استراتيجي يجمع المرجعية الشرعية مع الاحتراف الإداري.",
      en: "Lead institutions from a strategic Sharia perspective combining Sharia authority with managerial professionalism.",
    },
    courses: [
      { ar: "الحوكمة الشرعية التنفيذية", en: "Islamic Executive Governance" },
      { ar: "القيادة الشرعية الاستراتيجية", en: "Strategic Shariah Leadership" },
      { ar: "نظم الأخلاق المؤسسية", en: "Institutional Ethics Systems" },
      { ar: "الاستراتيجية المبنية على المقاصد", en: "Maqasid-Driven Strategy" },
    ],
    outcome: {
      ar: "قيادات تنفيذية تجمع بين المرجعية الشرعية والاحتراف القيادي وتقود المؤسسات بثقة.",
      en: "Executive leaders combining Sharia authority with leadership professionalism, leading institutions with confidence.",
    },
  },
];

const OUTCOMES = [
  { ar: "متخصصون قادرون على قيادة وحدات الحوكمة والامتثال الشرعي", en: "Specialists capable of leading Sharia governance and compliance units" },
  { ar: "مهنيون يصممون منتجات وعقودًا تمويلية إسلامية متوافقة شرعًا", en: "Professionals who design Sharia-compliant Islamic finance products and contracts" },
  { ar: "مدققون ومراجعون شرعيون وفق المعايير الدولية المعتمدة", en: "Sharia auditors and reviewers operating per recognized international standards" },
  { ar: "قيادات مؤسسية تجمع بين المرجعية الشرعية والاحتراف الإداري", en: "Institutional leaders combining Sharia authority with managerial professionalism" },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "أنظمة الحوكمة والامتثال الشرعي",
    eyebrow: "مسار أنظمة الحوكمة والامتثال الشرعي",
    overviewHeading: "نظرة عامة",
    overview:
      "يُقدّم مسار أنظمة الحوكمة والامتثال الشرعي في أكاديمية دار نظم برامج علمية تطبيقية لإعداد متخصصين قادرين على بناء وتشغيل وضبط النظم الشرعية في المؤسسات المعاصرة، عبر منهج يجمع بين الأصالة الفقهية والممارسة الإدارية الحديثة.",
    pillarsHeading: "المبادئ الأساسية",
    levelsHeading: "مستويات المسار",
    levelsSubheading: "ثلاثة مستويات متدرجة تأخذك من التأسيس الشرعي إلى القيادة الشرعية التنفيذية.",
    focusLabel: "المحور",
    modulesLabel: "المحتوى",
    diplomasLabel: "الدبلومات",
    outcomeLabel: "المخرَج",
    outcomesHeading: "مخرجات المسار",
    ctaTitle: "تواصل مع الأكاديمية",
    ctaDesc: "للاستفسار عن خطة الالتحاق بمسار أنظمة الحوكمة والامتثال الشرعي والرسوم وجداول الدفعات.",
    ctaApply: "تقديم",
    ctaWhatsapp: "تواصل عبر واتساب",
    ctaEmail: "راسلنا بالبريد",
    backToAcademy: "العودة إلى الأكاديمية",
    whatsappLink: "https://wa.me/201022044240?text=أرغب في الاستفسار عن مسار أنظمة الحوكمة والامتثال الشرعي في أكاديمية دار نظم",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Shariah Governance & Compliance Systems",
    eyebrow: "Shariah Governance & Compliance Systems Track",
    overviewHeading: "Overview",
    overview:
      "The Shariah Governance & Compliance Systems track at DarNozom Academy delivers applied scientific programs that prepare specialists to build, operate, and govern Sharia systems within modern institutions — combining classical jurisprudence with contemporary managerial practice.",
    pillarsHeading: "Core Principles",
    levelsHeading: "Track Levels",
    levelsSubheading: "Three structured levels — from Sharia foundation to executive Sharia leadership.",
    focusLabel: "Focus",
    modulesLabel: "Courses",
    diplomasLabel: "Diplomas",
    outcomeLabel: "Outcome",
    outcomesHeading: "Track Outcomes",
    ctaTitle: "Contact the Academy",
    ctaDesc: "Inquire about admission, fees, and cohort schedules for the Shariah Governance & Compliance Systems track.",
    ctaApply: "Apply",
    ctaWhatsapp: "Contact via WhatsApp",
    ctaEmail: "Email Us",
    backToAcademy: "Back to Academy",
    whatsappLink: "https://wa.me/201022044240?text=I'd like to learn more about the Shariah Governance & Compliance Systems track at DarNozom Academy",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyIslamicPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";
  const program = PROGRAMS.find(p => p.id === "islamic")!;

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
              <Star className="w-14 h-14 text-secondary shrink-0" />
              <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2.5rem, 5vw, 4.25rem)" }}>
                {program.title[language]}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-lg max-w-2xl leading-relaxed"
            >
              {program.tagline?.[language] ?? program.desc[language]}
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

      {/* Core Principles */}
      <section className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المبادئ الأساسية" : "Core Principles"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-12" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {t.pillarsHeading}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background border border-border p-8 hover:border-secondary/50 transition-colors"
              >
                <p.icon className="w-8 h-8 text-secondary mb-5" />
                <h3 className="font-black text-primary text-lg mb-3 leading-snug">{p.title[language]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc[language]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="py-24 bg-background border-b border-border">
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
                data-testid={`islamic-level-${lvl.number}`}
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
                              data-testid={`course-${lvl.number}-${j}`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <BookOpen className="w-3 h-3 text-secondary shrink-0" />
                                <span className="truncate">{m[language]}</span>
                              </span>
                              <Link
                                href={`/academy/register?program=islamic&course=${encodeURIComponent(m.en)}`}
                                data-testid={`apply-course-${lvl.number}-${j}`}
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
                        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-3">{t.diplomasLabel}</div>
                        <div className="space-y-3">
                          {lvl.diplomas.map((d, j) => (
                            <div
                              key={j}
                              className="bg-muted/30 border border-border p-5"
                              data-testid={`diploma-${lvl.number}-${j}`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <GraduationCap className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                                <h4 className="font-black text-primary text-base leading-snug">{d.name[language]}</h4>
                              </div>
                              <ul className="space-y-1.5 ms-8">
                                {d.bullets.map((b, k) => (
                                  <li key={k} className="flex items-start gap-2 text-sm text-primary leading-relaxed">
                                    <Dot className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                                    <span>{b[language]}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-4 pt-3 border-t border-border/60 ms-8">
                                <Link
                                  href={`/academy/register?program=islamic&diploma=${encodeURIComponent(d.name.en)}`}
                                  data-testid={`apply-diploma-${lvl.number}-${j}`}
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

      {/* Outcomes */}
      <section className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المخرجات" : "Outcomes"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-12" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {t.outcomesHeading}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {OUTCOMES.map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 bg-background border border-border p-5"
              >
                <CheckCircle2 size={20} className="text-secondary shrink-0 mt-0.5" />
                <div className="text-primary leading-relaxed">{o[language]}</div>
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
                ? "بعد إتمام دبلومات أنظمة الحوكمة والامتثال الشرعي، يمكنك التتويج بالدبلوم المتكامل في الأكاديمية، أو تطبيق ما تعلمته عبر خدمة استشارات الحوكمة والامتثال الشرعي."
                : "After completing the Shariah Governance & Compliance Systems diplomas, cap your journey with the Academy's Integrated Leadership Diploma — or apply what you've learned through the matching Shariah Governance & Compliance consulting service."}
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
              href="/services/consulting#governance-islamic"
              data-testid="cross-link-consulting-service"
              className="group bg-muted/30 border border-border p-6 hover:border-secondary/60 transition-colors flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-7 h-7 text-secondary" strokeWidth={1.5} />
                <span className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase">{isArabic ? "خدمة استشارية" : "Consulting Service"}</span>
              </div>
              <h3 className="font-black text-primary text-lg mb-2 leading-snug">
                {isArabic ? "استشارات الحوكمة والامتثال الشرعي" : "Shariah Governance & Compliance Consulting"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isArabic
                  ? "نُصمّم منظومة الحوكمة الشرعية والمؤسسية للمنظمات التي تُريد أن تعمل بضوابط شرعية واضحة وانضباط مالي معتمد."
                  : "We design the Sharia and institutional governance fabric for organizations that want to operate with clear religious controls and audited financial discipline."}
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
