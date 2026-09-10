import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronLeft, Mail, Phone, Building2, Users, Landmark,
  CheckCircle2, ArrowRight, GraduationCap, Workflow, Compass, Layers,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

interface ServiceCard {
  id: string;
  icon: React.ElementType;
  title: { ar: string; en: string };
  desc: { ar: string; en: string };
  bullets: { ar: string; en: string }[];
}

const SERVICES: ServiceCard[] = [
  {
    id: "custom-academies",
    icon: GraduationCap,
    title: { ar: "أكاديميات مخصّصة للمؤسسة", en: "Custom Institutional Academies" },
    desc: {
      ar: "نبني أكاديمية داخلية كاملة تعكس استراتيجية المؤسسة وقيمها، بمناهج ومستويات وشهادات خاصة بفرقك.",
      en: "We build a complete in-house academy that mirrors your institution's strategy and values, with curricula, levels, and certificates tailored to your teams.",
    },
    bullets: [
      { ar: "تصميم مناهج خاصة بأقسامك ومستوياتك الإدارية", en: "Curricula designed per department and management level" },
      { ar: "نظام شهادات داخلي مرتبط بالأداء والترقّي", en: "Internal certification linked to performance and promotion" },
      { ar: "تكامل مع أنظمة التعلّم الإلكتروني (LMS) للمؤسسة", en: "Integration with your enterprise LMS" },
    ],
  },
  {
    id: "leadership-development",
    icon: Layers,
    title: { ar: "تطوير قيادات تنفيذية", en: "Executive Leadership Development" },
    desc: {
      ar: "برامج مكثّفة لتطوير القيادات الحالية والقادمة، تجمع بين القيادة بالقيم والإدارة الحديثة وقيادة التحول الرقمي.",
      en: "Intensive programs that develop current and emerging leaders — combining values-based leadership, modern management, and digital transformation.",
    },
    bullets: [
      { ar: "ورش تنفيذية + إرشاد قيادي مستهدف", en: "Executive labs + targeted leadership mentoring" },
      { ar: "دراسات حالة وتدريبات على قرارات حقيقية", en: "Case studies and real decision exercises" },
      { ar: "مشاريع تكامل تنفيذي (Capstone) مع أثر مؤسسي", en: "Executive integration capstones with institutional impact" },
    ],
  },
  {
    id: "diplomas-cohorts",
    icon: Workflow,
    title: { ar: "دبلومات احترافية لفرق العمل", en: "Professional Diplomas for Teams" },
    desc: {
      ar: "تقديم دبلومات الأكاديمية المعتمدة (PMP, SHRM, AI for Business, الحوكمة الشرعية، الأمن السيبراني) لفرق المؤسسة في فوج مغلق.",
      en: "Deliver Academy diplomas (PMP path, SHRM, AI for Business, Sharia Governance, Cybersecurity) to your teams as a private cohort.",
    },
    bullets: [
      { ar: "أفواج خاصة بمؤسستك بمواعيد ولغة مرنة", en: "Private cohorts with flexible scheduling and language" },
      { ar: "تطبيقات وتقييمات مشتقّة من سياق مؤسستك", en: "Applied projects and assessments rooted in your context" },
      { ar: "تقارير أثر للمؤسسة بعد كل دفعة", en: "Per-cohort impact reports for the institution" },
    ],
  },
  {
    id: "capability-assessment",
    icon: Compass,
    title: { ar: "تقييم القدرات المؤسسية", en: "Institutional Capability Assessment" },
    desc: {
      ar: "تقييم متكامل لقدرات فرق المؤسسة في الحوكمة والإدارة والتحول الرقمي، يخرج بخريطة طريق تطويرية واضحة.",
      en: "A 360° assessment of your teams' capability in governance, management, and digital transformation, producing a clear development roadmap.",
    },
    bullets: [
      { ar: "تقييم شامل بالأبعاد الثلاثة (قيمي · إداري · رقمي)", en: "360° assessment across the three dimensions (values · management · digital)" },
      { ar: "ربط النتائج بخطة تدريب وأكاديمية مخصّصة", en: "Findings mapped to a training plan and custom academy" },
      { ar: "متابعة دورية لقياس التقدّم", en: "Periodic follow-up to measure progress" },
    ],
  },
];

