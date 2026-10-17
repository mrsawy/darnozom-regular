import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";

const REQUEST_TYPES = [
  { value: "research",    ar: "طلب بحث",          en: "Research Request" },
  { value: "consulting",  ar: "طلب استشارة",       en: "Consulting Request" },
  { value: "training",    ar: "طلب تدريب",          en: "Training Request" },
  { value: "digital",     ar: "طلب حل رقمي",       en: "Digital Solution Request" },
  { value: "cooperation", ar: "طلب تعاون",          en: "Cooperation Request" },
  { value: "general",     ar: "استفسار عام",         en: "General Enquiry" },
];

export default function Contact() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const search = useSearch();
  const typeFromUrl = new URLSearchParams(search).get("type") ?? "";
  const validType = REQUEST_TYPES.some((r) => r.value === typeFromUrl) ? typeFromUrl : "";
  const [form, setForm] = useState({ name: "", email: "", org: "", phone: "", type: validType, country: "", message: "" });

  useEffect(() => {
    if (validType) setForm((f) => ({ ...f, type: validType }));
  }, [validType]);
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const selectedType = REQUEST_TYPES.find((r) => r.value === form.type);
    const subject = selectedType ? (isAr ? selectedType.ar : selectedType.en) : undefined;
    const fullMessage = [
      form.message,
      form.org ? `${isAr ? "المؤسسة" : "Organisation"}: ${form.org}` : "",
      form.phone ? `${isAr ? "الهاتف" : "Phone"}: ${form.phone}` : "",
      form.country ? `${isAr ? "البلد" : "Country"}: ${form.country}` : "",
    ].filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, email: form.email, subject, message: fullMessage }),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("success");
    } catch {
      setStatus("idle");
      alert(isAr ? "حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى." : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "تواصل مع دار نظم" : "Contact DarNozom"}
        title={isAr ? "تواصل مع دار نظم" : "Contact DarNozom"}
        subtitle={isAr
          ? "أخبرنا باحتياجك في البحث أو الاستشارات أو التدريب أو الحلول الرقمية، أو اقترح تعاونًا علميًا أو مهنيًا."
          : "Tell us your research, consulting, training or digital needs, or propose scholarly or professional cooperation."}
      />

      {/* Form + Sidebar */}
      <section className="py-[70px] bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-10">
            {isAr ? "أرسل طلبك" : "Send Your Request"}
          </h2>
          <div className="grid lg:grid-cols-[2fr_1fr] gap-10 lg:gap-[45px]">
            {/* Form panel */}
            <div className="bg-white border border-border p-[30px] rounded-[10px]">
              {status === "success" ? (
                <div className="flex flex-col items-start gap-4 py-10">
                  <CheckCircle2 className="text-secondary" size={40} />
                  <p className="text-xl font-bold text-primary">
                    {isAr ? "تم استلام طلبك" : "Request received"}
                  </p>
                  <p className="text-muted-foreground">
                    {isAr ? "سنتواصل معك قريبًا." : "We'll get back to you shortly."}
                  </p>
                  <button
                    onClick={() => { setStatus("idle"); setForm({ name: "", email: "", org: "", phone: "", type: "", country: "", message: "" }); }}
                    className="text-secondary text-sm underline underline-offset-4 hover:text-secondary/80"
                  >
                    {isAr ? "إرسال طلب آخر" : "Send another request"}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-primary mb-1.5">
                        {isAr ? "الاسم الكامل *" : "Full name *"}
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-border focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary mb-1.5">
                        {isAr ? "البريد الإلكتروني *" : "Email address *"}
                      </label>
                      <input
                        required
                        type="email"
                        dir="ltr"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full border border-border focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary mb-1.5">
                        {isAr ? "المؤسسة أو الصفة" : "Institution or role"}
                      </label>
                      <input
                        value={form.org}
                        onChange={(e) => setForm({ ...form, org: e.target.value })}
                        className="w-full border border-border focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary mb-1.5">
                        {isAr ? "رقم الهاتف" : "Phone number"}
                      </label>
                      <input
                        type="tel"
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full border border-border focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary mb-1.5">
                        {isAr ? "نوع الطلب *" : "Request type *"}
                      </label>
                      <select
                        required
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full border border-border focus:outline-none focus:border-primary transition-colors bg-white"
                      >
                        <option value="">{isAr ? "اختر نوع الطلب" : "Choose a request type"}</option>
                        {REQUEST_TYPES.map((r) => (
                          <option key={r.value} value={r.value}>{isAr ? r.ar : r.en}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-primary mb-1.5">
                        {isAr ? "البلد" : "Country"}
                      </label>
                      <input
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                        className="w-full border border-border focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-primary mb-1.5">
                      {isAr ? "وصف الاحتياج *" : "Describe your needs *"}
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={isAr ? "صف السؤال أو التحدي والمخرج المطلوب" : "Describe the question or challenge and the output you need"}
                      className="w-full border border-border focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "ستُستخدم بياناتك للتواصل بشأن طلبك وفق " : "Your information will be used to respond to your request under our "}
                    <Link href="/privacy" className="underline hover:text-primary">
                      {isAr ? "سياسة الخصوصية" : "privacy policy"}
                    </Link>
                    {isAr ? "." : "."}
                  </p>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {status === "sending" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isAr ? "أرسل الطلب" : "Send request"}
                    {status !== "sending" && <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar */}
            <aside className="bg-[#eaf0f6] p-[25px] h-fit rounded-[10px]">
              <h3 className="font-bold text-lg text-primary mb-6">
                {isAr ? "يسعدنا التواصل معك" : "We Welcome Your Enquiry"}
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">{isAr ? "البريد الإلكتروني" : "Email"}</p>
                  <a href="mailto:info@darnozom.com" dir="ltr" className="text-primary font-medium hover:text-secondary transition-colors">
                    info@darnozom.com
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">{isAr ? "الهاتف وواتساب" : "Phone and WhatsApp"}</p>
                  <a href="tel:+201022044240" dir="ltr" className="text-primary font-medium hover:text-secondary transition-colors">
                    +20 102 204 4240
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">{isAr ? "العنوان" : "Address"}</p>
                  <p className="text-primary">{isAr ? "الشيخ زايد، الجيزة، مصر" : "Sheikh Zayed, Giza, Egypt"}</p>
                </div>
                <div className="pt-2">
                  <Link href="/newsletter" className="inline-flex items-center gap-2 text-secondary font-bold text-sm hover:underline">
                    {isAr ? "تابع جديد الإصدارات" : "Follow new publications"}
                    <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
