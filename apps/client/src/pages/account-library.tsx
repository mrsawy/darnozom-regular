import { Link, Redirect } from "wouter";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language-context";
import { PageHeroGradient } from "@/components/page-hero-gradient";

const COPY = {
  ar: {
    current: "قائمة قراءتي",
    title: "قائمة قراءتي",
    subtitle: "مواد اخترتها للعودة إليها. تحفظ المعاينة الاختيارات في هذا المتصفح؛ يربط الموقع المنفذ القائمة بحسابك للمزامنة بين الأجهزة.",
    saved: "المواد المحفوظة",
    emptyTitle: "قائمة القراءة فارغة",
    emptyDesc: "احفظ دراسة أو مقالة أو إصداراً أو كتاباً أو مشروعاً لتعود إليه هنا.",
    browsePublications: "تصفح الإصدارات",
    exploreTopics: "استكشف الموضوعات",
  },
  en: {
    current: "Reading list",
    title: "Reading list",
    subtitle: "Content you chose to come back to. Preview saves selections in this browser; once signed in, the site links the list to your account to sync across devices.",
    saved: "Saved items",
    emptyTitle: "Reading list is empty",
    emptyDesc: "Save a study, article, publication, book or project to return to it here.",
    browsePublications: "Browse publications",
    exploreTopics: "Explore topics",
  },
} as const;

export default function AccountLibraryPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const t = COPY[isAr ? "ar" : "en"];
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session?.user) return <Redirect to="/sign-in" />;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={t.current}
        title={t.title}
        subtitle={t.subtitle}
      />

      <main className="flex-1 py-16">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl font-bold text-primary mb-8 text-center">{t.saved}</h2>

          {/* Empty state */}
          <div className="border border-border bg-card rounded-[4px] py-16 px-6 text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-primary mb-3">{t.emptyTitle}</h3>
            <p className="text-muted-foreground text-sm mb-8">{t.emptyDesc}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/publications"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                {t.browsePublications} {isAr ? "←" : "→"}
              </Link>
              <Link
                href="/topics"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-primary font-bold text-sm hover:bg-muted/40 transition-colors"
              >
                {t.exploreTopics} {isAr ? "←" : "→"}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
