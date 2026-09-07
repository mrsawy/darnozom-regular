import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  GraduationCap, ChevronLeft, Loader2, CheckCircle2, AlertTriangle,
  ArrowRight, Mail, Phone,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { PROGRAMS } from "@/lib/site-content";
import { COURSES } from "@/lib/academy-courses";
import { DIPLOMAS } from "@/lib/academy-diplomas";
import { SiteFooter } from "@/components/site-footer";

const T = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbAcademy: "الأكاديمية",
    breadcrumbCurrent: "تسجيل التقديم",
    eyebrow: "نموذج التسجيل",
    title: "سجّل بياناتك للتقديم",
    intro: "أكمل البيانات أدناه ليتواصل معك فريق الأكاديمية. سيتم إرسال طلبك مباشرةً إلى info@darnozom.com وحفظه في لوحة التحكم.",
    applyingFor: "تقديم على:",
    typeProgram: "برنامج",
    typeLevel: "مستوى",
    typeDiploma: "دبلوم",
    typeCourse: "كورس",
    typeExec: "برنامج تنفيذي",
    typePath: "مسار مهني",
    typeGeneral: "تقديم عام",
    fullName: "الاسم الكامل *",
    email: "البريد الإلكتروني *",
    phone: "رقم الهاتف *",
    organization: "الجهة / المؤسسة",
    country: "الدولة",
    notes: "ملاحظات إضافية (اختياري)",
    notesPlaceholder: "أخبرنا عن خبرتك أو أي أسئلة لديك…",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال…",
    successTitle: "تم استلام طلبك",
    successDesc: "شكرًا لك! استلمنا طلبك بنجاح. سيتواصل معك فريق الأكاديمية خلال أيام عمل قليلة.",
    backToAcademy: "العودة إلى الأكاديمية",
    browseAll: "تصفّح كل البرامج",
    errorGeneric: "تعذّر إرسال الطلب. حاول مرة أخرى أو راسلنا على info@darnozom.com.",
    requiredHint: "* الحقول الإلزامية",
    levelFoundation: "المستوى الأول — التأسيس",
    levelManagement: "المستوى الثاني — الإدارة",
    levelExecutive: "المستوى الثالث — القيادة التنفيذية",
    copyright: "جميع الحقوق محفوظة",
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbAcademy: "Academy",
    breadcrumbCurrent: "Apply",
    eyebrow: "Application Form",
    title: "Submit your application",
    intro: "Fill in your details below and the Academy team will be in touch. Your application is sent directly to info@darnozom.com and stored in the admin panel.",
    applyingFor: "Applying for:",
    typeProgram: "Program",
    typeLevel: "Level",
    typeDiploma: "Diploma",
    typeCourse: "Course",
    typeExec: "Executive program",
    typePath: "Career Path",
    typeGeneral: "General application",
    fullName: "Full name *",
    email: "Email *",
    phone: "Phone *",
    organization: "Organization",
    country: "Country",
    notes: "Additional notes (optional)",
    notesPlaceholder: "Tell us about your experience or any questions you have…",
    submit: "Submit application",
    submitting: "Submitting…",
    successTitle: "Application received",
    successDesc: "Thank you! We received your application. The Academy team will contact you within a few business days.",
    backToAcademy: "Back to Academy",
    browseAll: "Browse all programs",
    errorGeneric: "Couldn't submit your application. Please try again or email info@darnozom.com.",
    requiredHint: "* Required fields",
    levelFoundation: "Level 1 — Foundation",
    levelManagement: "Level 2 — Management",
    levelExecutive: "Level 3 — Executive",
    copyright: "All rights reserved",
  },
} as const;

const LEVEL_LABELS: Record<string, { ar: string; en: string }> = {
  foundation: { ar: "المستوى الأول — التأسيس", en: "Level 1 — Foundation" },
  "1": { ar: "المستوى الأول — التأسيس", en: "Level 1 — Foundation" },
  management: { ar: "المستوى الثاني — الإدارة", en: "Level 2 — Management" },
  "2": { ar: "المستوى الثاني — الإدارة", en: "Level 2 — Management" },
  executive: { ar: "المستوى الثالث — القيادة التنفيذية", en: "Level 3 — Executive" },
  "3": { ar: "المستوى الثالث — القيادة التنفيذية", en: "Level 3 — Executive" },
};

interface ResolvedContext {
  applyType: "program" | "level" | "diploma" | "course" | "exec" | "path" | "general";
  programId: string | null;
  levelCode: string | null;
  diplomaId: string | null;
  courseId: string | null;
  execProgramId: string | null;
  contextLabelAr: string;
  contextLabelEn: string;
  typeLabel: { ar: string; en: string };
}