const SECTORS = [
  {
    id: "corporate",
    icon: Building2,
    title: { ar: "الشركات والقطاع الخاص", en: "Corporate & Private Sector" },
    desc: {
      ar: "أكاديميات وقدرات قيادية للشركات الناشئة والمتوسطة والكبرى عبر مختلف القطاعات.",
      en: "Academies and leadership capability for startups, mid-caps, and enterprises across industries.",
    },
  },
  {
    id: "ngo",
    icon: Users,
    title: { ar: "المنظمات غير الربحية", en: "Non-Profit & NGOs" },
    desc: {
      ar: "بناء قدرات الفرق الإدارية والقيادية في المنظمات الإنسانية والتنموية والوقفية.",
      en: "Capability-building for management and leadership teams in humanitarian, development, and endowment organizations.",
    },
  },
  {
    id: "government",
    icon: Landmark,
    title: { ar: "القطاع الحكومي والعام", en: "Government & Public Sector" },
    desc: {
      ar: "برامج تأهيل قيادي للمسؤولين والمدراء في الجهات الحكومية والمؤسسات العامة.",
      en: "Leadership development programs for officials and managers in government bodies and public institutions.",
    },
  },
];

const PROCESS = [
  {
    n: "01",
    title: { ar: "اكتشاف وتشخيص", en: "Discovery & Diagnostics" },
    desc: {
      ar: "نلتقي بالمسؤولين، نحلّل احتياج القدرات، ونرسم صورة دقيقة عن الفجوات والفرص.",
      en: "We meet stakeholders, analyse capability needs, and draw an accurate picture of gaps and opportunities.",
    },
  },
  {
    n: "02",
    title: { ar: "تصميم المسار", en: "Program Design" },
    desc: {
      ar: "نصمم المسار التدريبي وهيكل الأكاديمية ومستويات الشهادات بما يتناسب مع مؤسستك.",
      en: "We design the learning track, academy structure, and certification levels tailored to your institution.",
    },
  },
  {
    n: "03",
    title: { ar: "التنفيذ والتدريب", en: "Delivery & Training" },
    desc: {
      ar: "تنفيذ البرامج عبر فريق الأكاديمية والمدرّبين المعتمدين بصيغ حضوريّة أو مدمجة أو عن بُعد.",
      en: "Programs delivered by Academy faculty and certified trainers — in-person, blended, or fully online.",
    },
  },
  {
    n: "04",
    title: { ar: "القياس والأثر", en: "Measurement & Impact" },
    desc: {
      ar: "تقارير دورية لقياس أثر التطوير على الأداء، وخطة استمرار طويلة المدى.",
      en: "Periodic reports measuring development impact on performance, plus a long-term continuity plan.",
    },
  },
];

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "للمؤسسات",
    eyebrow: "للمؤسسات",
    title: "أكاديميات قيادية مخصّصة لمؤسستك",
    intro:
      "تصمّم أكاديمية دار نظم برامج وأكاديميات مخصّصة للمؤسسات عبر القطاعات الثلاثة: الشركات، والمنظمات غير الربحية، والقطاع الحكومي — لبناء قدرات الفرق في الحوكمة والإدارة الحديثة وقيادة التحول الرقمي.",
    sectorsHeading: "نخدم القطاعات الثلاثة",
    sectorsSub: "لكل قطاع منهج خاص يجمع بين قيمه ومعاييره المهنية وأفضل الممارسات الحديثة.",
    servicesHeading: "ما الذي نقدّمه للمؤسسة",
    processHeading: "كيف نعمل معك",
    ctaTitle: "خطّط لأكاديمية مؤسستك",
    ctaDesc: "أرسل طلب عرض سعر تفصيلي، أو احجز جلسة استشارية لمناقشة احتياج مؤسستك مع فريقنا.",
    ctaRfp: "أرسل طلب عرض سعر",
    ctaConsult: "احجز جلسة استشارية",
    ctaWhatsapp: "تواصل عبر واتساب",
    backToAcademy: "العودة إلى الأكاديمية",
    whatsappLink: "https://wa.me/201022044240?text=أرغب في طلب أكاديمية مؤسسية من أكاديمية دار نظم",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "For Organizations",
    eyebrow: "For Organizations",
    title: "Custom Leadership Academies for Your Institution",
    intro:
      "Dar Nozom Academy designs custom programs and in-house academies for institutions across three sectors — corporate, non-profit, and public — building team capability in governance, modern management, and digital transformation leadership.",
    sectorsHeading: "We serve all three sectors",
    sectorsSub: "Each sector gets a tailored approach combining its values, professional standards, and modern best practices.",
    servicesHeading: "What we deliver for institutions",
    processHeading: "How we work with you",
    ctaTitle: "Plan your institutional academy",
    ctaDesc: "Send a detailed RFP or book a consultation to discuss your institution's needs with our team.",
    ctaRfp: "Submit an RFP",
    ctaConsult: "Book a Consultation",
    ctaWhatsapp: "Chat on WhatsApp",
    backToAcademy: "Back to the Academy",
    whatsappLink: "https://wa.me/201022044240?text=I would like to request an institutional academy from Dar Nozom Academy",
    copyright: "All rights reserved",
  },
} as const;

