import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, Compass, Layers, Crown,
  CheckCircle2, ArrowRight, Users, BarChart3, Building2,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

type CurriculumKind = "course" | "diploma";

interface CurriculumItem {
  ar: string;
  en: string;
  kind: CurriculumKind;
  /** Optional EN audience hint shown on optional items (e.g. "Marketing roles"). */
  forAr?: string;
  forEn?: string;
}

interface PathSpec {
  id: string;
  number: string;
  icon: React.ElementType;
  badge: { ar: string; en: string };
  name: { ar: string; en: string };
  who: { ar: string; en: string };
  focus: { ar: string; en: string }[];
  pulls: { ar: string; en: string };
  programs: {
    core: CurriculumItem[];
    optional: CurriculumItem[];
  };
  outcome: { ar: string; en: string };
  cta: { href: string; labelAr: string; labelEn: string };
}

const PATHS: PathSpec[] = [
  {
    id: "early-career",
    number: "01",
    icon: Compass,
    badge: { ar: "بداية المسيرة", en: "Early Career" },
    name: { ar: "مسار بداية المسيرة المهنية", en: "Early Career Path" },
    who: {
      ar: "للخريجين الجدد والمهنيين في بداية مسيرتهم — لبناء الجاهزية المهنية والأساس المؤسسي.",
      en: "For graduates and early-career professionals — building workplace readiness and an institutional mindset.",
    },
    focus: [
      { ar: "قيادة الذات والإنتاجية الشخصية", en: "Self-leadership & personal productivity" },
      { ar: "مهارات التواصل المهني", en: "Professional communication" },
      { ar: "فهم الأعمال والوعي المؤسسي", en: "Business understanding & institutional awareness" },
      { ar: "الثقافة الرقمية وأدوات العمل", en: "Digital fluency & workplace tools" },
      { ar: "أخلاقيات المهنة وآداب العمل", en: "Workplace ethics & professional conduct" },
    ],
    pulls: {
      ar: "يجمع كورسات تأسيسية من البرامج الثلاثة: أنظمة الحوكمة والامتثال الشرعي، الإدارة المهنية، والتحول الرقمي.",
      en: "Curates Foundation-level courses from all three programs: Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation.",
    },
    programs: {
      core: [
        { kind: "course", ar: "مبادئ القيادة الإسلامية", en: "Islamic Leadership Principles" },
        { kind: "course", ar: "قيادة الذات والإنتاجية الشخصية", en: "Self-Leadership & Productivity" },
        { kind: "course", ar: "مهارات التواصل المهني", en: "Professional Communication" },
        { kind: "course", ar: "أساسيات الأعمال", en: "Business Fundamentals" },
        { kind: "course", ar: "الثقافة الرقمية", en: "Digital Literacy" },
        { kind: "course", ar: "الأخلاق والنزاهة في بيئات العمل", en: "Ethics & Integrity in Workplaces" },
      ],
      optional: [
        { kind: "course", ar: "مدخل إلى التمويل الإسلامي", en: "Introduction to Islamic Finance", forAr: "للراغبين في أنظمة الحوكمة والامتثال الشرعي", forEn: "Shariah Governance & Compliance Systems track" },
        { kind: "course", ar: "أساسيات الحوكمة", en: "Governance Fundamentals", forAr: "للحوكمة والامتثال", forEn: "Governance & compliance" },
        { kind: "course", ar: "أدوات بيئة العمل الحديثة", en: "Workplace Tools", forAr: "للعمل المكتبي والإداري", forEn: "Office & admin roles" },
        { kind: "course", ar: "مدخل إلى الذكاء الاصطناعي", en: "Introduction to AI", forAr: "للأدوار التقنية والرقمية", forEn: "Tech & digital roles" },
        { kind: "course", ar: "الوعي بالبيانات", en: "Data Awareness", forAr: "لأدوار التحليل والتقارير", forEn: "Analyst / reporting roles" },
        { kind: "course", ar: "أساسيات الأمن السيبراني", en: "Cybersecurity Basics", forAr: "للقطاعات الحساسة", forEn: "Sensitive sectors" },
        { kind: "course", ar: "ثقافة الأعمال (المالية ومؤشرات الأداء)", en: "Business Literacy (Finance & KPIs)", forAr: "للأدوار المالية والإدارية", forEn: "Finance / admin roles" },
      ],
    },
    outcome: {
      ar: "مهني جاهز لسوق العمل، يجمع بين الكفاءة التشغيلية والوعي المؤسسي والقيم.",
      en: "A job-ready professional combining operational competence, institutional awareness, and values.",
    },
    cta: {
      href: "/academy/register?type=path&path=early-career",
      labelAr: "قدّم على المسار التأسيسي",
      labelEn: "Apply to the Foundation Path",
    },
  },
  {
    id: "managerial",
    number: "02",
    icon: Layers,
    badge: { ar: "إداري", en: "Managerial" },
    name: { ar: "المسار الإداري", en: "Managerial Path" },
    who: {
      ar: "لقادة الفرق والمديرين الوظيفيين — لإحكام الأدوات الإدارية وقيادة العمليات وإدارة الأداء.",
      en: "For team leaders and functional managers — sharpening managerial tooling, operational leadership, and performance management.",
    },
    focus: [
      { ar: "الإدارة الوظيفية والعمليات", en: "Functional & operational management" },
      { ar: "قيادة الفرق وتطوير الأداء", en: "Team leadership & performance" },
      { ar: "التفكير النظمي وحل المشكلات", en: "Systems thinking & problem solving" },
      { ar: "إدارة المشاريع وقياس النتائج", en: "Project management & measurable outcomes" },
      { ar: "الحوكمة المؤسسية والامتثال", en: "Institutional governance & compliance" },
    ],
    pulls: {
      ar: "يجمع المستوى الثاني من البرامج الثلاثة، وعدد من الدبلومات المعتمدة (PMP, SHRM, AI for Business).",
      en: "Combines Level 2 of all three programs with selected accredited diplomas (PMP, SHRM, AI for Business).",
    },
    programs: {
      core: [
        { kind: "diploma", ar: "دبلوم إدارة المشاريع (PMP)", en: "Diploma in Project Management (PMP)" },
        { kind: "diploma", ar: "دبلوم إدارة الموارد البشرية (SHRM / ACHRM)", en: "Diploma in HR Management (SHRM / ACHRM)" },
        { kind: "diploma", ar: "دبلوم الإدارة المالية", en: "Diploma in Financial Management" },
        { kind: "diploma", ar: "دبلوم ذكاء الأعمال", en: "Diploma in Business Intelligence" },
        { kind: "course", ar: "تطبيق الذكاء الاصطناعي في الأعمال", en: "Applied AI in Business" },
        { kind: "course", ar: "تطبيق الحوكمة الشرعية في المؤسسات", en: "Applied Sharia Governance" },
      ],
      optional: [
        { kind: "diploma", ar: "دبلوم التسويق والنمو", en: "Diploma in Marketing & Growth", forAr: "لمدراء التسويق والعلامة التجارية", forEn: "Marketing / brand managers" },
        { kind: "diploma", ar: "دبلوم المبيعات والإيرادات", en: "Diploma in Sales & Revenue", forAr: "لمدراء المبيعات والإيرادات", forEn: "Sales / revenue managers" },
        { kind: "diploma", ar: "دبلوم إدارة العمليات", en: "Diploma in Operations Management", forAr: "لمدراء العمليات وسلاسل الإمداد", forEn: "Operations / supply-chain managers" },
        { kind: "diploma", ar: "دبلوم الابتكار وإدارة المنتجات", en: "Diploma in Innovation & Product", forAr: "لمدراء المنتجات والابتكار", forEn: "Product / innovation managers" },
        { kind: "diploma", ar: "دبلوم نظم التمويل الإسلامي", en: "Diploma in Islamic Finance Systems", forAr: "للقطاع المصرفي والمالي الإسلامي", forEn: "Islamic banking & finance" },
        { kind: "diploma", ar: "دبلوم الأمن السيبراني", en: "Diploma in Cybersecurity", forAr: "للقطاعات الحساسة وأمن المعلومات", forEn: "Sensitive sectors & infosec" },
        { kind: "diploma", ar: "دبلوم نظم تخطيط الموارد المؤسسية (ERP)", en: "Diploma in ERP & Business Systems", forAr: "لمدراء النظم المؤسسية", forEn: "Business systems managers" },
        { kind: "diploma", ar: "دبلوم التسويق الرقمي", en: "Diploma in Digital Marketing", forAr: "للتسويق الرقمي والقنوات", forEn: "Digital marketing roles" },
        { kind: "diploma", ar: "دبلوم الحوكمة والامتثال الشرعي", en: "Diploma in Islamic Governance & Compliance", forAr: "لوحدات الحوكمة والامتثال", forEn: "Governance & compliance units" },
        { kind: "course", ar: "أتمتة العمليات وسير الأعمال", en: "Process & Workflow Automation", forAr: "لتطوير العمليات والكفاءة", forEn: "Process improvement" },
      ],
    },
    outcome: {
      ar: "مدير قادر على تشغيل وحدة عمل، قيادة فريقه، ورفع أداء العمليات بكفاءة قابلة للقياس.",
      en: "A manager who can run a business unit, lead their team, and raise operational performance with measurable results.",
    },
    cta: {
      href: "/academy/register?type=path&path=managerial",
      labelAr: "قدّم على المسار الإداري",
      labelEn: "Apply to the Managerial Path",
    },
  },
  {
    id: "executive",
    number: "03",
    icon: Crown,
    badge: { ar: "تنفيذي", en: "Executive" },
    name: { ar: "المسار التنفيذي", en: "Executive Path" },
    who: {
      ar: "للقيادات التنفيذية والمدراء التنفيذيين والرؤساء التنفيذيين ورواد الأعمال — لقيادة المؤسسة استراتيجيًا والتحول الشامل.",
      en: "For senior leaders, directors, CEOs, and entrepreneurs — leading organizations strategically and driving institutional transformation.",
    },
    focus: [
      { ar: "الاستراتيجية المؤسسية والنمو", en: "Institutional strategy & growth" },
      { ar: "الحوكمة والتصميم المؤسسي", en: "Governance & organizational design" },
      { ar: "قيادة التحول الرقمي وتوظيف الذكاء الاصطناعي", en: "Digital transformation & AI leadership" },
      { ar: "القيادة المالية والاستثمارية", en: "Financial & investment leadership" },
      { ar: "القيادة بالقيم والأثر طويل المدى", en: "Values-driven leadership & long-term impact" },
    ],
    pulls: {
      ar: "يجمع المستوى الثالث من البرامج الثلاثة، ويتوّج بدبلوم القيادة المتكاملة — البرنامج الرائد للأكاديمية.",
      en: "Brings together Level 3 of all three programs, capped by the Integrated Leadership Diploma — the Academy's flagship.",
    },
    programs: {
      core: [
        { kind: "diploma", ar: "دبلوم القيادة المتكاملة (الرائد)", en: "Integrated Leadership Diploma (Flagship)" },
        { kind: "course", ar: "القيادة التنفيذية", en: "Executive Leadership" },
        { kind: "course", ar: "الاستراتيجية المؤسسية", en: "Corporate Strategy" },
        { kind: "course", ar: "قيادة التحول الرقمي", en: "Digital Transformation Leadership" },
        { kind: "course", ar: "القيادة الشرعية الاستراتيجية", en: "Strategic Shariah Leadership" },
        { kind: "course", ar: "الحوكمة وإدارة المخاطر", en: "Governance & Risk" },
      ],
      optional: [
        { kind: "course", ar: "الحوكمة الشرعية التنفيذية", en: "Islamic Executive Governance", forAr: "لقيادات القطاع المالي الإسلامي", forEn: "Islamic-finance executives" },
        { kind: "course", ar: "الاستراتيجية المبنية على المقاصد", en: "Maqasid-Driven Strategy", forAr: "للقيادات ذات المرجعية الشرعية", forEn: "Sharia-driven leadership" },
        { kind: "course", ar: "نظم الأخلاق المؤسسية", en: "Institutional Ethics Systems", forAr: "لمسؤولي الحوكمة والأخلاقيات", forEn: "Ethics & governance officers" },
        { kind: "course", ar: "استراتيجية الذكاء الاصطناعي", en: "AI Strategy", forAr: "للقيادات التقنية والمؤسسات الرقمية", forEn: "Tech leadership / CIOs" },
        { kind: "course", ar: "حوكمة البيانات", en: "Data Governance", forAr: "لقادة البيانات والامتثال", forEn: "Data / compliance leaders" },
        { kind: "course", ar: "هندسة نظم المؤسسات", en: "Enterprise Systems Architecture", forAr: "لمسؤولي تكامل الأنظمة", forEn: "Systems architects" },
        { kind: "course", ar: "تحويل الثقافة الرقمية", en: "Digital Culture Transformation", forAr: "لقيادات الموارد البشرية والتغيير", forEn: "HR / change leadership" },
        { kind: "course", ar: "اتخاذ القرارات المالية", en: "Financial Decision-Making", forAr: "للقيادات المالية والاستثمارية", forEn: "CFOs / investment leaders" },
        { kind: "course", ar: "التصميم المؤسسي", en: "Organizational Design", forAr: "لإعادة هيكلة المؤسسات", forEn: "Org redesign / restructuring" },
        { kind: "diploma", ar: "دبلوم إدارة التحول الرقمي", en: "Diploma in Digital Transformation Management", forAr: "لقيادات التحول التنفيذية", forEn: "Transformation leaders" },
      ],
    },
    outcome: {
      ar: "قائد استراتيجي قادر على تصميم وتحويل المؤسسات على مستوى الحوكمة والإدارة والتقنية.",
      en: "A strategic leader able to design and transform organizations across governance, management, and technology.",
    },
    cta: {
      href: "/academy/register?type=path&path=executive",
      labelAr: "قدّم على المسار التنفيذي",
      labelEn: "Apply to the Executive Path",
    },
  },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "المسارات المهنية",
    eyebrow: "المسارات المهنية",
    title: "ثلاثة مسارات مهنية لرحلة قيادية متكاملة",
    intro:
      "تنظّم أكاديمية دار نظم برامجها وكورساتها داخل ثلاثة مسارات مهنية متدرجة، يبدأ كل مسار من نقطة وضوح في مرحلتك المهنية، ويصل بك إلى المستوى التالي عبر برامج ودبلومات منتقاة من أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي.",
    pathsHeading: "اختر المسار الأنسب لمرحلتك",
    whoLabel: "لمن هذا المسار",
    focusLabel: "محاور التطوير",
    pullsLabel: "البرامج والدبلومات المضمّنة",
    coreLabel: "أساسي للجميع",
    coreDesc: "بنود يأخذها كل من يلتحق بهذا المسار، بصرف النظر عن وظيفته أو تخصصه.",
    optionalLabel: "اختياري حسب الوظيفة والتخصص",
    optionalDesc: "بنود يختارها الملتحق بناءً على دوره الحالي أو تخصصه المهني، بالاتفاق مع فريق الأكاديمية.",
    coreBadge: "أساسي",
    optionalBadge: "اختياري",
    kindCourse: "كورس",
    kindDiploma: "دبلوم",
    outcomeLabel: "المخرَج",
    crossSectorTitle: "قابل للتطبيق في القطاعات الثلاثة",
    crossSectorDesc:
      "كل مسار يصلح للعاملين في القطاع الخاص، والمنظمات غير الربحية، والقطاع الحكومي — مع أمثلة وحالات تطبيقية لكل قطاع.",
    sectorCorporate: "الشركات والقطاع الخاص",
    sectorNGO: "المنظمات غير الربحية",
    sectorGov: "القطاع الحكومي والعام",
    ctaTitle: "غير متأكد من المسار المناسب؟",
    ctaDesc: "احجز جلسة استشارية قصيرة مع فريق الأكاديمية لتساعدك على اختيار المسار الأنسب لمرحلتك المهنية.",
    ctaConsult: "احجز جلسة استشارية",
    ctaApply: "قدّم على الأكاديمية",
    ctaWhatsapp: "تواصل عبر واتساب",
    backToAcademy: "العودة إلى الأكاديمية",
    whatsappLink: "https://wa.me/201022044240?text=أرغب في الاستفسار عن المسارات المهنية في أكاديمية دار نظم",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Career Paths",
    eyebrow: "Career Paths",
    title: "Three Career Paths for an Integrated Leadership Journey",
    intro:
      "Dar Nozom Academy organizes its programs and courses inside three progressive career paths. Each path starts at a clear stage of your career and takes you to the next, through curated programs and diplomas drawn from Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation.",
    pathsHeading: "Choose the path that fits your stage",
    whoLabel: "Who it's for",
    focusLabel: "Focus areas",
    pullsLabel: "Programs & diplomas included",
    coreLabel: "Core — for everyone on this path",
    coreDesc: "Items every learner on this path takes, regardless of role or specialty.",
    optionalLabel: "Optional — by role & specialty",
    optionalDesc: "Items the learner picks based on their current role or professional specialty, in coordination with the Academy team.",
    coreBadge: "Core",
    optionalBadge: "Optional",
    kindCourse: "Course",
    kindDiploma: "Diploma",
    outcomeLabel: "Outcome",
    crossSectorTitle: "Applicable across all three sectors",
    crossSectorDesc:
      "Every path fits professionals in private companies, non-profit organizations, and the public sector — with examples and applied cases for each sector.",
    sectorCorporate: "Corporate & Private",
    sectorNGO: "Non-Profit & NGO",
    sectorGov: "Government & Public",
    ctaTitle: "Not sure which path fits you?",
    ctaDesc: "Book a short consultation with the Academy team to help you choose the path that best fits your career stage.",
    ctaConsult: "Book a Consultation",
    ctaApply: "Apply to the Academy",
    ctaWhatsapp: "Chat on WhatsApp",
    backToAcademy: "Back to the Academy",
    whatsappLink: "https://wa.me/201022044240?text=I would like to inquire about Dar Nozom Academy career paths",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyCareerPathsPage() {
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
              className="font-black text-white leading-tight mb-6"
              style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}
            >
              {t.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-lg max-w-3xl leading-relaxed"
            >
              {t.intro}
            </motion.p>

            {/* Anchor pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              {PATHS.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  className="inline-flex items-center gap-2 border border-white/15 hover:border-secondary text-white/80 hover:text-secondary px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors"
                  data-testid={`pill-path-${p.id}`}
                >
                  <p.icon className="w-3.5 h-3.5" />
                  {p.badge[language]}
                </a>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Paths */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.eyebrow}</span>
            </div>
            <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {t.pathsHeading}
            </h2>
          </div>

          <div className="space-y-10">
            {PATHS.map((p, i) => (
              <motion.article
                key={p.id}
                id={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background border border-border hover:border-secondary/50 transition-colors scroll-mt-24"
                data-testid={`path-${p.id}`}
              >
                <div className="grid md:grid-cols-[260px_1fr]">
                  <div className="bg-primary text-primary-foreground p-8 flex flex-col items-start justify-between gap-6 md:min-h-[320px]">
                    <div>
                      <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
                        {isArabic ? `المسار ${p.number}` : `Path ${p.number}`}
                      </div>
                      <div className="text-white font-black leading-none" style={{ fontSize: "clamp(3rem, 4vw, 4.5rem)" }}>
                        {p.number}
                      </div>
                    </div>
                    <div>
                      <p.icon className="w-10 h-10 text-secondary mb-3" strokeWidth={1.5} />
                      <div className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase">
                        {p.badge[language]}
                      </div>
                    </div>
                  </div>

                  <div className="p-8 md:p-10">
                    <h3 className="font-black text-primary leading-snug mb-6" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
                      {p.name[language]}
                    </h3>

                    <div className="mb-6">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">{t.whoLabel}</div>
                      <p className="text-primary leading-relaxed">{p.who[language]}</p>
                    </div>

                    <div className="mb-6">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-3">{t.focusLabel}</div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {p.focus.map((f, j) => (
                          <div
                            key={j}
                            className="flex items-center gap-2 bg-muted/40 border border-border px-4 py-2.5 text-sm font-semibold text-primary"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                            {f[language]}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">{t.pullsLabel}</div>
                      <p className="text-muted-foreground leading-relaxed">{p.pulls[language]}</p>
                    </div>

                    {/* Core */}
                    <div className="mb-6 border-s-2 border-secondary ps-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center bg-secondary text-primary px-2 py-0.5 text-[10px] font-black tracking-[0.15em] uppercase">
                          {t.coreBadge}
                        </span>
                        <div className="text-[11px] font-bold tracking-wider uppercase text-primary">{t.coreLabel}</div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{t.coreDesc}</p>
                      <ul className="space-y-2">
                        {p.programs.core.map((item, k) => (
                          <li
                            key={`core-${k}`}
                            className="flex items-start gap-3 bg-background border border-border px-3 py-2.5"
                            data-testid={`path-${p.id}-core-${k}`}
                          >
                            <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-primary leading-snug">{item[language === "ar" ? "ar" : "en"]}</div>
                              <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground mt-0.5">
                                {item.kind === "diploma" ? t.kindDiploma : t.kindCourse}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Optional */}
                    <div className="mb-6 border-s-2 border-border ps-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center border border-border bg-background text-primary px-2 py-0.5 text-[10px] font-black tracking-[0.15em] uppercase">
                          {t.optionalBadge}
                        </span>
                        <div className="text-[11px] font-bold tracking-wider uppercase text-primary">{t.optionalLabel}</div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{t.optionalDesc}</p>
                      <ul className="grid sm:grid-cols-2 gap-2">
                        {p.programs.optional.map((item, k) => (
                          <li
                            key={`opt-${k}`}
                            className="flex items-start gap-3 bg-muted/30 border border-border px-3 py-2.5"
                            data-testid={`path-${p.id}-optional-${k}`}
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-primary leading-snug">{item[language === "ar" ? "ar" : "en"]}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                                  {item.kind === "diploma" ? t.kindDiploma : t.kindCourse}
                                </span>
                                {(item.forAr || item.forEn) && (
                                  <>
                                    <span className="text-muted-foreground text-[10px]">·</span>
                                    <span className="text-[10px] text-secondary font-semibold">
                                      {language === "ar" ? item.forAr : item.forEn}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 border-t border-border bg-secondary/5 -mx-8 -mb-8 md:-mx-10 md:-mb-10 px-8 md:px-10 py-5">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-1">{t.outcomeLabel}</div>
                      <p className="text-primary font-bold leading-relaxed mb-5">{p.outcome[language]}</p>
                      <Link
                        href={p.cta.href}
                        className="inline-flex items-center gap-2 bg-secondary text-primary px-6 py-3 font-bold text-sm hover:bg-secondary/90 transition-all"
                        data-testid={`cta-path-${p.id}`}
                      >
                        {language === "ar" ? p.cta.labelAr : p.cta.labelEn}
                        <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-sector applicability */}
      <section className="py-20 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "القطاعات" : "Sectors"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-4" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
              {t.crossSectorTitle}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.crossSectorDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Building2, label: t.sectorCorporate },
              { icon: Users, label: t.sectorNGO },
              { icon: BarChart3, label: t.sectorGov },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-background border border-border p-6 flex items-center gap-4"
              >
                <s.icon className="w-9 h-9 text-secondary shrink-0" strokeWidth={1.5} />
                <span className="font-black text-primary leading-snug">{s.label}</span>
              </motion.div>
            ))}
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
              href="/academy/register"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
              data-testid="cta-paths-apply"
            >
              {t.ctaApply}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
              data-testid="cta-paths-consult"
            >
              <Mail className="w-4 h-4" />
              {t.ctaConsult}
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
