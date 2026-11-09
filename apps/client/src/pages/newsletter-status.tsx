import { Link } from "wouter";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language-context";

export type NewsletterState = "confirmed" | "unsubscribed" | "invalid";

const COPY: Record<NewsletterState, { ar: [string, string]; en: [string, string] }> = {
  confirmed: {
    ar: ["تم تأكيد اشتراكك", "شكرًا لك! ستصلك أحدث إصدارات دار نظم على بريدك الإلكتروني."],
    en: ["Subscription confirmed", "Thank you! You'll receive DarNozom's latest publications by email."],
  },
  unsubscribed: {
    ar: ["تم إلغاء اشتراكك", "لن تصلك رسائل النشرة بعد الآن. يمكنك الاشتراك مجددًا في أي وقت."],
    en: ["You've been unsubscribed", "You won't receive newsletter emails anymore. You can subscribe again any time."],
  },
  invalid: {
    ar: ["الرابط غير صالح", "هذا الرابط غير صحيح أو منتهي الصلاحية."],
    en: ["Invalid link", "This link is invalid or has expired."],
  },
};

export default function NewsletterStatusPage({ state }: { state: string }) {
  const { language, isArabic } = useLanguage();
  const key: NewsletterState = state === "confirmed" || state === "unsubscribed" ? state : "invalid";
  const [title, body] = COPY[key][isArabic ? "ar" : "en"];
  return (
    <div className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 md:px-12 max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">{title}</h1>
          <p className="text-muted-foreground mb-8">{body}</p>
          <Link href="/" className="underline">{isArabic ? "العودة إلى الرئيسية" : "Back to home"}</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
