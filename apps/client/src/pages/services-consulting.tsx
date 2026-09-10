/**
 * Consulting page — restructured around a single Why → What → How narrative.
 *
 * Content map (from the old 17-section page → the new 6-section flow):
 *   Hero                       → Hero (stats strip dropped; secondary anchor added)
 *   Differentiation / "We are" → WHY (the "Not X, but Y" block)
 *   Why-DarNozom comparison    → WHY (compact 4-row strip) + full table in accordion
 *   3D Methodology / Domains   → WHAT (3 large domain cards)
 *   Flagship OS Offer          → WHAT (highlighted strip under the cards)
 *   Tangible Deliverables grid → WHAT accordion "See concrete deliverables"
 *   Engagement Journey (5 ph.) → HOW: collapsed to 4-step grid; per-phase detail in accordion
 *   Ways to Engage (4 models)  → HOW: 4 small pills (name + duration only)
 *   Sectors                    → HOW: single row of 6 icons + link to /sectors-ish (sectors detail stays inline as we have no /sectors route)
 *   Typical Projects           → link to /case-studies
 *   Capstone / Academy↔Cons.   → single ecosystem line linking to academy
 *   Powered-by / Ecosystem     → folded into ecosystem line
 *   FAQ                        → kept, trimmed to top 5
 *   Final CTA                  → kept
 */

import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Scale, Briefcase, Laptop, Building2, HeartHandshake,
  Landmark, BookOpen, ScrollText, HelpingHand,
  Search, PenTool, Rocket, Repeat, FileText,
  ClipboardCheck, Target, Network, BarChart3, Sparkles,
  Plus, Minus, ArrowRight, CheckCircle2, ChevronLeft,
  Cpu, GraduationCap,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─────────────────────────────────────────────────────────────────
   CONTENT
