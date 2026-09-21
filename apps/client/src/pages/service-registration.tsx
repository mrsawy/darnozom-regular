import { useState, useMemo, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  FileText, CheckCircle, AlertCircle,
  User, Briefcase, MessageSquare,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

// Note: AI Consulting Agent ("ai-agent") is intentionally excluded — it is a
// standalone platform, not a service that can be registered for here.
const SERVICES = [
  { id: "islamic-systems", labelAr: "أنظمة الحوكمة والامتثال الشرعي", labelEn: "Shariah Governance & Compliance Systems" },
  { id: "management-systems", labelAr: "الإدارة", labelEn: "Management" },
  { id: "digital-transformation", labelAr: "التحول الرقمي", labelEn: "Digital Transformation" },
  { id: "academy", labelAr: "أكاديمية دار نظم", labelEn: "DarNozom Academy" },
  { id: "research", labelAr: "البحث والتطوير", labelEn: "Research & Development" },
  { id: "publishing", labelAr: "النشر والترجمة", labelEn: "Publishing & Translation" },
  { id: "store", labelAr: "متجر الكتب", labelEn: "Book Store" },
  { id: "other", labelAr: "أخرى", labelEn: "Other" },
];

const VALID_SERVICE_IDS = new Set(SERVICES.map((s) => s.id));

const COPY = {
  ar: {
    breadcrumbHome: "الرئيسية",
    breadcrumbCurrent: "تسجيل طلب خدمة",
    eyebrow: "تسجيل طلب خدمة",
    title: "تسجيل طلب خدمة",
    sub: "املأ بياناتك الأساسية واختر الخدمة المطلوبة، وسيتواصل معك أحد مستشارينا قريبًا.",
    clientSection: "بيانات العميل",
    fullName: "الاسم الكامل",
    fullNamePh: "اسمك الكامل",
    organization: "اسم المؤسسة / الشركة",
    organizationPh: "اسم شركتك أو مؤسستك",
    jobTitle: "المسمى الوظيفي",
    jobTitlePh: "مدير تنفيذي، مستشار، ...",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف / واتساب",
    country: "الدولة (اختياري)",
    countryPh: "مثال: المملكة العربية السعودية",
    serviceSection: "نوع الخدمة المطلوبة",
    selectService: "اختر الخدمة",
    selectPlaceholder: "— اختر الخدمة —",
    commentsSection: "ملاحظات / وصف مختصر",
    commentsLabel: "اكتب أي تفاصيل أو احتياجات تودّ إخبارنا بها (اختياري)",
    commentsPh: "مثال: نوع المؤسسة، حجم الفريق، التحديات الحالية، ...",
    submit: "إرسال الطلب",
    submitting: "جارِ الإرسال...",
    cancel: "إلغاء",
    successEyebrow: "تم استلام الطلب",
    successTitle: "تم استلام طلبك!",
    successDesc: "شكرًا لتسجيل طلبك. سيتواصل معك فريقنا خلال ٢٤–٤٨ ساعة عمل لمناقشة احتياجاتك بالتفصيل.",
    whatsappFollow: "متابعة عبر واتساب",
    backToHome: "العودة للرئيسية",
    whatsappMsg: "مرحبًا، لقد سجّلت طلب خدمة وأودّ المتابعة",
    err: {
      fullName: "الاسم الكامل مطلوب",
      organization: "اسم المؤسسة مطلوب",
      emailRequired: "البريد الإلكتروني مطلوب",
      emailInvalid: "بريد إلكتروني غير صحيح",
      service: "الرجاء اختيار نوع الخدمة",
      sendFailed: "فشل الإرسال",
      unexpected: "حدث خطأ غير متوقع، حاول مرة أخرى",
    },
  },
  en: {
    breadcrumbHome: "Home",
    breadcrumbCurrent: "Service Registration",
    eyebrow: "Service Registration",
    title: "Register a Service Request",
    sub: "Fill in your basic details and pick the service you need, and one of our consultants will contact you shortly.",
    clientSection: "Client Details",
    fullName: "Full Name",
    fullNamePh: "Your full name",
    organization: "Organization / Company Name",
    organizationPh: "Your company or organization name",
    jobTitle: "Job Title",
    jobTitlePh: "Executive, consultant, ...",
    email: "Email",
    phone: "Phone / WhatsApp",
    country: "Country (optional)",
    countryPh: "e.g. Saudi Arabia",
    serviceSection: "Type of Service Requested",
    selectService: "Choose a service",
    selectPlaceholder: "— Choose a service —",
    commentsSection: "Notes / Brief Description",
    commentsLabel: "Add any details or needs you'd like to share with us (optional)",
    commentsPh: "e.g. organization type, team size, current challenges, ...",
    submit: "Submit Request",
    submitting: "Submitting...",
    cancel: "Cancel",
    successEyebrow: "Request received",
    successTitle: "Your request has been received!",
    successDesc: "Thank you for registering your request. Our team will contact you within 24–48 business hours to discuss your needs in detail.",
    whatsappFollow: "Follow up on WhatsApp",
    backToHome: "Back to Home",
    whatsappMsg: "Hello, I just registered a service request and would like to follow up",
    err: {
      fullName: "Full name is required",
      organization: "Organization name is required",
      emailRequired: "Email is required",
      emailInvalid: "Invalid email address",
      service: "Please select a service type",
      sendFailed: "Submission failed",
      unexpected: "An unexpected error occurred, please try again",
    },
  },
};

interface FormData {
  fullName: string;
  organization: string;
  jobTitle: string;
  email: string;
  phone: string;
  country: string;
  serviceType: string;
  comments: string;
}

interface FormErrors {
  fullName?: string;
  organization?: string;
  email?: string;
  serviceType?: string;
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ServiceRegistration() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];
  const search = useSearch();
  const initialService = useMemo(() => {
    const params = new URLSearchParams(search);
    const s = params.get("service");
    return s && VALID_SERVICE_IDS.has(s) ? s : "";
  }, [search]);

  const [form, setForm] = useState<FormData>({
    fullName: "",
    organization: "",
    jobTitle: "",
    email: "",
    phone: "",
    country: "",
    serviceType: initialService,
    comments: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Keep dropdown in sync if the URL param changes (e.g. user navigates from
  // one service detail page to another while the form is mounted).
  useEffect(() => {
    if (initialService && form.serviceType === "") {
      setForm((prev) => ({ ...prev, serviceType: initialService }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialService]);

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = t.err.fullName;
    if (!form.organization.trim()) errs.organization = t.err.organization;
    if (!form.email.trim()) {
      errs.email = t.err.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t.err.emailInvalid;
    }
    if (!form.serviceType.trim()) errs.serviceType = t.err.service;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInput(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const apiBase = BASE_URL.replace(/\/darnozom-website\/?$/, "");
      const res = await fetch(`${apiBase}/api/service-registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          organization: form.organization,
          jobTitle: form.jobTitle,
          email: form.email,
          phone: form.phone,
          country: form.country,
          serviceType: form.serviceType,
          comments: form.comments,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.err.sendFailed);
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.err.unexpected);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = (err?: string) =>
    `w-full bg-background border ${err ? "border-red-500/60" : "border-border"} px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-secondary transition-colors`;

  const labelCls = "block text-sm font-bold text-foreground mb-2";
  const dir = isArabic ? "rtl" : "ltr";

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
        <SiteNav mode="page" />
        <section className="min-h-screen flex items-center justify-center dark bg-[#0F3D2E] relative overflow-hidden" data-testid="service-registration-success">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center max-w-lg mx-auto px-6"
          >
            <div className="w-20 h-20 bg-secondary/10 border border-secondary/30 flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="w-10 h-10 text-secondary" />
            </div>
            <div className="flex items-center gap-3 justify-center mb-6">
              <div className="h-px w-10 bg-secondary" />
              <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">{t.successEyebrow}</span>
              <div className="h-px w-10 bg-secondary" />
            </div>
            <h1 className="font-black text-white text-4xl mb-4">{t.successTitle}</h1>
            <p className="text-white/60 text-lg leading-relaxed mb-10">{t.successDesc}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`https://wa.me/201022044240?text=${encodeURIComponent(t.whatsappMsg)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 bg-secondary text-primary px-8 py-4 font-bold hover:bg-secondary/90 transition-colors"
              >
                {t.whatsappFollow}
              </a>
              <Link
                href="/"
                className="flex items-center justify-center gap-3 border border-white/20 text-white px-8 py-4 font-bold hover:border-secondary hover:text-secondary transition-colors"
              >
                {t.backToHome}
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={dir}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="dark bg-[#0F3D2E] text-primary-foreground pt-36 pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary" />
        <div className={`absolute top-36 ${isArabic ? "right-0" : "left-0"} w-1 h-24 bg-secondary`} />
        <div className={`absolute top-36 ${isArabic ? "right-0" : "left-0"} h-1 w-16 bg-secondary`} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-white/40 text-xs mb-10 uppercase tracking-widest"
          >
            <Link href="/" className="hover:text-secondary transition-colors">{t.breadcrumbHome}</Link>
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
              <FileText className="w-14 h-14 text-secondary shrink-0" />
              <h1 className="font-black text-white leading-tight" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
                {t.title}
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/60 text-lg max-w-2xl leading-relaxed"
            >
              {t.sub}
            </motion.p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 bg-[#F4ECD7]">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} noValidate data-testid="service-registration-form">

              {/* ─── Section 1: Client Details ─── */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-14"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-black text-primary text-xl">{t.clientSection}</h2>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>
                      {t.fullName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => handleInput("fullName", e.target.value)}
                      placeholder={t.fullNamePh}
                      className={inputCls(errors.fullName)}
                      data-testid="input-full-name"
                    />
                    {errors.fullName && (
                      <p className="mt-1.5 text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>
                      {t.organization} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.organization}
                      onChange={(e) => handleInput("organization", e.target.value)}
                      placeholder={t.organizationPh}
                      className={inputCls(errors.organization)}
                      data-testid="input-organization"
                    />
                    {errors.organization && (
                      <p className="mt-1.5 text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{errors.organization}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>{t.jobTitle}</label>
                    <input
                      type="text"
                      value={form.jobTitle}
                      onChange={(e) => handleInput("jobTitle", e.target.value)}
                      placeholder={t.jobTitlePh}
                      className={inputCls()}
                      data-testid="input-job-title"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      {t.email} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleInput("email", e.target.value)}
                      placeholder="your@email.com"
                      dir="ltr"
                      className={inputCls(errors.email)}
                      data-testid="input-email"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />{errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>{t.phone}</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleInput("phone", e.target.value)}
                      placeholder="+966 5xx xxx xxxx"
                      dir="ltr"
                      className={inputCls()}
                      data-testid="input-phone"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>{t.country}</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => handleInput("country", e.target.value)}
                      placeholder={t.countryPh}
                      className={inputCls()}
                      data-testid="input-country"
                    />
                  </div>
                </div>
              </motion.div>

              <div className="border-t border-border mb-14" />

              {/* ─── Section 2: Service Type ─── */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-14"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-black text-primary text-xl">
                      {t.serviceSection} <span className="text-red-500">*</span>
                    </h2>
                  </div>
                </div>

                <div>
                  <label className={labelCls} htmlFor="service-type-select">{t.selectService}</label>
                  <select
                    id="service-type-select"
                    value={form.serviceType}
                    onChange={(e) => handleInput("serviceType", e.target.value)}
                    className={inputCls(errors.serviceType)}
                    data-testid="select-service-type"
                  >
                    <option value="">{t.selectPlaceholder}</option>
                    {SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {isArabic ? s.labelAr : s.labelEn}
                      </option>
                    ))}
                  </select>
                  {errors.serviceType && (
                    <p className="mt-1.5 text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{errors.serviceType}
                    </p>
                  )}
                </div>
              </motion.div>

              <div className="border-t border-border mb-14" />

              {/* ─── Section 3: Comments ─── */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-14"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 bg-secondary flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-black text-primary text-xl">{t.commentsSection}</h2>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    {t.commentsLabel}
                  </label>
                  <textarea
                    value={form.comments}
                    onChange={(e) => handleInput("comments", e.target.value)}
                    rows={5}
                    placeholder={t.commentsPh}
                    className={`${inputCls()} resize-y min-h-[120px]`}
                    data-testid="textarea-comments"
                  />
                </div>
              </motion.div>

              {submitError && (
                <div className="mb-6 p-4 border border-red-500/40 bg-red-500/5 text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {submitError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-secondary text-primary px-8 py-4 font-bold hover:bg-secondary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  data-testid="button-submit"
                >
                  {submitting ? t.submitting : t.submit}
                </button>
                <Link
                  href="/"
                  className="flex items-center justify-center px-8 py-4 border border-border text-foreground font-bold hover:border-secondary hover:text-secondary transition-colors"
                >
                  {t.cancel}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
