import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { basePath, useSession } from "@/lib/auth-client";

/**
 * Where the verification link in the sign-up email lands.
 *
 * The token is consumed by the server before the browser gets here — the link
 * points at /api/auth/verify-email, which validates, marks the address
 * verified, and redirects to this page. So this only reports the outcome:
 * `error` in the query string when the token was bad or expired, otherwise
 * success.
 */
const COPY = {
  ar: {
    okTitle: "تم تأكيد بريدك الإلكتروني",
    okDesc: "حسابك جاهز الآن. يمكنك الدخول إلى لوحة التحكم.",
    goAccount: "الذهاب إلى حسابي",
    goSignIn: "تسجيل الدخول",
    failTitle: "تعذر تأكيد البريد الإلكتروني",
    failDesc: "الرابط غير صالح أو انتهت صلاحيته. جرب تسجيل الدخول لطلب رابط جديد.",
    checking: "جارٍ التحقق...",
  },
  en: {
    okTitle: "Your email is verified",
    okDesc: "Your account is ready. You can head to the dashboard now.",
    goAccount: "Go to my account",
    goSignIn: "Sign in",
    failTitle: "We couldn't verify your email",
    failDesc: "That link is invalid or has expired. Try signing in to request a new one.",
    checking: "Checking...",
  },
} as const;

export default function VerifyEmailPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const { data: session, isPending } = useSession();
  const [failed, setFailed] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFailed(params.has("error"));
  }, []);

  const signedIn = !!session?.user;

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0F3D2E] px-4 py-12"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md bg-white shadow-xl border border-white/10 p-6 md:p-8 text-center">
        {failed === null || isPending ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.checking}
          </div>
        ) : failed ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-black text-primary mb-2">{t.failTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t.failDesc}</p>
            <Button asChild className="w-full rounded-none">
              <a href={`${basePath}/sign-in`}>{t.goSignIn}</a>
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-secondary/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-secondary" />
              </div>
            </div>
            <h2 className="text-xl font-black text-primary mb-2">{t.okTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t.okDesc}</p>
            <Button asChild className="w-full rounded-none">
              <a href={`${basePath}${signedIn ? "/account" : "/sign-in"}`}>
                {signedIn ? t.goAccount : t.goSignIn}
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