export default function AcademyForOrganizationsPage() {
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

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-5 mb-6"
            >
              <Building2 className="w-14 h-14 text-secondary shrink-0" strokeWidth={1.5} />
              <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}>
                {t.title}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-lg max-w-3xl leading-relaxed"
            >
              {t.intro}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4 mt-8"
            >
              <Link
                href="/service-registration?service=academy"
                className="inline-flex items-center gap-3 bg-secondary text-primary px-6 py-3 font-bold text-sm hover:bg-secondary/90 transition-all"
                data-testid="hero-rfp-button"
              >
                {t.ctaRfp}
                <ArrowRight className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 border border-white/20 text-white px-6 py-3 font-bold text-sm hover:border-secondary hover:text-secondary transition-colors"
                data-testid="hero-consult-button"
              >
                {t.ctaConsult}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="py-20 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "القطاعات" : "Sectors"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight mb-3" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
              {t.sectorsHeading}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t.sectorsSub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {SECTORS.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-muted/30 border border-border p-6 flex flex-col"
                data-testid={`sector-${s.id}`}
              >
                <s.icon className="w-9 h-9 text-secondary mb-4" strokeWidth={1.5} />
                <h3 className="font-black text-primary text-lg mb-2 leading-snug">{s.title[language]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc[language]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 bg-muted/20 border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "خدماتنا" : "Services"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
              {t.servicesHeading}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {SERVICES.map((sv, i) => (
              <motion.article
                key={sv.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-background border border-border hover:border-secondary/50 transition-colors p-7 flex flex-col"
                data-testid={`service-${sv.id}`}
              >
                <sv.icon className="w-10 h-10 text-secondary mb-4" strokeWidth={1.5} />
                <h3 className="font-black text-primary text-xl mb-3 leading-snug">{sv.title[language]}</h3>
                <p className="text-muted-foreground leading-relaxed mb-5">{sv.desc[language]}</p>
                <ul className="space-y-2 mt-auto">
                  {sv.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-primary font-semibold leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      {b[language]}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{isArabic ? "منهجيتنا" : "Approach"}</span>
            </div>
            <h2 className="font-black text-primary leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
              {t.processHeading}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {PROCESS.map((p, i) => (
              <motion.div
                key={p.n}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-muted/30 border border-border p-6 flex flex-col"
              >
                <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-2">
                  {isArabic ? `الخطوة ${p.n}` : `Step ${p.n}`}
                </div>
                <div className="text-primary font-black text-3xl leading-none opacity-20 mb-4">{p.n}</div>
                <h3 className="font-black text-primary text-lg mb-2 leading-snug">{p.title[language]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc[language]}</p>
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
              href="/service-registration?service=academy"
              className="inline-flex items-center gap-3 bg-secondary text-primary px-8 py-4 font-bold text-base hover:bg-secondary/90 transition-all"
              data-testid="cta-org-rfp"
            >
              {t.ctaRfp}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 border border-white/20 text-white px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
              data-testid="cta-org-consult"
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
