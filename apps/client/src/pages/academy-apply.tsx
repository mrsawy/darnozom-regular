import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, ArrowRight,
  GraduationCap, Layers, Building2, MessageSquare,
  Star, Award, Cpu, Crown, BookOpen, Compass,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { PROGRAMS } from "@/lib/site-content";
import { SiteFooter } from "@/components/site-footer";

const PROGRAM_ICONS: Record<string, React.ElementType> = {
  islamic: Star,
  management: Award,
  digital: Cpu,
  diploma: Crown,
};

const LEVELS = [
  {
    code: "01",
    slug: "foundation",
    name: { ar: "المستوى الأول — التأسيس", en: "Level 1 — Foundation" },
    desc: { ar: "للمهنيين الجدد والباحثين عن أساس متين.", en: "For early-career professionals seeking a solid foundation." },
  },
  {
    code: "02",
    slug: "management",
    name: { ar: "المستوى الثاني — الإدارة", en: "Level 2 — Management" },
    desc: { ar: "للمديرين وقادة الفرق والإدارات.", en: "For managers and team / department leaders." },
  },
  {
    code: "03",
    slug: "executive",
    name: { ar: "المستوى الثالث — القيادة التنفيذية", en: "Level 3 — Executive" },
    desc: { ar: "للقيادات التنفيذية وأصحاب القرار.", en: "For executive leaders and decision-makers." },
  },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "التقديم",
    eyebrow: "التقديم على الأكاديمية",
    title: "التقديم على أكاديمية دار نظم",
    intro:
      "اختر أحد المسارات الأربعة للتقديم: حسب البرنامج، أو حسب المستوى، أو حسب الدبلوم، أو حسب الكورس. كل مسار يفتح صفحته المتعلقة، ومنها تختار العنصر الذي تريده ثم تضغط زر التقديم لفتح نموذج التسجيل.",
    pathByProgram: "التقديم حسب البرنامج",
    pathByProgramDesc: "اختر أحد البرامج الأربعة وأرسل طلب الالتحاق به مباشرة.",
    pathByLevel: "التقديم حسب المستوى",
    pathByLevelDesc: "اختر المستوى المناسب لخبرتك المهنية الحالية وقدّم طلبك.",
    pathByDiploma: "التقديم حسب الدبلوم",
    pathByDiplomaDesc: "تصفّح كل دبلومات الأكاديمية المتخصصة، واختر الدبلوم الذي يناسبك ثم قدّم طلبك.",
    pathByCourse: "التقديم حسب الكورس",
    pathByCourseDesc: "تصفّح كل الكورسات الفردية عبر البرامج والمستويات الثلاثة، واختر الكورس الأنسب.",
    pathInstitutional: "طلب تدريب مؤسسي",
    pathInstitutionalDesc: "تدريب مفصّل لفريقك أو مؤسستك بمحتوى وخدمات قابلة للتخصيص.",
    bookConsult: "احجز جلسة استشارية",
    bookConsultDesc: "تحدّث مع فريق الأكاديمية لمساعدتك على اختيار البرنامج والمستوى الأنسب.",
    apply: "قدّم الآن",
    browseDiplomas: "تصفّح كل الدبلومات",
    browseCourses: "تصفّح كل الكورسات",
    institutionalCta: "أرسل طلبًا مؤسسيًا",
    bookCta: "احجز الجلسة",
    backToAcademy: "العودة إلى الأكاديمية",
    copyright: "جميع الحقوق محفوظة",
    flagshipBadge: "البرنامج الرائد",
    note: "بعد إرسال الطلب سيتواصل معك فريق الأكاديمية خلال أيام عمل قليلة.",
    quickAccessTitle: "خيارات إضافية",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Apply",
    eyebrow: "Academy Application",
    title: "Apply to DarNozom Academy",
    intro:
      "Choose one of four application paths: by Program, by Level, by Diploma, or by Course. Each path opens its related listing page where you pick the item you want and click Apply to open the registration form.",
    pathByProgram: "Apply by Program",
    pathByProgramDesc: "Pick one of the four programs and submit your application directly.",
    pathByLevel: "Apply by Level",
    pathByLevelDesc: "Choose the level that matches your current professional experience.",
    pathByDiploma: "Apply by Diploma",
    pathByDiplomaDesc: "Browse all specialized Academy diplomas, choose the one that fits, and apply.",
    pathByCourse: "Apply by Course",
    pathByCourseDesc: "Browse all individual courses across the three programs and three levels, then pick what fits you.",
    pathInstitutional: "Institutional Training Request",
    pathInstitutionalDesc: "A tailored training program for your team or organization with customizable content & services.",
    bookConsult: "Book a Consultation",
    bookConsultDesc: "Talk to the Academy team to help you choose the right program and level.",
    apply: "Apply Now",
    browseDiplomas: "Browse all diplomas",
    browseCourses: "Browse all courses",
    institutionalCta: "Send Institutional Request",
    bookCta: "Book the Consultation",
    backToAcademy: "Back to Academy",
    copyright: "All rights reserved",
    flagshipBadge: "Flagship",
    note: "After you submit, the Academy team will reach out within a few business days.",
    quickAccessTitle: "Other options",
  },
} as const;

