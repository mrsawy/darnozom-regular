import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, BookCheck, Landmark, Loader2, CheckCircle2, Network, Sprout, Workflow } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const START_POINTS = [
  {
    icon: Sprout,
    ar: { title: "تأسيس مشروع جديد", desc: "من الفكرة إلى خطة الإطلاق" },
    en: { title: "Establish a New Project", desc: "From the idea to the launch plan" },
  },
  {
    icon: Landmark,
    ar: { title: "تطوير مؤسسة قائمة", desc: "من تشخيص الاحتياج إلى تحسين الأداء" },
    en: { title: "Develop an Existing Institution", desc: "From diagnosing needs to improving performance" },
  },
];

const PILLARS = [
  {
    icon: BookCheck,
    ar: { title: "الشريعة", desc: "التأصيل والحوكمة الشرعية" },
    en: { title: "Sharia", desc: "Grounding and Sharia governance" },
  },
  {
    icon: Workflow,
    ar: { title: "الإدارة", desc: "الاستراتيجية والتشغيل والاستدامة" },
    en: { title: "Management", desc: "Strategy, operations and sustainability" },
  },
  {
    icon: Network,
    ar: { title: "البرمجيات والتحول الرقمي", desc: "أنظمة مناسبة وعمليات مترابطة" },
    en: { title: "Software and Digital Transformation", desc: "Fitting systems and connected processes" },
  },
];

const STEPS = [
  { ar: "نفهم الاحتياج", en: "Understand the need" },
  { ar: "ندرس ونحلل", en: "Study and analyse" },
  { ar: "نصمم ونبني", en: "Design and build" },
  { ar: "نتابع ونطوّر", en: "Follow up and improve" },
];

export default function ServicesDigital() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: isAr ? "تأسيس وتطوير المشروعات والمؤسسات" : "Establishing and Developing Projects and Institutions",
          message: form.message,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("success");
    } catch {
      setStatus("idle");
      alert(isAr ? "حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى." : "Something went wrong. Please try again.");
    }
  };

  const inputCls =
    "w-full border border-border bg-white rounded-md px-4 py-3 text-sm outline-none focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="bg-[#F5F0E8] border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-secondary font-semibold text-sm mb-4">
              {isAr ? "خدمات دار نظم" : "DarNozom Services"}
            </p>
            <h1 className="font-bold text-primary leading-[1.2] mb-4" style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.5rem)" }}>
              {isAr ? "تأسيس وتطوير المشروعات والمؤسسات" : "Establishing and Developing Projects and Institutions"}
            </h1>
            <p className="text-secondary font-semibold text-lg mb-3">
              {isAr ? "للمشروعات الإسلامية والاستراتيجية" : "For Islamic and strategic projects"}
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-xl">
              {isAr
                ? "نساعدك على تأسيس مشروعك وتطوير مؤسستك بتكامل الشريعة والإدارة والتقنية."
                : "We help you establish your project and develop your institution by integrating Sharia, management and technology."}
            </p>
            <Link
              href="/service-registration?service=digital-transformation"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm rounded-md hover:bg-primary/90 transition-colors"
            >
              {isAr ? "ناقشنا في مشروعك" : "Discuss your project with us"}
            </Link>
          </div>
          <img
            src="/services-establish-hero.png"
            alt=""
            className="w-full max-w-[520px] mx-auto md:order-first mix-blend-multiply"
          />
        </div>
      </section>

      {/* Where to start */}
      <section className="py-16 md:py-12 bg-white">
        <div className="max-w-[1100px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-10">
            {isAr ? "من أين نبدأ؟" : "Where do we start?"}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {START_POINTS.map((s) => {
              const t = isAr ? s.ar : s.en;
              return (
                <div key={s.en.title} className="flex items-center gap-5 border border-border rounded-xl p-6 bg-white">
                  <div className="shrink-0 w-[72px] h-[72px] rounded-xl bg-[#F5F0E8] flex items-center justify-center">
                    <s.icon size={34} strokeWidth={1.4} className="text-secondary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">{t.title}</h3>
                    <p className="text-muted-foreground text-sm">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="py-16 md:py-12 bg-[#F5F0E8]">
        <div className="max-w-[1100px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-10">
            {isAr ? "ثلاثة محاور متكاملة" : "Three Integrated Pillars"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p) => {
              const t = isAr ? p.ar : p.en;
              return (
                <div key={p.en.title} className="bg-white rounded-xl shadow-sm p-7 text-center flex flex-col items-center">
                  <p.icon size={44} strokeWidth={1.2} className="text-secondary mb-4" />
                  <h3 className="text-xl font-bold text-primary mb-2">{t.title}</h3>
                  <p className="text-muted-foreground text-sm">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="py-16 md:py-12 bg-white">
        <div className="max-w-[1100px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary text-center mb-12">
            {isAr ? "كيف نعمل معك؟" : "How do we work with you?"}
          </h2>
          <ol className="relative grid grid-cols-2 md:grid-cols-4 gap-y-8">
            <div className="hidden md:block absolute top-5 inset-x-[12.5%] h-px bg-secondary/60" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.en} className="relative flex flex-col items-center gap-3 text-center">
                <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center ring-8 ring-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-bold text-primary">{isAr ? s.ar : s.en}</span>
              </li>
            ))}
          </ol>
          <div className="text-center mt-10">
            <Link
              href="/service-registration?service=digital-transformation"
              className="inline-flex items-center gap-2 text-primary text-sm underline underline-offset-4"
            >
              {isAr ? "تعرّف إلى التفاصيل" : "Learn the details"}
              <Arrow size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="pb-16 md:pb-20 bg-white">
        <div className="max-w-[1100px] mx-auto px-page">
          <div className="bg-[#F5F0E8] rounded-2xl px-6 md:px-12 py-10 text-center">
            <h2 className="text-3xl font-bold text-primary mb-2">{isAr ? "حدثنا عن مشروعك" : "Tell us about your project"}</h2>
            <p className="text-muted-foreground mb-8">{isAr ? "لنحدد معًا الخطوة المناسبة" : "Let's define the right next step together"}</p>
            {status === "success" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="text-secondary" size={40} />
                <p className="font-bold text-primary">{isAr ? "تم استلام طلبك، سنتواصل معك قريبًا." : "Request received. We'll be in touch soon."}</p>
              </div>
            ) : (
              <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 text-start">
                <input
                  required
                  className={inputCls}
                  placeholder={isAr ? "الاسم" : "Name"}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  required
                  type="email"
                  className={inputCls}
                  placeholder={isAr ? "البريد الإلكتروني" : "Email"}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <textarea
                  required
                  rows={3}
                  className={`${inputCls} md:col-span-2`}
                  placeholder={isAr ? "نبذة عن مشروعك أو احتياجك" : "A brief about your project or need"}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <div className="md:col-span-2 text-center">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-3 font-bold text-sm rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {status === "sending" && <Loader2 size={16} className="animate-spin" />}
                    {isAr ? "أرسل طلبك" : "Send your request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
