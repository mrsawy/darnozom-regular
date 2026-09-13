import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { authClient, basePath, useSession } from "@/lib/auth-client";

/**
 * Replaces Clerk's drop-in `<SignUp/>` component, which rendered its own
 * (English-only, separately themed) card. This is the same form markup as the
 * sign-in page so the two read as one flow.
 */
const COPY = {
  ar: {
    title: "إنشاء حساب",
    subtitle: "أنشئ حسابك للوصول إلى لوحة التحكم.",
    nameLabel: "الاسم",
    namePlaceholder: "اسمك الكامل",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "8 أحرف على الأقل",
    confirmLabel: "تأكيد كلمة المرور",
    submit: "إنشاء الحساب",
    submitting: "جارٍ الإنشاء...",
    googleContinue: "المتابعة باستخدام Google",
    or: "أو",
    show: "إظهار",
    hide: "إخفاء",
    haveAccount: "لديك حساب بالفعل؟",
    signIn: "تسجيل الدخول",
    checkTitle: "تحقق من بريدك الإلكتروني",
    checkDesc: "أرسلنا رابط تأكيد إلى",
    checkHint: "اضغط الرابط في الرسالة لتفعيل حسابك، ثم عد لتسجيل الدخول. إذا لم تجد الرسالة، راجع مجلد الرسائل غير المرغوب فيها.",
    goToSignIn: "الذهاب إلى تسجيل الدخول",
    errors: {
      missing: "من فضلك املأ جميع الحقول",
      passwordMismatch: "كلمتا المرور غير متطابقتين",
      passwordTooShort: "كلمة المرور قصيرة جداً — استخدم 8 أحرف على الأقل",
      emailTaken: "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل",
      invalidEmail: "بريد إلكتروني غير صالح",
      generic: "تعذر إنشاء الحساب. حاول مرة أخرى.",
      googleFailed: "تعذر فتح التسجيل عبر Google",
    },
  },
  en: {
    title: "Create your account",
    subtitle: "Set up your account to access the dashboard.",
    nameLabel: "Name",
    namePlaceholder: "Your full name",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 8 characters",
    confirmLabel: "Confirm password",
    submit: "Create account",
    submitting: "Creating account...",
    googleContinue: "Continue with Google",
    or: "or",
    show: "Show",
    hide: "Hide",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    checkTitle: "Check your email",
    checkDesc: "We sent a verification link to",
    checkHint: "Click the link in that email to activate your account, then come back and sign in. If it hasn't arrived, check your spam folder.",
    goToSignIn: "Go to sign in",
    errors: {
      missing: "Please fill in every field",
      passwordMismatch: "Passwords don't match",
      passwordTooShort: "Password is too short — use at least 8 characters",
      emailTaken: "An account with this email already exists",
      invalidEmail: "That email address isn't valid",
      generic: "Unable to create your account. Please try again.",
      googleFailed: "Unable to start Google sign-up",
    },
  },
} as const;

function getRedirectTarget(): string {
  if (typeof window === "undefined") return `${basePath}/account`;
  const params = new URLSearchParams(window.location.search);
  const next = params.get("redirect_url") || params.get("next");
  if (next && next.startsWith("/")) return next;
  return `${basePath}/account`;
}

export default function SignUpPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const [, navigate] = useLocation();
  const { data: session, isPending: sessionPending } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!sessionPending && session?.user && !sentTo) {
    const target = getRedirectTarget();
    if (typeof window !== "undefined" && window.location.pathname !== target) {
      navigate(target.startsWith(basePath) ? target.slice(basePath.length) || "/" : target);
    }
  }

  function errorMessage(
    err: { code?: string; message?: string } | null | undefined,
    fallback: string,
  ): string {
    switch (err?.code) {
      case "USER_ALREADY_EXISTS":
      case "USER_EMAIL_ALREADY_EXISTS":
        return t.errors.emailTaken;
      case "INVALID_EMAIL":
        return t.errors.invalidEmail;
      case "PASSWORD_TOO_SHORT":
        return t.errors.passwordTooShort;
      default:
        return err?.message || fallback;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const nameTrim = name.trim();
    const emailTrim = email.trim();
    if (!nameTrim || !emailTrim || !password || !confirmPassword) {
      setError(t.errors.missing);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.errors.passwordMismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.errors.passwordTooShort);
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await authClient.signUp.email({
        name: nameTrim,
        email: emailTrim,
        password,
        callbackURL: `${basePath}/verify-email`,
      });
      if (err) {
        setError(errorMessage(err, t.errors.generic));
        return;
      }
      // Sign-up does not create a session: `requireEmailVerification` is on, so
      // the account is inert until the emailed link is clicked.
      setSentTo(emailTrim);
    } catch (err) {
      setError(errorMessage(err as { message?: string }, t.errors.generic));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: err } = await authClient.signIn.social({
        provider: "google",
        callbackURL: getRedirectTarget(),
        errorCallbackURL: `${basePath}/sign-up`,
      });
      if (err) {
        setError(errorMessage(err, t.errors.googleFailed));
        setGoogleLoading(false);
      }
    } catch {
      setError(t.errors.googleFailed);
      setGoogleLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0F3D2E] px-4 py-12"
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className="w-full max-w-md bg-white shadow-xl border border-white/10 p-6 md:p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-secondary/15 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-secondary" />
            </div>
          </div>
          <h2 className="text-xl font-black text-primary mb-2">{t.checkTitle}</h2>
          <p className="text-sm text-muted-foreground mb-1">{t.checkDesc}</p>
          <p className="text-sm font-bold text-primary mb-4" dir="ltr">{sentTo}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">{t.checkHint}</p>
          <Button asChild className="w-full rounded-none">
            <a href={`${basePath}/sign-in`}>{t.goToSignIn}</a>
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
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
          {t.title}
        </h1>
        <p className="text-white/60 text-sm md:text-base leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      <div className="w-full max-w-md bg-white shadow-xl border border-white/10 p-6 md:p-8">
        <button
          type="button"
          onClick={onGoogle}
          disabled={submitting || googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
          )}
          {t.googleContinue}
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.or}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-primary mb-1.5">
              {t.nameLabel}
            </label>
            <div className="relative">
              <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className={`w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${isAr ? "pr-9 text-right" : "pl-9"}`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-primary mb-1.5">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                dir="ltr"
                className={`w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${isAr ? "pr-9 text-right" : "pl-9"}`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-primary mb-1.5">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
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
                placeholder={t.passwordPlaceholder}
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

          <Button
            type="submit"
            disabled={submitting || googleLoading}
            className="w-full rounded-none gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? t.submitting : t.submit}
          </Button>
        </form>

        <div className={`mt-5 text-sm text-muted-foreground ${isAr ? "text-right" : "text-left"}`}>
          {t.haveAccount}{" "}
          <a
            href={`${basePath}/sign-in${typeof window !== "undefined" ? window.location.search : ""}`}
            className="font-bold text-secondary hover:underline"
          >
            {t.signIn}
          </a>
        </div>
      </div>
    </div>
  );
}
