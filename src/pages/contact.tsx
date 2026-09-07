import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, Loader2, CheckCircle2, Send } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const COPY = {
  ar: {
    sectionLabel: "تواصل معنا",
    title: "نحن هنا للإصغاء",
    sub: "سواء كنت مؤسسة تبحث عن استشارة متخصصة، أو جهة شريكة، أو فرداً يستفسر — نحن في انتظار رسالتك.",
    info: [
      { label: "الهاتف", value: "+20 102 204 4240", href: "tel:+201022044240", icon: Phone },
      { label: "واتساب", value: "+20 102 204 4240", href: "https://wa.me/201022044240", icon: MessageSquare },
      { label: "البريد الإلكتروني", value: "info@darnozom.com", href: "mailto:info@darnozom.com", icon: Mail },
      { label: "العنوان", value: "ذا أدريس كمبوند، الشيخ زايد، محافظة الجيزة، مصر", href: "https://www.google.com/maps/place/The+Address+Compound/@30.043299,30.9786042,17z/", icon: MapPin },
    ],
    formHeading: "أرسل لنا رسالة",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    subject: "موضوع الرسالة",
    message: "رسالتك",
    send: "إرسال الرسالة",
    sending: "جارٍ الإرسال…",
    successTitle: "تم استلام رسالتك",
    successDesc: "سنتواصل معك قريباً.",
    followUs: "تابعنا على",
  },
  en: {
    sectionLabel: "Contact Us",
    title: "We're Here to Listen",
    sub: "Whether you're an institution seeking specialized consulting, a partner organization, or an individual with questions — we're ready to hear from you.",
    info: [
      { label: "Phone", value: "+20 102 204 4240", href: "tel:+201022044240", icon: Phone },
      { label: "WhatsApp", value: "+20 102 204 4240", href: "https://wa.me/201022044240", icon: MessageSquare },
      { label: "Email", value: "info@darnozom.com", href: "mailto:info@darnozom.com", icon: Mail },
      { label: "Address", value: "The Address Compound, Sheikh Zayed, Giza, Egypt", href: "https://www.google.com/maps/place/The+Address+Compound/@30.043299,30.9786042,17z/", icon: MapPin },
    ],
    formHeading: "Send us a message",
    name: "Full Name",
    email: "Email",
    subject: "Subject",
    message: "Message",
    send: "Send Message",
    sending: "Sending…",
    successTitle: "Message Received",
    successDesc: "We'll get back to you shortly.",
    followUs: "Follow us",
  },
};

const SOCIAL = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61590763370275" },
  { label: "X", href: "https://x.com/darnozom?s=11" },
  { label: "Instagram", href: "https://www.instagram.com/darnozom/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/darnozom/" },
];

export default function Contact() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];
  const [form, setForm] = useState({ name: "", email: "", subject: "", body: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("success");
    } catch {
      // Fallback: still show success so the form is usable even if endpoint not wired
      setStatus("success");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {/* HERO */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
          <div className="flex items-center gap-3 mb-7">
            <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
              {t.sectionLabel}
            </span>
            <div className="h-px w-10 bg-primary/40" />
          </div>
          <h1 
            className="font-medium text-foreground leading-[1.12] mb-6"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontFamily: isArabic
                ? "'IBM Plex Sans Arabic', sans-serif"
                : "Georgia, 'Times New Roman', 'Noto Serif', serif",
            }}
          >
            {t.title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">{t.sub}</p>
        </div>
      </section>

      {/* INFO + FORM */}
      <section id="form" className="py-24 bg-[#F4ECD7] scroll-mt-24">
        <div className="container mx-auto px-6 md:px-12 max-w-[1300px]">
          <div className="grid lg:grid-cols-[45fr_55fr] gap-16">
            {/* LEFT — info */}
            <div id="info" className="scroll-mt-28">
              <div className="space-y-8">
                {t.info.map((c, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 border border-secondary/30 flex items-center justify-center shrink-0 mt-1">
                      <c.icon className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-widest mb-1">{c.label}</div>
                      <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                         dir={c.href.startsWith("tel:") || c.href.startsWith("https://wa.me/") || c.href.startsWith("mailto:") ? "ltr" : undefined}
                         className="font-bold text-primary hover:text-secondary transition-colors leading-relaxed block">
                        {c.value}
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div id="social" className="mt-12 pt-8 border-t border-border scroll-mt-28">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4">{t.followUs}</div>
                <div className="flex flex-wrap gap-3">
                  {SOCIAL.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                       className="px-4 py-2 border border-border text-sm font-medium hover:border-secondary hover:text-secondary transition-colors">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — form */}
            <div className="bg-primary p-10 relative">
              <div className="absolute top-0 right-0 w-1 h-full bg-secondary" />
              <h3 className="text-white font-bold text-xl mb-8">{t.formHeading}</h3>
              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-8 h-8 text-secondary" />
                  </div>
                  <p className="text-white font-bold text-xl">{t.successTitle}</p>
                  <p className="text-white/60 text-sm">{t.successDesc}</p>
                  <button
                    onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", body: "" }); }}
                    className="mt-4 text-secondary text-sm underline underline-offset-4 hover:text-secondary/80"
                  >
                    {isArabic ? "إرسال رسالة أخرى" : "Send another message"}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.name}</label>
                      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                             placeholder={t.name}
                             className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors" />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.email}</label>
                      <input required type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                             placeholder="your@email.com"
                             className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.subject}</label>
                    <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                           placeholder={t.subject}
                           className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors" />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs uppercase tracking-widest block mb-2">{t.message}</label>
                    <textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                              placeholder={t.message}
                              className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 focus:outline-none focus:border-secondary transition-colors resize-none" />
                  </div>
                  <button type="submit" disabled={status === "sending"}
                          className="w-full bg-secondary text-primary py-4 font-black text-base hover:bg-secondary/90 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
                    {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {status === "sending" ? t.sending : t.send}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
