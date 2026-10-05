import { useState } from "react";
import { Mail } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";

// Round 1: UI only. No email is stored or sent until the newsletter backend ships.
export function NewsletterBlock({ id = "newsletter" }: { id?: string }) {
  const { isArabic } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("يرجى إدخال بريد إلكتروني صحيح", "Please enter a valid email"));
    if (!consent) return setError(t("يرجى الموافقة على استلام الرسائل", "Please agree to receive emails"));
    setError("");
    toast({
      title: t("النشرة البريدية قيد الإطلاق", "The newsletter is launching soon"),
      description: t("سنفعّل الاشتراك قريبًا، ولم يُحفظ بريدك بعد.", "Subscriptions open soon; your email has not been saved yet."),
    });
  };

  return (
    <section id={id} className="mx-auto max-w-[1200px] px-5 lg:px-6 my-12 scroll-mt-28">
      <div className="bg-navy text-white rounded-[4px] p-6 lg:p-10 grid gap-6 lg:grid-cols-2 lg:items-center">
        <div className="flex items-start gap-4">
          <Mail className="w-10 h-10 text-gold-light shrink-0" aria-hidden />
          <div>
            <h2 className="text-2xl lg:text-[28px] font-bold">{t("كل جديد من دار نظم يصلك على بريدك", "Everything new from DarNozom, in your inbox")}</h2>
            <p className="text-white/80 mt-1">{t("الإصدارات والمرصد والمقالات والدراسات", "Publications, the Observatory, articles and studies")}</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="sr-only" htmlFor={`${id}-email`}>{t("البريد الإلكتروني", "Email")}</label>
            <input
              id={`${id}-email`} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" aria-label={t("البريد الإلكتروني", "Email")}
              className="flex-1 min-h-12 px-4 rounded-[4px] bg-white text-ink placeholder:text-ink-muted"
            />
            <button type="submit" className="min-h-12 px-6 rounded-[4px] bg-gold-light text-ink font-bold hover:bg-gold">
              {t("اشترك في النشرة", "Subscribe")}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-white/85">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1.5 w-4 h-4" />
            <span>{t("أوافق على استلام الرسائل البريدية من دار نظم. يمكنك إلغاء الاشتراك في أي وقت.", "I agree to receive emails from DarNozom. You can unsubscribe at any time.")}</span>
          </label>
          {error && <p role="alert" className="text-sm text-gold-light">{error}</p>}
        </form>
      </div>
    </section>
  );
}