export default function AcademyApplyPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";

  const PRIMARY_PATHS = [
    {
      id: "program",
      number: "01",
      icon: GraduationCap,
      title: t.pathByProgram,
      desc: t.pathByProgramDesc,
      anchor: "#by-program",
    },
    {
      id: "level",
      number: "02",
      icon: Layers,
      title: t.pathByLevel,
      desc: t.pathByLevelDesc,
      anchor: "#by-level",
    },
    {
      id: "diploma",
      number: "03",
      icon: Crown,
      title: t.pathByDiploma,
      desc: t.pathByDiplomaDesc,
      anchor: "#by-diploma",
    },
    {
      id: "course",
      number: "04",
      icon: BookOpen,
      title: t.pathByCourse,
      desc: t.pathByCourseDesc,
      anchor: "#by-course",
    },
  ];

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
              <GraduationCap className="w-14 h-14 text-secondary shrink-0" strokeWidth={1.5} />
              <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}>
                {t.title}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-lg max-w-3xl leading-relaxed"
            >
              {t.intro}
            </motion.p>

            {/* Anchor pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-10"
            >
              {PRIMARY_PATHS.map((p) => (
                <a
                  key={p.id}
                  href={p.anchor}
                  className="group flex items-start gap-3 border border-white/15 hover:border-secondary text-white/80 hover:text-secondary p-4 transition-colors"
                  data-testid={`pill-apply-${p.id}`}
                >
                  <p.icon className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-60 mb-0.5">{isArabic ? `المسار ${p.number}` : `Path ${p.number}`}</div>
                    <div className="text-sm font-bold leading-snug">{p.title}</div>
                  </div>
                </a>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Path 1: By Program */}
      <section className="py-20 bg-background border-b border-border" id="by-program">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المسار ٠١" : "Path 01"}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="w-7 h-7 text-secondary" />
              <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
                {t.pathByProgram}
              </h2>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">{t.pathByProgramDesc}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROGRAMS.map((p, i) => {
              const Icon = PROGRAM_ICONS[p.id] ?? GraduationCap;
              const flagshipStyle = p.flagship
                ? "bg-primary text-primary-foreground border-primary hover:border-secondary"
                : "bg-background text-primary border-border hover:border-secondary";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className={`border ${flagshipStyle} p-6 flex flex-col transition-all`}
                  data-testid={`apply-program-${p.id}`}
                >
                  {p.flagship && (
                    <div className="inline-flex items-center gap-1 bg-secondary text-primary px-2 py-1 text-[9px] font-black tracking-[0.2em] uppercase self-start mb-3">
                      {t.flagshipBadge}
                    </div>
                  )}
                  <Icon className={`w-7 h-7 mb-4 ${p.flagship ? "text-secondary" : "text-secondary"}`} strokeWidth={1.5} />
                  <div className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-60 ${p.flagship ? "text-primary-foreground" : "text-primary"}`}>
                    {p.subtitle[language]}
                  </div>
                  <h3 className={`font-black text-lg mb-2 leading-snug ${p.flagship ? "text-white" : "text-primary"}`}>
                    {p.title[language]}
                  </h3>
                  {p.tagline && (
                    <div className={`text-xs font-bold mb-4 opacity-75 ${p.flagship ? "text-secondary" : "text-secondary"}`}>
                      {p.tagline[language]}
                    </div>
                  )}
                  <p className={`text-sm leading-relaxed flex-1 mb-5 ${p.flagship ? "text-white/70" : "text-muted-foreground"}`}>
                    {p.desc[language]}
                  </p>
                  <Link
                    href={p.href}
                    data-testid={`apply-path-program-${p.id}`}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-colors ${
                      p.flagship
                        ? "bg-secondary text-primary hover:bg-secondary/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {t.apply}
                    <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? "rotate-180" : ""}`} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Path 2: By Level */}
      <section className="py-20 bg-muted/20 border-b border-border" id="by-level">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المسار ٠٢" : "Path 02"}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Layers className="w-7 h-7 text-secondary" />
              <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
                {t.pathByLevel}
              </h2>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">{t.pathByLevelDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {LEVELS.map((lvl, i) => (
              <motion.div
                key={lvl.code}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-background border border-border hover:border-secondary/50 transition-all p-6 flex flex-col"
                data-testid={`apply-level-${lvl.code}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? `المستوى ${lvl.code}` : `Level ${lvl.code}`}</div>
                  <div className="text-primary font-black text-3xl leading-none opacity-20">{lvl.code}</div>
                </div>
                <h3 className="font-black text-primary text-lg mb-3 leading-snug">{lvl.name[language]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">{lvl.desc[language]}</p>
                <Link
                  href={`/academy/courses?level=${lvl.slug}`}
                  data-testid={`apply-path-level-${lvl.slug}`}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {t.apply}
                  <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? "rotate-180" : ""}`} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Path 3: By Diploma */}
      <section className="py-20 bg-background border-b border-border" id="by-diploma">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end mb-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-10 bg-secondary" />
                <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المسار ٠٣" : "Path 03"}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Crown className="w-7 h-7 text-secondary" />
                <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
                  {t.pathByDiploma}
                </h2>
              </div>
              <p className="text-muted-foreground text-base leading-relaxed">{t.pathByDiplomaDesc}</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-primary text-primary-foreground p-8 md:p-10 border-r-4 border-secondary flex flex-col md:flex-row md:items-center justify-between gap-6"
            data-testid="apply-by-diploma-tile"
          >
            <div className="flex items-start gap-5 flex-1">
              <Crown className="w-10 h-10 text-secondary shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <h3 className="font-black text-white text-xl md:text-2xl mb-2 leading-snug">
                  {isArabic ? "كل الدبلومات المتخصصة" : "All Specialized Diplomas"}
                </h3>
                <p className="text-white/70 leading-relaxed">
                  {isArabic
                    ? "تصفّح كل دبلومات الأكاديمية عبر أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي. اختر الدبلوم الأنسب واضغط زر التقديم لفتح نموذج التسجيل."
                    : "Browse every Academy diploma across Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation. Pick the one that fits and click Apply to open the registration form."}
                </p>
              </div>
            </div>
            <Link
              href="/academy/diplomas"
              data-testid="apply-path-diploma"
              className="inline-flex items-center justify-center gap-3 bg-secondary text-primary px-7 py-4 font-bold text-sm hover:bg-secondary/90 transition-all whitespace-nowrap self-start md:self-auto"
            >
              {t.browseDiplomas}
              <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Path 4: By Course */}
      <section className="py-20 bg-muted/20 border-b border-border" id="by-course">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-end mb-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-10 bg-secondary" />
                <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "المسار ٠٤" : "Path 04"}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-7 h-7 text-secondary" />
                <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
                  {t.pathByCourse}
                </h2>
              </div>
              <p className="text-muted-foreground text-base leading-relaxed">{t.pathByCourseDesc}</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-background border border-border p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6"
            data-testid="apply-by-course-tile"
          >
            <div className="flex items-start gap-5 flex-1">
              <BookOpen className="w-10 h-10 text-secondary shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <h3 className="font-black text-primary text-xl md:text-2xl mb-2 leading-snug">
                  {isArabic ? "كل الكورسات الفردية" : "All Individual Courses"}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {isArabic
                    ? "أربعة وأربعون كورسًا فرديًا عبر البرامج الثلاثة والمستويات الثلاثة (تأسيس · إدارة · تنفيذي). صفِّ بالبرنامج والمستوى، اختر الكورس، ثم اضغط زر التقديم."
                    : "Forty-four individual courses across the three programs and three levels (Foundation · Management · Executive). Filter by program and level, pick a course, and click Apply."}
                </p>
              </div>
            </div>
            <Link
              href="/academy/courses"
              data-testid="apply-path-course"
              className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-all whitespace-nowrap self-start md:self-auto"
            >
              {t.browseCourses}
              <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Other options: Institutional + Consultation */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.quickAccessTitle}</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Institutional */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-primary text-primary-foreground p-10 border-r-4 border-secondary relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-7 h-7 text-secondary" />
                  <h2 className="font-black text-white leading-tight" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
                    {t.pathInstitutional}
                  </h2>
                </div>
                <p className="text-white/70 text-base leading-relaxed mb-8">{t.pathInstitutionalDesc}</p>
                <Link
                  href="/service-registration?service=academy"
                  data-testid="cta-institutional"
                  className="inline-flex items-center gap-3 bg-secondary text-primary px-7 py-3.5 font-bold text-sm hover:bg-secondary/90 transition-all"
                >
                  {t.institutionalCta}
                  <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                </Link>
              </div>
            </motion.div>

            {/* Book Consultation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-secondary/10 border border-secondary/30 p-10 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-7 h-7 text-secondary" />
                <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}>
                  {t.bookConsult}
                </h2>
              </div>
              <p className="text-muted-foreground text-base leading-relaxed mb-8 flex-1">{t.bookConsultDesc}</p>
              <Link
                href="/contact"
                data-testid="cta-consult"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-3.5 font-bold text-sm hover:bg-primary/90 transition-colors self-start"
              >
                <Mail className="w-4 h-4" />
                {t.bookCta}
              </Link>
            </motion.div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">{t.note}</p>
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