───────────────────────────────────────────────────────────────── */

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbServices: "الخدمات",
    breadcrumbCurrent: "الاستشارات",
    eyebrow: "مؤسسة لتصميم الأنظمة",

    heroTagline: "نُصمّم نظام تشغيل مؤسستك — بأبعاده الشرعية والإدارية والرقمية.",
    heroBody: "دار نظم مؤسسة لتصميم الأنظمة، تجمع بين الفكر الإسلامي للحوكمة، وعلم الإدارة الحديث، وتصميم الأنظمة الرقمية، لتُهندس مؤسسات قادرة على القيادة، وتحقيق الأثر، والاستمرار.",
    heroCtaPrimary: "اطلب خدمة",
    heroCtaSecondary: "كيف نعمل معك",

    whyLabel: "لماذا دار نظم",
    whyHeading: "لماذا دار نظم",
    whyIntro: "نعمل على المستوى الذي يُحدث فرقًا حقيقيًا — هندسة الطريقة التي تُحكم بها مؤسستك وتُدار وتُشغّل، وصولًا إلى نظام مؤسسي حيّ ومستدام.",
    whyPillars: [
      {
        title: "نظام تشغيل جاهز للتطبيق",
        body: "نُسلّم نظامًا متكامل المعمارية، قابلًا للتشغيل داخل مؤسستك منذ اليوم الأول.",
      },
      {
        title: "ثلاثية متكاملة: شرعي · إداري · رقمي",
        body: "نجمع بين الفقه التطبيقي، وعلم الإدارة الحديث، وهندسة الأنظمة الرقمية في فريق واحد.",
      },
      {
        title: "مرافقة حتى التشغيل الكامل",
        body: "نواكب التطبيق، ونُدير التغيير، ونُمكّن الفِرَق إلى أن يصبح النظام عادةً يومية.",
      },
      {
        title: "تصميم مؤسسي واحد متكامل",
        body: "نُهندس نظامًا واحدًا تتسق فيه الحوكمة والإدارة والتقنية بدلًا من حلول متفرّقة.",
      },
    ],
    whatLabel: "ما الذي نُقدّمه",
    whatHeading: "ثلاث عدسات · نظام واحد",
    whatIntro: "كل التزام نتولاه يُصمَّم في ثلاث طبقات متشابكة، حتى لا تبقى الحوكمة معزولة عن الإدارة، ولا الإدارة معزولة عن التقنية.",
    whatLearnMore: "اعرف أكثر",
    whatDeliverablesToggle: "اعرض المخرجات الملموسة",

    flagshipEyebrow: "العرض المميّز",
    flagshipTitle: "تصميم نظام تشغيل المؤسسة",
    flagshipBody: "العرض الموقَّع لدار نظم — التزام واحد متكامل يدمج الأبعاد الثلاثة في مخطط تشغيل واحد لمؤسستك.",
    flagshipCta: "تعرّف على العرض المتكامل",

    howLabel: "المنهجية",
    howHeading: "كيف نعمل معك؟",
    howIntro: "مسار موحّد ومنضبط نتبعه في كل التزام عبر الأبعاد الثلاثة — لضمان أن التصميم لا يبقى على الورق.",
    howSteps: [
      { num: "01", title: "تشخيص", desc: "تقييم عميق متعدد الأبعاد للوضع الراهن، وتحديد فجوات الأولوية بأدلة لا انطباعات." },
      { num: "02", title: "تصميم", desc: "تصميم النظام المستهدف واعتماده مع أصحاب المصلحة — بنية وحوكمة وعمليات ونماذج جاهزة." },
      { num: "03", title: "تطبيق وتمكين", desc: "إطلاق النظام داخل المؤسسة عبر إدارة التغيير، وتأهيل الفِرَق، والتسليم التدريجي." },
      { num: "04", title: "تدقيق واستدامة", desc: "مراجعات دورية، ومؤشرات أثر، وآليات تحديث تجعل النظام حيًّا ومتجددًا." },
    ],

    engagementLabel: "نماذج التعاقد",
    engagementPills: [
      { name: "تشخيص", duration: "4 — 8 أسابيع" },
      { name: "تصميم نظام", duration: "3 — 6 أشهر" },
      { name: "تنفيذ وتحول", duration: "6 — 12 شهرًا" },
      { name: "توجيه تنفيذي", duration: "علاقة سنوية" },
    ],
    phasesAccordionToggle: "ما نُسلّمه في كل مرحلة",

    sectorsLabel: "نخدم 6 قطاعات",
    sectorsLink: "استكشف القطاعات",

    ecosystemLine: "مدعوم بمنظومة أكاديمية دار نظم والبحث العلمي — قادة مُؤهَّلون يُكمّلون النظام المُهندَس.",
    ecosystemLinkAcademy: "الأكاديمية",
    ecosystemLinkDiploma: "دبلوم القيادة المتكاملة",
    projectsLine: "اطّلع على نماذج من مشاريعنا الفعلية",
    projectsCta: "نماذج الأعمال",

    faqLabel: "الأسئلة الشائعة",
    faqTitle: "ما يسأل عنه القادة قبل التعاقد",

    finalLabel: "ابدأ الآن",
    finalTitle: "لنُصمّم النظام الذي تستحقه مؤسستك",
    finalBody: "أرسل طلبك الاستشاري وسيتواصل معك أحد مهندسي النظم خلال 48 ساعة عمل لتحديد جلسة تعارف وتقدير المشروع.",
    finalCta: "اطلب خدمة",

    backHome: "العودة إلى الخدمات",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbServices: "Services",
    breadcrumbCurrent: "Consulting",
    eyebrow: "System Design Institution",

    heroTagline: "We design the operating system of your organization — across its Sharia, management, and digital dimensions.",
    heroBody: "DarNozom is a system design institution combining Islamic governance thinking, modern management science, and digital systems design — to engineer organizations that lead, deliver impact, and endure.",
    heroCtaPrimary: "Request a Service",
    heroCtaSecondary: "See how we work",

    whyLabel: "Why DarNozom",
    whyHeading: "Why DarNozom",
    whyIntro: "We work at the level that actually changes outcomes — engineering how your organization is governed, managed, and operated — for a living, sustainable institutional system.",
    whyPillars: [
      {
        title: "An operating system ready to run",
        body: "We deliver a fully architected system your organization can put to work from day one.",
      },
      {
        title: "Tri-dimensional: Sharia · Management · Digital",
        body: "We combine applied jurisprudence, modern management science, and digital systems engineering in one team.",
      },
      {
        title: "Hands-on through full rollout",
        body: "We stay through implementation, change management, and team enablement until the system becomes daily practice.",
      },
      {
        title: "One integrated organizational design",
        body: "We engineer a single system where governance, management, and technology stay in sync — instead of point fixes.",
      },
    ],
    whatLabel: "What we deliver",
    whatHeading: "Three lenses · One system",
    whatIntro: "Every engagement is designed across three interlocking layers — so governance is never disconnected from management, and management is never disconnected from technology.",
    whatLearnMore: "Learn more",
    whatDeliverablesToggle: "See concrete deliverables",

    flagshipEyebrow: "Flagship Offer",
    flagshipTitle: "Organizational Operating System Design",
    flagshipBody: "The signature DarNozom engagement — one integrated commitment that bundles all three dimensions into a single operating blueprint for your organization.",
    flagshipCta: "Explore the integrated offer",

    howLabel: "Methodology",
    howHeading: "How we work with you?",
    howIntro: "A single disciplined path we apply to every engagement across the three dimensions — to ensure the design never stays on paper.",
    howSteps: [
      { num: "01", title: "Diagnose", desc: "Deep multi-dimensional assessment of the current state — surfacing real constraints, not symptoms." },
      { num: "02", title: "Design", desc: "Target system designed and approved with stakeholders — architecture, governance, processes, and ready models." },
      { num: "03", title: "Implement & Enable", desc: "Embedded rollout with change management, team enablement, and phased delivery inside the organization." },
      { num: "04", title: "Audit & Sustain", desc: "Periodic reviews, impact KPIs, and update mechanisms that keep the system living and evolving." },
    ],

    engagementLabel: "Engagement models",
    engagementPills: [
      { name: "Diagnostic", duration: "4 – 8 weeks" },
      { name: "System Design", duration: "3 – 6 months" },
      { name: "Transformation", duration: "6 – 12 months" },
      { name: "Advisory", duration: "Annual retainer" },
    ],
    phasesAccordionToggle: "What we deliver in each phase",

    sectorsLabel: "Serving 6 sectors",
    sectorsLink: "Explore the sectors",

    ecosystemLine: "Backed by the DarNozom Academy & Research ecosystem — qualified leaders who complete the engineered system.",
    ecosystemLinkAcademy: "Academy",
    ecosystemLinkDiploma: "Integrated Leadership Diploma",
    projectsLine: "Browse examples of our real-world engagements",
    projectsCta: "Case Studies",

    faqLabel: "FAQ",
    faqTitle: "What leaders ask before signing",

    finalLabel: "Get Started",
    finalTitle: "Let's design the system your organization deserves",
    finalBody: "Submit your consulting request and a Systems Architect will reach out within 48 business hours to schedule a discovery session and scope the engagement.",
    finalCta: "Request a Service",

    backHome: "Back to Services",
  },
} as const;