const PATH_LABELS: Record<string, { ar: string; en: string }> = {
  "early-career": { ar: "مسار بداية المسيرة المهنية", en: "Early Career Path" },
  "managerial": { ar: "المسار الإداري", en: "Managerial Path" },
  "executive": { ar: "المسار التنفيذي", en: "Executive Path" },
};

function parseQuery(search: string): URLSearchParams {
  const q = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(q);
}

function resolveContext(qs: URLSearchParams, t: (typeof T)[keyof typeof T]): ResolvedContext {
  const programParam = qs.get("program");
  const levelParam = qs.get("level");
  const diplomaParam = qs.get("diploma");
  const courseParam = qs.get("course");
  const execParam = qs.get("exec");
  const pathParam = qs.get("path");
  const typeParam = qs.get("type");

  const program = programParam ? PROGRAMS.find(p => p.id === programParam) : null;
  // Diplomas may arrive by id (slug) or by EN name (legacy)
  const diploma = diplomaParam
    ? DIPLOMAS.find(d => d.id === diplomaParam) ||
      DIPLOMAS.find(d => d.name.en === decodeURIComponent(diplomaParam))
    : null;
  // Courses may arrive by id (slug) or by EN name (legacy)
  const course = courseParam
    ? COURSES.find(c => c.id === courseParam) ||
      COURSES.find(c => c.name.en === decodeURIComponent(courseParam))
    : null;

  const lvl = levelParam ? LEVEL_LABELS[levelParam.toLowerCase()] : null;

  // Prioritize specificity: course > diploma > exec > level > program
  if (course) {
    const programLabel = PROGRAMS.find(p => p.id === course.program);
    return {
      applyType: "course",
      programId: course.program,
      levelCode: null,
      diplomaId: null,
      courseId: course.id,
      execProgramId: null,
      contextLabelAr: `${course.name.ar}${programLabel ? ` · ${programLabel.title.ar}` : ""}`,
      contextLabelEn: `${course.name.en}${programLabel ? ` · ${programLabel.title.en}` : ""}`,
      typeLabel: { ar: t.typeCourse, en: T.en.typeCourse },
    };
  }
  if (diploma) {
    const programLabel = PROGRAMS.find(p => p.id === diploma.program);
    return {
      applyType: "diploma",
      programId: diploma.program,
      levelCode: null,
      diplomaId: diploma.id,
      courseId: null,
      execProgramId: null,
      contextLabelAr: `${diploma.name.ar}${programLabel ? ` · ${programLabel.title.ar}` : ""}`,
      contextLabelEn: `${diploma.name.en}${programLabel ? ` · ${programLabel.title.en}` : ""}`,
      typeLabel: { ar: t.typeDiploma, en: T.en.typeDiploma },
    };
  }
  if (execParam && program) {
    return {
      applyType: "exec",
      programId: program.id,
      levelCode: null,
      diplomaId: null,
      courseId: null,
      execProgramId: execParam,
      contextLabelAr: `${execParam} · ${program.title.ar}`,
      contextLabelEn: `${execParam} · ${program.title.en}`,
      typeLabel: { ar: t.typeExec, en: T.en.typeExec },
    };
  }
  if (pathParam && PATH_LABELS[pathParam]) {
    const p = PATH_LABELS[pathParam];
    return {
      applyType: "path",
      programId: null,
      levelCode: null,
      diplomaId: null,
      courseId: null,
      execProgramId: pathParam,
      contextLabelAr: p.ar,
      contextLabelEn: p.en,
      typeLabel: { ar: t.typePath, en: T.en.typePath },
    };
  }
  if (lvl) {
    const programSuffixAr = program ? ` · ${program.title.ar}` : "";
    const programSuffixEn = program ? ` · ${program.title.en}` : "";
    return {
      applyType: "level",
      programId: program?.id ?? null,
      levelCode: levelParam,
      diplomaId: null,
      courseId: null,
      execProgramId: null,
      contextLabelAr: `${lvl.ar}${programSuffixAr}`,
      contextLabelEn: `${lvl.en}${programSuffixEn}`,
      typeLabel: { ar: t.typeLevel, en: T.en.typeLevel },
    };
  }
  if (program) {
    return {
      applyType: "program",
      programId: program.id,
      levelCode: null,
      diplomaId: null,
      courseId: null,
      execProgramId: null,
      contextLabelAr: program.title.ar,
      contextLabelEn: program.title.en,
      typeLabel: { ar: t.typeProgram, en: T.en.typeProgram },
    };
  }
  return {
    applyType: typeParam === "general" || !typeParam ? "general" : "general",
    programId: null,
    levelCode: null,
    diplomaId: null,
    courseId: null,
    execProgramId: null,
    contextLabelAr: "",
    contextLabelEn: "",
    typeLabel: { ar: t.typeGeneral, en: T.en.typeGeneral },
  };
}

