import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, Crown, Star, Award, Cpu,
  CheckCircle2, Sparkles, ArrowRight,
  FlaskConical, Landmark, LineChart, Cog,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { PROGRAMS } from "@/lib/site-content";
import { SiteFooter } from "@/components/site-footer";

const FEEDERS = [
  {
    id: "islamic",
    icon: Star,
    title: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" },
    label: { ar: "البُعد القيمي والمرجعي", en: "Values & Reference" },
    desc: {
      ar: "الإطار الشرعي والقيمي الذي تنطلق منه القرارات الإدارية والرقمية.",
      en: "The Sharia and values framework that grounds management and digital decisions.",
    },
    href: "/academy/islamic-systems",
  },
  {
    id: "management",
    icon: Award,
    title: { ar: "الإدارة المهنية", en: "Professional Management" },
    label: { ar: "البُعد التشغيلي والقيادي", en: "Operational & Leadership" },
    desc: {
      ar: "نظام إدارة وقيادة متكامل يحوّل الرؤية إلى تنفيذ مؤسسي حقيقي.",
      en: "A full management and leadership system that turns vision into real institutional execution.",
    },
    href: "/academy/professional-management",
  },
  {
    id: "digital",
    icon: Cpu,
    title: { ar: "التحول الرقمي", en: "Digital Transformation" },
    label: { ar: "البُعد التقني والمستقبلي", en: "Technical & Future" },
    desc: {
      ar: "بناء قدرة المؤسسة على التحول الرقمي وتوظيف البيانات والذكاء الاصطناعي.",
      en: "Build the institution's ability to transform digitally and leverage data and AI.",
    },
    href: "/academy/digital-transformation",
  },
];

const CAPSTONE_BLOCKS = [
  {
    title: { ar: "ورشة التكامل التنفيذي", en: "Executive Integration Workshop" },
    desc: {
      ar: "ورش تنفيذية تدمج المعرفة الشرعية والإدارية والرقمية في حالات قيادية حقيقية.",
      en: "Executive workshops that integrate Sharia, managerial, and digital knowledge into real leadership cases.",
    },
  },
  {
    title: { ar: "مشروع تكامل مؤسسي", en: "Institutional Integration Project" },
    desc: {
      ar: "مشروع تطبيقي على مؤسسة المشارك يحوّل الدبلوم إلى أثر حقيقي على أرض الواقع.",
      en: "An applied project on the participant's organization that turns the diploma into real-world impact.",
    },
  },
  {
    title: { ar: "لوحة قيادة تنفيذية متكاملة", en: "Integrated Executive Dashboard" },
    desc: {
      ar: "تصميم لوحة قيادة تنفيذية تجمع المؤشرات الشرعية والإدارية والرقمية للمؤسسة.",
      en: "Design an executive dashboard combining the institution's Sharia, managerial, and digital indicators.",
    },
  },
];

const EXEC_PROGRAMS = [
  {
    id: "strategy-labs",
    icon: FlaskConical,
    name: { ar: "مختبرات الاستراتيجية", en: "Strategy Labs" },
    desc: {
      ar: "ورش تنفيذية مكثّفة (٢–٥ أيام) يجتمع فيها فريقك التنفيذي مع خبراء دار نظم لصياغة الاستراتيجية وخارطة الطريق.",
      en: "Intensive 2–5 day executive workshops where your team works with DarNozom experts to shape strategy and roadmap.",
    },
  },
  {
    id: "governance-simulation",
    icon: Landmark,
    name: { ar: "محاكاة الحوكمة", en: "Governance Simulation" },
    desc: {
      ar: "محاكاة عالية الواقعية يقود فيها المشاركون مجلس إدارة أو لجنة حوكمة، ويتعاملون مع قرارات حقيقية بإطار شرعي ومؤسسي.",
      en: "High-fidelity simulation in which participants run a board or governance committee, handling real decisions in a Sharia and corporate frame.",
    },
  },
  {
    id: "financial-decision-systems",
    icon: LineChart,
    name: { ar: "نظم القرار المالي", en: "Financial Decision Systems" },
    desc: {
      ar: "برنامج تنفيذي يبني قدرة القيادات على تقييم الاستثمارات وتحليل المخاطر واتخاذ القرارات المالية الكبرى.",
      en: "An executive program that builds leadership capacity to evaluate investments, analyze risk, and make major financial decisions.",
    },
  },
  {
    id: "institutional-transformation",
    icon: Cog,
    name: { ar: "التحوّل المؤسسي", en: "Institutional Transformation" },
    desc: {
      ar: "برنامج طويل النفس يقود فيه المشارك تحوّلًا حقيقيًا في مؤسسته يجمع بين النموذج التشغيلي والحوكمة والتحول الرقمي.",
      en: "A long-arc program in which the participant leads a real institutional transformation — combining operating model, governance, and digital activation.",
    },
  },
];