/* The three WHAT cards (one per dimension). */
const DOMAIN_CARDS = [
  {
    icon: Scale,
    name: { ar: "الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance" },
    promise: {
      ar: "نُصمّم منظومة الحوكمة الشرعية والمؤسسية بضوابط واضحة وتدقيق مستمر.",
      en: "We design Sharia and institutional governance with clear controls and continuous audit.",
    },
    bullets: {
      ar: ["مواثيق وأنظمة الحوكمة الشرعية", "إطار امتثال وتدقيق شرعي", "نموذج تشغيل مالي إسلامي"],
      en: ["Sharia governance charters & systems", "Compliance & Sharia audit framework", "Islamic financial operating model"],
    },
    href: "/services/islamic-systems",
  },
  {
    icon: Briefcase,
    name: { ar: "تميّز الإدارة", en: "Management Excellence" },
    promise: {
      ar: "نُعيد تصميم الطريقة التي تُدار بها المؤسسة — استراتيجية، هيكل، عمليات، أداء.",
      en: "We redesign how the organization is run — strategy, structure, operations, and performance.",
    },
    bullets: {
      ar: ["نموذج تشغيلي وهيكل تنظيمي", "بطاقات أداء ومؤشرات KPI", "إعادة تصميم العمليات والتميّز التشغيلي"],
      en: ["Operating model & org design", "KPI scorecards & performance system", "Process redesign & operational excellence"],
    },
    href: "/services/management-systems",
  },
  {
    icon: Laptop,
    name: { ar: "التحول الرقمي", en: "Digital Transformation" },
    promise: {
      ar: "نُحوّل المؤسسة إلى منظومة رقمية متكاملة — بيانات موثوقة، أنظمة مترابطة، أمن مُؤسَّس.",
      en: "We turn the organization into an integrated digital stack — trusted data, connected systems, embedded security.",
    },
    bullets: {
      ar: ["خارطة التحول الرقمي وبنية الأنظمة", "تخطيط موارد المؤسسة والأتمتة", "حوكمة البيانات والذكاء الاصطناعي والأمن"],
      en: ["Digital roadmap & systems architecture", "ERP & process automation", "Data, AI & cybersecurity governance"],
    },
    href: "/services/digital-transformation",
  },
];