export default function AcademyRegisterPage() {
  const { language, isArabic } = useLanguage();
  const t = T[language];
  const dir = isArabic ? "rtl" : "ltr";
  const search = useSearch();

  const ctx = useMemo(() => resolveContext(parseQuery(search), t), [search, t]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    country: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [success]);

  function update<K extends keyof typeof form>(key: K, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/academy/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyType: ctx.applyType,
          programId: ctx.programId,
          levelCode: ctx.levelCode,
          diplomaId: ctx.diplomaId,
          courseId: ctx.courseId,
          execProgramId: ctx.execProgramId,
          contextLabelAr: ctx.contextLabelAr,
          contextLabelEn: ctx.contextLabelEn,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          organization: form.organization,
          country: form.country,
          notes: form.notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data && typeof data.error === "string" ? data.error : null) || t.errorGeneric);
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
      <SiteNav mode="page" />

      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-32 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-8" aria-label="breadcrumb">
            <Link href="/" className="hover:text-secondary">{t.breadcrumbHome}</Link>
            <ChevronLeft className={`w-3 h-3 ${isArabic ? "" : "rotate-180"}`} />
            <Link href="/academy" className="hover:text-secondary">{t.breadcrumbAcademy}</Link>
            <ChevronLeft className={`w-3 h-3 ${isArabic ? "" : "rotate-180"}`} />
            <span className="text-secondary">{t.breadcrumbCurrent}</span>
          </nav>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-10 bg-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.eyebrow}</span>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <GraduationCap className="w-12 h-12 text-secondary" strokeWidth={1.5} />
            <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}>
              {t.title}
            </h1>
          </div>
          <p className="text-white/70 text-base md:text-lg leading-relaxed max-w-3xl">{t.intro}</p>
        </div>
      </section>

      <section className="py-14 bg-[#F4ECD7] islamic-pattern">
        <div className="container mx-auto px-6 md:px-12 max-w-3xl">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background border border-secondary p-10 text-center"
              data-testid="apply-success"
            >
              <CheckCircle2 className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="font-black text-primary text-2xl mb-3">{t.successTitle}</h2>
              <p className="text-muted-foreground leading-relaxed mb-8">{t.successDesc}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/academy"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs hover:bg-primary/90 transition-colors"
                  data-testid="link-back-to-academy"
                >
                  <ChevronLeft className={`w-3 h-3 ${isArabic ? "" : "rotate-180"}`} />
                  {t.backToAcademy}
                </Link>
                <Link
                  href="/academy/courses"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-border text-primary font-bold tracking-widest uppercase text-xs hover:border-secondary hover:text-secondary transition-colors"
                >
                  {t.browseAll}
                  <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="bg-card border border-secondary/20 shadow-[0_12px_40px_rgba(15,61,46,0.06)] p-8 md:p-10" data-testid="apply-form">
              {(ctx.contextLabelAr || ctx.contextLabelEn) && (
                <div className="mb-8 pb-6 border-b border-border">
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary mb-2">
                    {t.applyingFor} <span className="text-muted-foreground">{ctx.typeLabel[language]}</span>
                  </div>
                  <div className="font-black text-primary text-lg leading-snug" data-testid="apply-context">
                    {language === "ar" ? ctx.contextLabelAr : ctx.contextLabelEn}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {t.fullName}
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background text-foreground focus:outline-none focus:border-secondary transition-colors"
                    data-testid="input-fullName"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background text-foreground focus:outline-none focus:border-secondary transition-colors"
                    dir="ltr"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background text-foreground focus:outline-none focus:border-secondary transition-colors"
                    dir="ltr"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {t.organization}
                  </label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={(e) => update("organization", e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background text-foreground focus:outline-none focus:border-secondary transition-colors"
                    data-testid="input-organization"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {t.country}
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => update("country", e.target.value)}
                    className="w-full px-4 py-3 border border-border bg-background text-foreground focus:outline-none focus:border-secondary transition-colors"
                    data-testid="input-country"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {t.notes}
                  </label>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder={t.notesPlaceholder}
                    className="w-full px-4 py-3 border border-border bg-background text-foreground focus:outline-none focus:border-secondary transition-colors resize-y"
                    data-testid="input-notes"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 text-sm" data-testid="apply-error">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">{t.requiredHint}</p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="submit-apply"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.submitting}
                    </>
                  ) : (
                    <>
                      {t.submit}
                      <ArrowRight className={`w-3 h-3 ${isArabic ? "rotate-180" : ""}`} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
