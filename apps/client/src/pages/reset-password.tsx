import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { authClient, basePath } from "@/lib/auth-client";

/**
 * Token-link password reset.
 *
 * The primary reset path in this app is the inline 6-digit code on the sign-in
 * page. This page covers the link-based variant (`requestPasswordReset`), which
 * is what Better Auth falls back to for flows it initiates itself — for example
 * a reset triggered outside our own UI. Keeping it means a reset link can never
 * dead-end on a 404.
 */
const COPY = {
  ar: {
    title: "تعيين كلمة مرور جديدة",
    subtitle: "اختر كلمة مرور جديدة لحسابك.",
    newPasswordLabel: "كلمة المرور الجديدة",
    confirmLabel: "تأكيد كلمة المرور",
    placeholder: "8 أحرف على الأقل",
    submit: "حفظ كلمة المرور",
    submitting: "جارٍ الحفظ...",
    show: "إظهار",
    hide: "إخفاء",
    okTitle: "تم تغيير كلمة المرور",
    okDesc: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
    goSignIn: "تسجيل الدخول",
    errors: {
      noToken: "رابط إعادة التعيين غير صالح أو ناقص. اطلب رابطاً جديداً.",
      missing: "من فضلك ادخل كلمة المرور مرتين",
      mismatch: "كلمتا المرور غير متطابقتين",
      tooShort: "كلمة المرور قصيرة جداً — استخدم 8 أحرف على الأقل",
      invalidToken: "انتهت صلاحية الرابط أو سبق استخدامه. اطلب رابطاً جديداً.",
      generic: "تعذر تغيير كلمة المرور. حاول مرة أخرى.",
    },
  },
  en: {
    title: "Set a new password",
    subtitle: "Choose a new password for your account.",
    newPasswordLabel: "New password",
    confirmLabel: "Confirm password",
    placeholder: "At least 8 characters",
    submit: "Save password",
    submitting: "Saving...",
    show: "Show",
    hide: "Hide",
    okTitle: "Password changed",
    okDesc: "You can now sign in with your new password.",
    goSignIn: "Sign in",
    errors: {
      noToken: "This reset link is invalid or incomplete. Request a new one.",
      missing: "Please enter your new password twice",
      mismatch: "Passwords don't match",
      tooShort: "Password is too short — use at least 8 characters",
      invalidToken: "That link has expired or was already used. Request a new one.",
      generic: "Unable to change your password. Please try again.",
    },
  },
} as const;

export default function ResetPasswordPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const [, navigate] = useLocation();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("token");
    setToken(fromQuery);
    if (!fromQuery) setError(t.errors.noToken);
    // Only reads the URL once on mount; `t` changing with language must not
    // re-run it and clobber a message the user is already reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t.errors.noToken);
      return;
    }
    if (!password || !confirmPassword) {
      setError(t.errors.missing);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.errors.mismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.errors.tooShort);
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (err) {
        setError(
          err.code === "INVALID_TOKEN" || err.code === "TOKEN_EXPIRED"
            ? t.errors.invalidToken
            : err.message || t.errors.generic,
        );
        return;
      }
      setDone(true);
    } catch {
      setError(t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0F3D2E] px-4 py-12"
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="w-full max-w-md bg-white shadow-xl border border-white/10 p-6 md:p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-secondary/15 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-secondary" />
            </div>
          </div>
          <h2 className="text-xl font-black text-primary mb-2">{t.okTitle}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t.okDesc}</p>
          <Button onClick={() => navigate("/sign-in")} className="w-full rounded-none">
            {t.goSignIn}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0F3D2E] px-4 py-12"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className={`mb-6 max-w-md w-full ${isAr ? "text-right" : "text-left"}`}>
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">{t.title}</h1>
        <p className="text-white/60 text-sm md:text-base leading-relaxed">{t.subtitle}</p>
      </div>

      <div className="w-full max-w-md bg-white shadow-xl border border-white/10 p-6 md:p-8">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-bold text-primary mb-1.5">
              {t.newPasswordLabel}
            </label>
            <div className="relative">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.placeholder}
                dir="ltr"
                className={`w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${isAr ? "pr-9 pl-10 text-right" : "pl-9 pr-10"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t.hide : t.show}
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isAr ? "left-3" : "right-3"}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-bold text-primary mb-1.5">
              {t.confirmLabel}
            </label>
            <div className="relative">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.placeholder}
                dir="ltr"
                className={`w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${isAr ? "pr-9 text-right" : "pl-9"}`}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={submitting || !token} className="w-full rounded-none gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? t.submitting : t.submit}
          </Button>

          <div className={`text-sm ${isAr ? "text-right" : "text-left"}`}>
            <a href={`${basePath}/sign-in`} className="text-secondary hover:underline">
              {t.goSignIn}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