const SECTORS = [
  { icon: Building2, name: { ar: "الشركات", en: "Corporate" } },
  { icon: HeartHandshake, name: { ar: "الأثر الاجتماعي", en: "NGO / Social Impact" } },
  { icon: Landmark, name: { ar: "القطاع العام", en: "Government" } },
  { icon: ScrollText, name: { ar: "الأوقاف", en: "Endowments" } },
  { icon: BookOpen, name: { ar: "مراكز الإفتاء", en: "Fatwa Centers" } },
  { icon: HelpingHand, name: { ar: "الجمعيات الخيرية", en: "Charities" } },
];

const PHASE_DELIVERABLES = [
  {
    step: { ar: "01 · تشخيص", en: "01 · Diagnose" },
    items: {
      ar: ["تقرير تشخيصي مؤسسي", "خريطة فجوات الأولوية", "قائمة قرارات مُلزمة للقيادة"],
      en: ["Institutional diagnostic report", "Priority gap map", "Decision-ready findings for leadership"],
    },
  },
  {
    step: { ar: "02 · تصميم", en: "02 · Design" },
    items: {
      ar: ["وثائق المعمارية المؤسسية والتشغيلية", "نماذج الحوكمة المعتمدة", "هيكل الأداء وبطاقات KPI", "مراجعة واعتماد مع أصحاب المصلحة"],
      en: ["Organizational & operating architecture documents", "Approved governance models", "Performance structure & KPI scorecards", "Stakeholder validation & approval"],
    },
  },
  {
    step: { ar: "03 · تطبيق وتمكين", en: "03 · Implement & Enable" },
    items: {
      ar: ["خطة الإطلاق المرحلية", "أدلة التشغيل والسياسات", "جلسات التمكين لفِرَق العميل"],
      en: ["Phased launch plan", "Operating playbooks & policies", "Enablement sessions for client teams"],
    },
  },
  {
    step: { ar: "04 · تدقيق واستدامة", en: "04 · Audit & Sustain" },
    items: {
      ar: ["مراجعات أداء دورية", "تقارير أثر ومؤشرات", "خطط تحسين مستمر"],
      en: ["Periodic performance reviews", "Impact reports & KPIs", "Continuous improvement plans"],
    },
  },
];

