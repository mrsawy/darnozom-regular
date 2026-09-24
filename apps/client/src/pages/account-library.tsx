import { Loader2 } from "lucide-react";
import { Link, Redirect } from "wouter";
import { useSession } from "@/lib/auth-client";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language-context";
import MyLibrary from "@/components/account/my-library";

const COPY = {
  ar: {
    title: "مكتبتي",
    subtitle: "كتبك الرقمية التي اشتريتها — اقرأها أو حمّل ملفاتها.",
    back: "العودة إلى حسابي",
  },
  en: {
    title: "My Library",
    subtitle: "The digital books you've bought — read them or download their files.",
    back: "Back to my account",
  },
} as const;

/** The customer's digital books on their own page (also shown on /account). */
export default function AccountLibraryPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const t = COPY[isAr ? "ar" : "en"];
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session?.user) return <Redirect to="/sign-in" />;

  return (
    <div className="min-h-[100dvh] bg-background islamic-pattern flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 space-y-6">
          <header>
            <Link href="/account" className="text-xs font-bold text-secondary hover:underline">
              {t.back}
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-primary mt-2 mb-1">{t.title}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t.subtitle}</p>
          </header>
          <section className="bg-card border border-secondary/20 p-5 shadow-[0_12px_40px_rgba(15,61,46,0.06)]">
            <MyLibrary lang={isAr ? "ar" : "en"} />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
