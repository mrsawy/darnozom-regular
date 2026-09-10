import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Compass,
  Wrench,
  TrendingUp,
  Quote,
  FileText,
  Phone,
  Lock,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import CaseStudyCard from "@/components/case-study-card";
import NotFound from "@/pages/not-found";
import { getCaseStudyById, getRelatedCaseStudies } from "@/lib/case-studies";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

export default function CaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  const { language, isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;

  const caseStudy = id ? getCaseStudyById(id) : undefined;
  if (!caseStudy) return <NotFound />;

  const related = getRelatedCaseStudies(caseStudy, 3);

  const t = {
    breadcrumbHome: isArabic ? "الرئيسية" : "Home",
    breadcrumbCases: isArabic ? "نماذج الأعمال" : "Case Studies",
    backToAll: isArabic ? "العودة إلى جميع النماذج" : "Back to all case studies",
    confidentialityShort: isArabic
      ? "هوية العميل محجوبة بناءً على اتفاقية السرية المهنية."
      : "Client identity withheld under a professional confidentiality agreement.",

    challengeNumber: "01",
    challengeLabel: isArabic ? "التحدي" : "The Challenge",
    challengeSub: isArabic
      ? "السياق الذي بدأنا منه ومحاور المشكلة الأساسية."
      : "The starting context and the core dimensions of the problem.",

    approachNumber: "02",
    approachLabel: isArabic ? "المنهجية" : "Our Approach",
    approachSub: isArabic
      ? "كيف تعاملنا مع التحدي على مستوى المنهج."
      : "How we approached the challenge at the methodology level.",

    solutionNumber: "03",
    solutionLabel: isArabic ? "الحل" : "The Solution",
    solutionSub: isArabic
      ? "ما تم تصميمه وتسليمه فعلًا للعميل."
      : "What was actually designed and delivered to the client.",

    impactNumber: "04",
    impactLabel: isArabic ? "الأثر" : "Impact",
    impactSub: isArabic
      ? "المخرجات النوعية للمشروع — دون أرقام مالية مفصح عنها."
      : "Qualitative outcomes of the engagement — no disclosed financial figures.",

    voiceNumber: "05",
    voiceLabel: isArabic ? "صوت العميل" : "Client Voice",
    voiceSub: isArabic
      ? "اقتباس من العميل (هويته محجوبة عند الاقتضاء)."
      : "A quote from the client (identity withheld where applicable).",

    relatedTitle: isArabic ? "حالات ذات صلة" : "Related case studies",
    relatedSub: isArabic
      ? "حالات تشترك في القطاع أو خط الخدمة."
      : "Cases sharing the same industry or practice.",

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

  const tagChip = (label: string, tone: "primary" | "ghost" = "primary") => (
    <span
      className={`text-[10px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 border ${
        tone === "primary"
          ? "bg-secondary/15 text-secondary border-secondary/40"
          : "bg-white/5 text-white/80 border-white/20"
      }`}
    >
      {label}
    </span>
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground font-sans"
      dir={isArabic ? "rtl" : "ltr"}
      data-testid={`case-study-detail-${caseStudy.id}`}
    >
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-36 pb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-white/40 text-xs mb-10 uppercase tracking-widest flex-wrap"
          >
            <Link href="/" className="hover:text-secondary transition-colors">
              {t.breadcrumbHome}
            </Link>
            <span className="text-white/20">·</span>
            <Link href="/case-studies" className="hover:text-secondary transition-colors">
              {t.breadcrumbCases}
            </Link>
            <span className="text-white/20">·</span>
            <span className="text-secondary truncate max-w-[40ch]">
              {caseStudy.title[language]}
            </span>
          </motion.div>

          {/* Three-tag taxonomy header */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-wrap gap-2 mb-7"
          >
            {tagChip(caseStudy.tags.industry[language], "primary")}
            {tagChip(caseStudy.tags.practice[language], "ghost")}
            {tagChip(caseStudy.tags.geography[language], "ghost")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-black text-white leading-tight mb-6 max-w-4xl"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.75rem)" }}
          >
            {caseStudy.title[language]}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-white/70 text-lg max-w-3xl leading-relaxed mb-10"
          >
            {caseStudy.tagline[language]}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-start gap-3 bg-white/5 border border-secondary/30 px-5 py-3 max-w-2xl"
          >
            <Lock size={14} className="text-secondary mt-0.5 shrink-0" />
            <p className="text-white/70 text-xs leading-relaxed">
              {t.confidentialityShort}
            </p>
          </motion.div>
        </div>
      </section>

      {/* 01 — Challenge */}
      <ChapterSection
        number={t.challengeNumber}
        label={t.challengeLabel}
        sub={t.challengeSub}
        icon={<AlertTriangle size={16} className="text-secondary" />}
        bullets={caseStudy.challenge.map((c) => c[language])}
        background="bg-background"
      />

      {/* 02 — Approach */}
      <ChapterSection
        number={t.approachNumber}
        label={t.approachLabel}
        sub={t.approachSub}
        icon={<Compass size={16} className="text-secondary" />}
        bullets={caseStudy.approach.map((c) => c[language])}
        background="bg-muted/30"
      />

      {/* 03 — Solution */}
      <ChapterSection
        number={t.solutionNumber}
        label={t.solutionLabel}
        sub={t.solutionSub}
        icon={<Wrench size={16} className="text-secondary" />}
        bullets={caseStudy.solution.map((c) => c[language])}
        background="bg-background"
      />

      {/* 04 — Impact */}
      <section className="py-24 bg-primary text-primary-foreground border-y border-secondary/20">
        <div className="container mx-auto px-6 md:px-12">
          <ChapterHeader
            number={t.impactNumber}
            label={t.impactLabel}
            sub={t.impactSub}
            icon={<TrendingUp size={16} className="text-secondary" />}
            tone="dark"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {caseStudy.impact.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.05 }}
                className="border border-secondary/30 bg-white/5 p-6 relative"
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary" />
                {item.metric && (
                  <div className="font-black text-secondary tabular-nums leading-none mb-2 text-3xl">
                    {item.metric.value}
                  </div>
                )}
                <p className="text-white/85 leading-relaxed text-sm">
                  {item[language]}
                </p>
                {item.metric?.label && (
                  <p className="text-white/50 text-xs mt-2">
                    {item.metric.label[language]}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — Client Voice (optional) */}
      {caseStudy.clientVoice && (
        <section className="py-24 bg-background border-b border-border">
          <div className="container mx-auto px-6 md:px-12">
            <ChapterHeader
              number={t.voiceNumber}
              label={t.voiceLabel}
              sub={t.voiceSub}
              icon={<Quote size={16} className="text-secondary" />}
            />
            <figure className="max-w-3xl border-s-4 border-secondary ps-6 md:ps-8">
              <blockquote className="text-primary text-xl md:text-2xl font-medium leading-relaxed mb-4">
                “{caseStudy.clientVoice.quote[language]}”
              </blockquote>
              {caseStudy.clientVoice.attribution && (
                <figcaption className="text-muted-foreground text-sm">
                  — {caseStudy.clientVoice.attribution[language]}
                </figcaption>
              )}
            </figure>
          </div>
        </section>
      )}

      {/* Related cases (only when true matches exist) */}
      {related.length > 0 && (
        <section className="py-24 bg-muted/30 border-y border-border">
          <div className="container mx-auto px-6 md:px-12">
            <div className="mb-10">
              <div className="text-secondary text-xs font-bold tracking-[0.25em] uppercase mb-3">
                {t.relatedTitle}
              </div>
              <h2
                className="font-black text-primary leading-tight"
                style={{ fontSize: "clamp(1.75rem, 3vw, 2.4rem)" }}
              >
                {t.relatedSub}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((cs, i) => (
                <CaseStudyCard key={cs.id} caseStudy={cs} index={i} showCta />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to all (always visible) */}
      <section className="py-12 bg-background border-b border-border">
        <div className="container mx-auto px-6 md:px-12">
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 text-secondary font-bold border-b-2 border-secondary pb-1 hover:gap-3 transition-all w-fit"
            data-testid="link-back-all-cases"
          >
            {t.backToAll}
            <Arrow size={14} />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#F4ECD7] py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
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
              >
                <FileText size={16} />
                {t.requestCta}
                <Arrow size={16} className="group-hover:translate-x-[-2px] transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-3 border border-primary/30 text-primary px-8 py-4 font-bold text-base hover:border-secondary hover:text-secondary transition-colors"
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

function ChapterHeader({
  number,
  label,
  sub,
  icon,
  tone = "light",
}: {
  number: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";
  return (
    <div className="mb-10">
      <div className="flex items-center gap-5 mb-5">
        <span
          className="font-black text-secondary leading-none tabular-nums"
          style={{ fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}
        >
          {number}
        </span>
        <div className={`flex-1 h-px ${isDark ? "bg-white/15" : "bg-border"}`} />
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-secondary text-[10px] font-bold tracking-[0.3em] uppercase">
            {label}
          </span>
        </div>
      </div>
      <h2
        className={`font-black leading-tight mb-2 ${isDark ? "text-white" : "text-primary"}`}
        style={{ fontSize: "clamp(1.75rem, 3vw, 2.4rem)" }}
      >
        {label}
      </h2>
      <p
        className={`text-base md:text-lg leading-relaxed max-w-2xl ${
          isDark ? "text-white/60" : "text-muted-foreground"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}

function ChapterSection({
  number,
  label,
  sub,
  icon,
  bullets,
  background,
}: {
  number: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  bullets: string[];
  background: string;
}) {
  return (
    <section className={`py-24 ${background} border-b border-border`}>
      <div className="container mx-auto px-6 md:px-12">
        <ChapterHeader number={number} label={label} sub={sub} icon={icon} />
        <ul className="grid md:grid-cols-2 gap-x-10 gap-y-4 max-w-5xl">
          {bullets.map((b, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 text-base leading-relaxed text-foreground/85"
            >
              <span className="text-secondary mt-2.5 w-1.5 h-1.5 rounded-full bg-secondary inline-block shrink-0" />
              <span>{b}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