const TANGIBLE_DELIVERABLES = [
  { icon: ClipboardCheck, ar: "تقرير تشخيصي مؤسسي", en: "Institutional diagnostic report" },
  { icon: ScrollText, ar: "مواثيق الحوكمة الشرعية والمؤسسية", en: "Sharia & institutional governance charters" },
  { icon: Network, ar: "مخطط التصميم المؤسسي والتشغيلي", en: "Organizational & operating blueprint" },
  { icon: BarChart3, ar: "بطاقات أداء ومؤشرات KPI", en: "KPI scorecards & dashboards" },
  { icon: Rocket, ar: "خارطة طريق التحول لـ 12 — 24 شهرًا", en: "12 – 24 month transformation roadmap" },
  { icon: FileText, ar: "أدلة سياسات وإجراءات تشغيلية", en: "Operational policies & procedures playbooks" },
  { icon: Cpu, ar: "بنية الأنظمة الرقمية وخطة التطبيق", en: "Digital systems architecture & rollout plan" },
  { icon: Target, ar: "عرض تنفيذي لمجلس الإدارة", en: "Executive briefing deck for the board" },
];

const FAQS = [
  {
    q: { ar: "كم تستغرق الالتزامات الاستشارية عادةً؟", en: "How long do engagements typically take?" },
    a: { ar: "تتراوح من 4 — 8 أسابيع للتشخيص، إلى 6 — 12 شهرًا للتصميم والتنفيذ، وحتى علاقة سنوية متجددة في التوجيه التنفيذي.", en: "From 4 – 8 weeks for diagnostics, to 6 – 12 months for design and execution, up to an annual retainer for executive advisory." },
  },
  {
    q: { ar: "ما نموذج التسعير المتبع؟", en: "What is your pricing model?" },
    a: { ar: "نسعّر بحسب نطاق التزام محدد: رسوم ثابتة لمشاريع التشخيص والتصميم، ورسوم شهرية لدعم التنفيذ والتوجيه التنفيذي. كل عرض يأتي مع نطاق ومخرجات محددة كتابيًا.", en: "Pricing is scoped to each engagement: fixed-fee for diagnostics and design, monthly fees for execution support and advisory. Every proposal comes with a written scope and deliverables list." },
  },
  {
    q: { ar: "كيف تضمنون السرية والخصوصية؟", en: "How do you protect confidentiality?" },
    a: { ar: "نوقّع اتفاقية عدم إفصاح (NDA) قبل أي مناقشة معمّقة، ونعمل بفِرَق مغلقة مع ضوابط وصول للبيانات، ولا نُشير إلى أي عميل دون إذن خطّي صريح.", en: "We sign an NDA before any deep discussion, operate with closed teams and data-access controls, and never reference a client without explicit written consent." },
  },
  {
    q: { ar: "كيف تضمنون الانضباط الشرعي في التصميم؟", en: "How is Sharia rigor ensured in your designs?" },
    a: { ar: "نعمل وفق مرجعية فقهية تطبيقية، ونعرض نماذجنا على هيئات شرعية معتمدة، ونوثّق التخريج الفقهي في كل قرار يُؤثر على الحوكمة أو المالية.", en: "We work from an applied jurisprudence reference, run our models past recognized Sharia bodies, and document the jurisprudential basis behind every decision affecting governance or finance." },
  },
  {
    q: { ar: "كيف تتكاملون مع فرق العميل القائمة؟", en: "How do you integrate with the client's existing teams?" },
    a: { ar: "نعمل دائمًا مع فريق مرآة من العميل — نشاركهم التصميم، وننقل المعرفة، ونرافقهم حتى يصبحوا قادرين على تشغيل النظام بشكل مستقل.", en: "We always work alongside a mirror team from the client — co-designing, transferring knowledge, and accompanying them until they can run the system independently." },
  },
];

