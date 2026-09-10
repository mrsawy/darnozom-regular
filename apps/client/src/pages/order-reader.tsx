import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useUser } from "@clerk/react";
import {
  Loader2, AlertCircle, ArrowLeft, ArrowRight, Download, BookOpen,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const COPY = {
  ar: {
    title: "قارئ الكتاب",
    backToOrders: "رجوع إلى طلباتي",
    download: "تحميل PDF",
    signInRequired: "تسجيل الدخول مطلوب",
    signInDesc: "سجّل دخولك لعرض الملف.",
    signIn: "تسجيل الدخول",
    loading: "جارٍ تحميل الملف...",
    notAvailable: "الملف غير متاح",
    notAvailableDesc:
      "الطلب غير موجود أو تم إلغاؤه أو الملف لم يعد متاحاً. تواصل مع الدعم إن لزم الأمر.",
  },
  en: {
    title: "Book Reader",
    backToOrders: "Back to my orders",
    download: "Download PDF",
    signInRequired: "Sign-in required",
    signInDesc: "Please sign in to view the file.",
    signIn: "Sign in",
    loading: "Loading the file...",
    notAvailable: "File not available",
    notAvailableDesc:
      "The order doesn't exist, was cancelled, or the file is no longer available. Contact support if needed.",
  },
};

export default function OrderReaderPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const { isLoaded, isSignedIn } = useUser();
  const params = useParams<{ orderId: string; itemId: string }>();
  const orderId = params.orderId;
  const itemId = params.itemId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Probe the file via HEAD (auth + ownership + existence checks only,
  // no body) so we can show a clear error if the order is cancelled or
  // the file is missing, without paying the cost of fetching the full
  // PDF twice.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/account/me/orders/${orderId}/items/${itemId}/file`,
          { credentials: "include", method: "HEAD" },
        );
        if (cancelled) return;
        if (!res.ok) setError(t.notAvailableDesc);
      } catch {
        if (!cancelled) setError(t.notAvailableDesc);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, orderId, itemId, t.notAvailableDesc]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <SiteNav mode="page" />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <SiteNav mode="page" />
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-card border border-border p-8 text-center">
            <AlertCircle className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.signInRequired}</h1>
            <p className="text-muted-foreground mb-6">{t.signInDesc}</p>
            <a
              href={`${basePath}/sign-in?redirect_url=${encodeURIComponent(
                `${basePath}/account/orders/${orderId}/items/${itemId}/read`,
              )}`}
              className="inline-block"
            >
              <Button className="rounded-none gap-2">
                {t.signIn}
                <Arrow className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const fileUrl = `/api/account/me/orders/${orderId}/items/${itemId}/file`;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <div className="bg-primary text-primary-foreground py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-secondary shrink-0" />
            <h1 className="text-base md:text-lg font-black truncate">{t.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/account?tab=orders">
              <Button variant="outline" size="sm" className="rounded-none gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Arrow className="w-3.5 h-3.5 rotate-180" />
                {t.backToOrders}
              </Button>
            </Link>
            <a href={`${fileUrl}?download=1`}>
              <Button size="sm" className="rounded-none gap-2 bg-secondary text-primary hover:bg-secondary/90">
                <Download className="w-3.5 h-3.5" />
                {t.download}
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 p-2 md:p-4">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>{t.loading}</p>
          </div>
        ) : error ? (
          <div className="max-w-xl mx-auto bg-card border border-border p-8 text-center mt-12">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h2 className="text-xl font-black text-primary mb-2">{t.notAvailable}</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/account?tab=orders">
              <Button className="rounded-none gap-2">
                {t.backToOrders}
                <Arrow className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <iframe
            src={fileUrl}
            title={t.title}
            className="w-full h-[calc(100vh-180px)] bg-white border border-border"
          />
        )}
      </div>
    </div>
  );
}