const OUTCOMES = [
  { ar: "قائد تنفيذي يفكّر بمنطق متكامل: قيمة + إدارة + تقنية.", en: "An executive leader who thinks integrally: values + management + technology." },
  { ar: "قدرة على تصميم نموذج تشغيلي مؤسسي حديث ومنضبط شرعيًا.", en: "Ability to design a modern, Sharia-disciplined institutional operating model." },
  { ar: "إتقان قيادة فرق متعددة التخصصات (شرعية، إدارية، رقمية).", en: "Mastery of leading cross-functional teams (Sharia, management, digital)." },
  { ar: "أثر مؤسسي قابل للقياس عبر مشروع التكامل التنفيذي.", en: "Measurable institutional impact through the executive integration project." },
  { ar: "شبكة قيادية رفيعة من خرّيجي البرنامج الرائد للأكاديمية.", en: "A high-caliber leadership network of the Academy's flagship graduates." },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "دبلوم القيادة المتكاملة",
    flagshipBadge: "البرنامج الرائد",
    eyebrow: "دبلوم القيادة المتكاملة",
    overviewHeading: "نظرة عامة",
    overview:
      "دبلوم القيادة المتكاملة هو البرنامج الرائد لأكاديمية دار نظم. يُعِدّ قيادات تنفيذية لا تنتمي إلى تخصص واحد بل تجمع بين أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي في تجربة قيادية واحدة. يختتم الدبلوم بمرحلة تكامل تنفيذي يحوّل خلالها المشارك ما تعلّمه إلى مشروع مؤسسي حقيقي.",
    structureHeading: "بنية الدبلوم",
    structureSubheading: "الدبلوم يدمج البرامج الثلاثة للأكاديمية في رحلة قيادية واحدة:",
    capstoneHeading: "التكامل التنفيذي · الكابستون",
    capstoneSubheading: "المرحلة الختامية التي تحوّل الدبلوم من دراسة إلى أثر مؤسسي حقيقي.",
    execHeading: "البرامج التنفيذية المصاحبة",
    execSubheading: "إلى جانب الدبلوم الرائد، يقدّم فريق دار نظم تجارب تنفيذية مكثّفة قابلة للحجز فرديًا أو كبرنامج مغلق لفريقك التنفيذي.",
    execEyebrow: "للقيادات التنفيذية",
    execNote: "تُقدَّم بصيغة نزل تنفيذي مكثّف · برنامج مغلق داخل المؤسسة · أو هجين (حضوري + افتراضي).",
    outcomesHeading: "مخرجات الدبلوم",
    ctaTitle: "هل أنت مستعد لقيادة المؤسسة بنموذج متكامل؟",
    ctaDesc: "قدّم طلب الالتحاق بالدبلوم الرائد، أو احجز جلسة استشارية مع فريق الأكاديمية.",
    ctaApply: "قدّم على الدبلوم",
    ctaConsult: "احجز جلسة استشارية",
    backToAcademy: "العودة إلى الأكاديمية",
    explore: "تصفّح البرنامج",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Integrated Leadership Diploma",
    flagshipBadge: "Flagship Program",
    eyebrow: "Integrated Leadership Diploma",
    overviewHeading: "Overview",
    overview:
      "The Integrated Leadership Diploma is DarNozom Academy's flagship program. It prepares executive leaders who don't belong to one discipline but combine Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation into a single leadership experience. The diploma concludes with an executive integration phase where the participant turns what they learned into a real institutional project.",
    structureHeading: "Diploma Structure",
    structureSubheading: "The diploma integrates the Academy's three programs into one leadership journey:",
    capstoneHeading: "Executive Integration · Capstone",
    capstoneSubheading: "The final phase that turns the diploma from study into real institutional impact.",
    execHeading: "Companion Executive Programs",
    execSubheading: "Alongside the flagship diploma, DarNozom offers intensive executive experiences — bookable individually, or as a closed program for your executive team.",
    execEyebrow: "For executives",
    execNote: "Delivered as Executive Retreats · Closed in-house programs · or Hybrid (in-person + virtual).",
    outcomesHeading: "Diploma Outcomes",
    ctaTitle: "Ready to lead with an integrated model?",
    ctaDesc: "Apply for the flagship diploma, or book a consultation with the Academy team.",
    ctaApply: "Apply for the Diploma",
    ctaConsult: "Book a Consultation",
    backToAcademy: "Back to Academy",
    explore: "Explore program",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyDiplomaPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";
  const program = PROGRAMS.find(p => p.id === "diploma")!;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
      <SiteNav mode="page" />

      {/* Hero — flagship */}
      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-36 pb-28 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-0 text-[14rem] font-black text-secondary/5 leading-none select-none pointer-events-none">D</div>

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
              className="inline-flex items-center gap-2 mb-8 bg-secondary text-primary px-4 py-2 font-black text-xs tracking-[0.2em] uppercase"
            >
              <Sparkles size={14} />
              {t.flagshipBadge}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-5 mb-6"
            >
              <Crown className="w-16 h-16 text-secondary shrink-0 mt-2" strokeWidth={1.5} />
              <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
                {program.title[language]}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/70 text-xl max-w-3xl leading-relaxed"
            >
              {program.tagline?.[language]}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/academy/apply"
                className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
              >
                {t.ctaApply}
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
              >
                {t.ctaConsult}
              </Link>
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

      {/* Structure — 3 feeder programs */}
      <section className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "الهيكل" : "Structure"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-3" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {t.structureHeading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.structureSubheading}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEEDERS.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background border border-border hover:border-secondary/50 transition-all p-8 flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <f.icon className="w-9 h-9 text-secondary" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">0{i + 1}</span>
                </div>
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">
                  {f.label[language]}
                </div>
                <h3 className="font-black text-primary text-xl mb-3 leading-snug">{f.title[language]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">{f.desc[language]}</p>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Link
                    href={f.href}
                    className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary hover:text-secondary transition-colors group"
                  >
                    <span>{t.explore}</span>
                    <ArrowRight className={`w-3 h-3 group-hover:translate-x-1 transition-transform ${isArabic ? "rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0" : ""}`} />
                  </Link>
                  <Link
                    href={`/academy/register?program=${f.id}`}
                    data-testid={`apply-feeder-${f.id}`}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-secondary hover:text-secondary/80"
                  >
                    {isArabic ? "قدّم الآن" : "Apply"}
                    <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Executive Integration — Capstone */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "البرنامج التتويجي" : "Capstone"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-3" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {t.capstoneHeading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.capstoneSubheading}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {CAPSTONE_BLOCKS.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-primary text-primary-foreground p-7 border-r-4 border-secondary"
              >
                <div className="text-secondary text-[10px] font-bold tracking-[0.2em] uppercase mb-3">{isArabic ? `الوحدة 0${i + 1}` : `Block 0${i + 1}`}</div>
                <h3 className="font-black text-white text-lg mb-3 leading-snug">{b.title[language]}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{b.desc[language]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Companion Executive Programs */}
      <section className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.execEyebrow}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-3" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
              {t.execHeading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.execSubheading}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {EXEC_PROGRAMS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.07 }}
                className="bg-background border border-border hover:border-secondary/60 transition-all p-7 flex gap-5"
                data-testid={`exec-program-${p.id}`}
              >
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-secondary/10 flex items-center justify-center">
                    <p.icon className="w-6 h-6 text-secondary" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="font-black text-primary text-lg mb-2 leading-snug">{p.name[language]}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc[language]}</p>
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <Link
                      href={`/academy/register?program=integrated-diploma&exec=${p.id}`}
                      data-testid={`apply-exec-${p.id}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-secondary hover:text-secondary/80"
                    >
                      {isArabic ? "قدّم على البرنامج" : "Apply for program"}
                      <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-8 text-sm text-muted-foreground italic max-w-3xl">{t.execNote}</p>
        </div>
      </section>

      {/* Outcomes */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المخرجات" : "Outcomes"}</span>
          </div>
          <h2 className="font-black text-primary leading-tight mb-12" style={{ fontSize: "clamp(2rem, 3.5vw, 2.75rem)" }}>
            {t.outcomesHeading}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 max-w-5xl">
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
                <div className="text-primary leading-relaxed font-semibold">{o[language]}</div>
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
              href="/academy/apply"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
            >
              {t.ctaApply}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
            >
              <Mail className="w-4 h-4" />
              {t.ctaConsult}
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