/* ─────────────────────────────────────────────────────────────────
   SHARED BITS — matches home.tsx's SectionLabel / RevealHeading look
───────────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px w-10 bg-secondary" />
      <span className="text-secondary text-xs font-bold tracking-[0.25em] uppercase">{children}</span>
    </div>
  );
}

function RevealHeading({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.h2>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */

export default function ServicesConsulting() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
      <SiteNav mode="page" />

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-36 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-white/40 text-xs mb-10 uppercase tracking-widest"
          >
            <Link href="/" className="hover:text-secondary transition-colors">{t.breadcrumbHome}</Link>
            <span className="text-white/20">·</span>
            <Link href="/services" className="hover:text-secondary transition-colors">{t.breadcrumbServices}</Link>
            <span className="text-white/20">·</span>
            <span className="text-secondary">{t.breadcrumbCurrent}</span>
          </motion.div>

          <div className="max-w-5xl">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-7"
            >
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.25em] uppercase">{t.eyebrow}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-black text-white leading-[1.05] mb-8"
              style={{ fontSize: "clamp(2.2rem, 4.8vw, 4.2rem)" }}
            >
              {t.heroTagline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/65 text-lg leading-relaxed max-w-3xl mb-10"
            >
              {t.heroBody}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/service-registration"
                className="inline-flex items-center gap-2 bg-secondary text-primary px-7 py-4 font-bold text-sm hover:bg-secondary/90 transition-colors"
                data-testid="hero-cta-rfp"
              >
                <FileText className="w-4 h-4" />
                {t.heroCtaPrimary}
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 border border-white/30 text-white px-7 py-4 font-bold text-sm hover:border-secondary hover:text-secondary transition-colors"
                data-testid="hero-cta-how"
              >
                {t.heroCtaSecondary}
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════ WHY ════════════════════ */}
      <section id="why" className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-6xl">
          <SectionLabel>{t.whyLabel}</SectionLabel>
          <RevealHeading
            className="font-black text-primary leading-tight mb-5"
            style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.75rem)" }}
          >
            {t.whyHeading}
          </RevealHeading>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-10">{t.whyIntro}</p>

          {/* Why pillars — positive value statements */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {t.whyPillars.map((pillar, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="border border-border bg-background p-6 flex items-start gap-4"
                data-testid={`why-pillar-${i}`}
              >
                <div className="w-9 h-9 bg-primary text-secondary flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-primary font-black leading-snug mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════ WHAT ════════════════════ */}
      <section id="what" className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12 max-w-6xl">
          <SectionLabel>{t.whatLabel}</SectionLabel>
          <RevealHeading
            className="font-black text-primary leading-tight mb-5"
            style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.75rem)" }}
          >
            {t.whatHeading}
          </RevealHeading>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-12">{t.whatIntro}</p>

          {/* 3 domain cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {DOMAIN_CARDS.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background border border-border p-7 hover:border-secondary/60 transition-colors flex flex-col"
                data-testid={`what-domain-${i}`}
              >
                <div className="w-12 h-12 bg-primary text-secondary flex items-center justify-center mb-5">
                  <d.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-primary text-lg mb-3 leading-snug">{d.name[language]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{d.promise[language]}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {d.bullets[language].map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2 text-sm text-primary">
                      <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <span className="leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={d.href}
                  className="inline-flex items-center gap-2 text-secondary text-sm font-bold border-t border-border pt-4 hover:gap-3 transition-all"
                  data-testid={`what-domain-link-${i}`}
                >
                  {t.whatLearnMore}
                  <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Flagship strip */}
          <div className="bg-primary text-primary-foreground border border-secondary/40 p-8 md:p-10 relative overflow-hidden mb-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
            <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span className="text-secondary text-[10px] font-bold tracking-[0.25em] uppercase">
                    {t.flagshipEyebrow}
                  </span>
                </div>
                <h3 className="font-black text-white leading-tight mb-3" style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)" }}>
                  {t.flagshipTitle}
                </h3>
                <p className="text-white/70 leading-relaxed max-w-2xl">{t.flagshipBody}</p>
              </div>
              <Link
                href="/service-registration"
                className="inline-flex items-center gap-2 bg-secondary text-primary px-6 py-4 font-bold text-sm hover:bg-secondary/90 transition-colors whitespace-nowrap"
                data-testid="flagship-cta"
              >
                {t.flagshipCta}
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>

          {/* Tangible deliverables accordion */}
          <Accordion type="single" collapsible className="border border-border bg-background">
            <AccordionItem value="deliverables" className="border-0">
              <AccordionTrigger
                className="px-5 py-4 text-sm font-bold text-primary hover:no-underline hover:bg-muted/30"
                data-testid="what-deliverables-toggle"
              >
                {t.whatDeliverablesToggle}
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  {TANGIBLE_DELIVERABLES.map((d, i) => (
                    <div
                      key={i}
                      className="bg-muted/20 border border-border p-4 flex items-start gap-3"
                    >
                      <d.icon className="w-5 h-5 text-secondary shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span className="text-primary font-bold text-xs leading-snug">{isArabic ? d.ar : d.en}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ════════════════════ HOW — mirrors home.tsx methodology ════════════════════ */}
      <section id="how" className="py-32 bg-background border-y border-border overflow-hidden">
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-14 max-w-4xl">
            <SectionLabel>{t.howLabel}</SectionLabel>
            <RevealHeading
              className="font-black text-primary font-serif flex items-center gap-4 mb-6"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              <span className="w-10 h-1 bg-secondary inline-block shrink-0" />
              {t.howHeading}
            </RevealHeading>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.howIntro}</p>
          </div>

          {/* 4-step grid — identical pattern to home.tsx */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {t.howSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-muted/30 border border-border p-6 relative flex flex-col"
                data-testid={`how-step-${i}`}
              >
                <div
                  className="w-10 h-10 rounded-full bg-primary text-secondary font-black text-sm flex items-center justify-center mb-4"
                  dir="ltr"
                >
                  {step.num}
                </div>
                <h3 className="text-base font-bold text-primary font-serif mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="max-w-5xl mx-auto space-y-10">
            {/* Engagement model pills */}
            <div>
              <div className="text-secondary text-[10px] font-bold tracking-[0.25em] uppercase mb-4">
                {t.engagementLabel}
              </div>
              <div className="flex flex-wrap gap-3">
                {t.engagementPills.map((p, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-3 border border-border bg-muted/30 px-4 py-2.5 min-h-[44px]"
                    data-testid={`how-engagement-${i}`}
                  >
                    <span className="text-primary font-bold text-sm">{p.name}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-muted-foreground text-xs">{p.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-phase deliverables accordion */}
            <Accordion type="single" collapsible className="border border-border bg-background">
              <AccordionItem value="phases" className="border-0">
                <AccordionTrigger
                  className="px-5 py-4 text-sm font-bold text-primary hover:no-underline hover:bg-muted/30"
                  data-testid="how-phases-toggle"
                >
                  {t.phasesAccordionToggle}
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    {PHASE_DELIVERABLES.map((p, i) => (
                      <div key={i} className="border border-border bg-muted/20 p-5">
                        <div className="text-secondary text-[10px] font-bold tracking-[0.25em] uppercase mb-3">
                          {p.step[language]}
                        </div>
                        <ul className="space-y-2">
                          {p.items[language].map((it, ii) => (
                            <li key={ii} className="flex items-start gap-2 text-sm text-primary">
                              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                              <span className="leading-snug">{it}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Sectors strip */}
            <Link
              href="/sectors"
              className="group block border border-border bg-muted/20 p-5 hover:border-secondary/60 hover:bg-background transition-colors"
              data-testid="how-sectors-link"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="text-secondary text-[10px] font-bold tracking-[0.25em] uppercase">
                    {t.sectorsLabel}
                  </div>
                  {SECTORS.map((s, i) => (
                    <div key={i} className="inline-flex items-center gap-2 text-primary text-sm">
                      <s.icon className="w-4 h-4 text-secondary" />
                      <span>{s.name[language]}</span>
                    </div>
                  ))}
                </div>
                <span className="inline-flex items-center gap-2 text-secondary text-xs font-bold whitespace-nowrap group-hover:gap-3 transition-all">
                  {t.sectorsLink}
                  <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                </span>
              </div>
            </Link>

            {/* Projects + Ecosystem one-liners */}
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/case-studies"
                className="group border border-border bg-background p-5 hover:border-secondary/60 transition-colors flex items-center justify-between gap-4"
                data-testid="how-projects-link"
              >
                <span className="text-sm text-primary font-bold leading-snug">{t.projectsLine}</span>
                <span className="inline-flex items-center gap-2 text-secondary text-xs font-bold whitespace-nowrap">
                  {t.projectsCta}
                  <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                </span>
              </Link>
              <div className="border border-border bg-background p-5 flex items-center gap-4">
                <GraduationCap className="w-6 h-6 text-secondary shrink-0" />
                <p className="text-sm text-primary leading-snug">
                  {t.ecosystemLine}{" "}
                  <Link href="/academy" className="text-secondary font-bold hover:underline" data-testid="ecosystem-link-academy">
                    {t.ecosystemLinkAcademy}
                  </Link>
                  {" · "}
                  <Link href="/academy/integrated-diploma" className="text-secondary font-bold hover:underline" data-testid="ecosystem-link-diploma">
                    {t.ecosystemLinkDiploma}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ FAQ ════════════════════ */}
      <FAQSection language={language} title={t.faqTitle} label={t.faqLabel} />

      {/* ════════════════════ FINAL CTA ════════════════════ */}
      <section className="py-24 dark bg-[#0F3D2E] text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.25em] uppercase">{t.finalLabel}</span>
            <div className="h-px w-10 bg-secondary" />
          </div>
          <h2 className="font-black text-white leading-tight mb-5" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}>
            {t.finalTitle}
          </h2>
          <p className="text-white/65 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">{t.finalBody}</p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/service-registration"
              className="inline-flex items-center gap-2 bg-secondary text-primary px-7 py-4 font-black text-sm hover:bg-secondary/90 transition-colors"
              data-testid="final-cta-rfp"
            >
              <FileText className="w-4 h-4" />
              {t.finalCta}
            </Link>
          </div>
        </div>
      </section>

      {/* Back link */}
      <section className="py-10 border-t border-border bg-[#F4ECD7]">
        <div className="container mx-auto px-6 md:px-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors font-semibold group"
            data-testid="link-back-to-services"
          >
            <ChevronLeft size={18} className={`group-hover:-translate-x-1 transition-transform ${isArabic ? "" : "rotate-180"}`} />
            <span>{t.backHome}</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FAQ accordion (kept inline; trimmed to top 5)
───────────────────────────────────────────────────────────────── */
function FAQSection({ language, title, label }: { language: "ar" | "en"; title: string; label: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 bg-background border-b border-border">
      <div className="container mx-auto px-6 md:px-12 max-w-4xl">
        <SectionLabel>{label}</SectionLabel>
        <h2 className="font-black text-primary leading-tight mb-10" style={{ fontSize: "clamp(1.85rem, 3.5vw, 2.75rem)" }}>
          {title}
        </h2>

        <div className="border border-border">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`${i > 0 ? "border-t border-border" : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 p-5 md:p-6 text-start hover:bg-muted/30 transition-colors min-h-[56px]"
                  data-testid={`faq-toggle-${i}`}
                  aria-expanded={isOpen}
                >
                  <span className="text-primary font-bold leading-snug">{faq.q[language]}</span>
                  {isOpen ? (
                    <Minus className="w-5 h-5 text-secondary shrink-0" />
                  ) : (
                    <Plus className="w-5 h-5 text-secondary shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 md:px-6 pb-6 -mt-1">
                    <p className="text-muted-foreground leading-relaxed">{faq.a[language]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
