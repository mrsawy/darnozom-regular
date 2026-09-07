import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useSignIn } from "@clerk/react/legacy";
import { useUser } from "@clerk/react";
import { Loader2, Eye, EyeOff, Mail, Lock, AlertCircle, KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const COPY = {
  ar: {
    title: "تسجيل الدخول",
    subtitle: "ادخل إلى حسابك للوصول إلى لوحة التحكم.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    submit: "تسجيل الدخول",
    submitting: "جارٍ الدخول...",
    noAccount: "ليس لديك حساب؟",
    signUp: "أنشئ حساباً",
    googleContinue: "المتابعة باستخدام Google",
    or: "أو",
    show: "إظهار",
    hide: "إخفاء",
    emailCodeLink: "ادخل بكود يصلك على البريد بدلاً من كلمة المرور",
    backToPassword: "الرجوع إلى تسجيل الدخول بكلمة المرور",
    sendCode: "إرسال الكود",
    sendingCode: "جارٍ الإرسال...",
    codeSentTo: "تم إرسال كود من 6 أرقام إلى",
    codeLabel: "الكود",
    codePlaceholder: "123456",
    verify: "تحقق وادخل",
    verifying: "جارٍ التحقق...",
    resend: "إعادة الإرسال",
    twoFaTitle: "خطوة تحقق إضافية",
    twoFaDesc: "تم إرسال كود تحقق من 6 أرقام إلى",
    forgotPassword: "نسيت كلمة المرور؟ / هل تريد إنشاء كلمة مرور؟",
    resetTitle: "إعادة تعيين كلمة المرور",
    resetDesc: "ادخل بريدك الإلكتروني وسنرسل لك كود إعادة تعيين كلمة المرور. إذا لم يكن لحسابك كلمة مرور، يمكنك إنشاء واحدة الآن.",
    sendResetCode: "إرسال كود إعادة التعيين",
    resetCodeSentTo: "تم إرسال كود من 6 أرقام إلى",
    newPasswordLabel: "كلمة المرور الجديدة",
    confirmPasswordLabel: "تأكيد كلمة المرور الجديدة",
    newPasswordPlaceholder: "8 أحرف على الأقل",
    resetSubmit: "تعيين كلمة المرور والدخول",
    resetSubmitting: "جارٍ التعيين...",
    backToSignIn: "الرجوع إلى تسجيل الدخول",
    errors: {
      missing: "من فضلك ادخل البريد الإلكتروني وكلمة المرور",
      missingEmail: "من فضلك ادخل البريد الإلكتروني",
      missingCode: "من فضلك ادخل الكود",
      invalid: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      noEmailFactor: "هذا البريد لا يدعم الدخول بكود. جرب Google أو كلمة المرور.",
      invalidCode: "الكود غير صحيح",
      generic: "تعذر تسجيل الدخول. حاول مرة أخرى.",
      googleFailed: "تعذر فتح تسجيل الدخول عبر Google",
      no2faFactor: "لم يتم العثور على وسيلة تحقق ثنائية مدعومة.",
      emailNotFound: "لا يوجد حساب مسجل بهذا البريد الإلكتروني",
      noResetFactor: "لا يمكن إعادة تعيين كلمة المرور لهذا الحساب عبر البريد. جرب الدخول بكود أو عبر Google.",
      missingNewPassword: "من فضلك ادخل الكود وكلمة المرور الجديدة",
      passwordMismatch: "كلمتا المرور غير متطابقتين",
      passwordTooShort: "كلمة المرور قصيرة جداً — استخدم 8 أحرف على الأقل",
      passwordPwned: "كلمة المرور هذه ظهرت في تسريب بيانات. اختر كلمة مرور أخرى أكثر أماناً.",
      passwordWeak: "كلمة المرور ضعيفة. استخدم كلمة مرور أطول وأكثر تعقيداً.",
      resetFailed: "تعذر إعادة تعيين كلمة المرور. حاول مرة أخرى.",
    },
  },
  en: {
    title: "Sign in",
    subtitle: "Access your account to continue to the dashboard.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    submit: "Sign in",
    submitting: "Signing in...",
    noAccount: "Don't have an account?",
    signUp: "Create account",
    googleContinue: "Continue with Google",
    or: "or",
    show: "Show",
    hide: "Hide",
    emailCodeLink: "Sign in with a code emailed to you instead",
    backToPassword: "Back to password sign-in",
    sendCode: "Send code",
    sendingCode: "Sending...",
    codeSentTo: "We sent a 6-digit code to",
    codeLabel: "Code",
    codePlaceholder: "123456",
    verify: "Verify and sign in",
    verifying: "Verifying...",
    resend: "Resend",
    twoFaTitle: "Extra verification step",
    twoFaDesc: "A 6-digit verification code was sent to",
    forgotPassword: "Forgot password? / Need to set one?",
    resetTitle: "Reset your password",
    resetDesc: "Enter your email and we'll send you a password reset code. If your account has no password yet, you can set one now.",
    sendResetCode: "Send reset code",
    resetCodeSentTo: "We sent a 6-digit code to",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    newPasswordPlaceholder: "At least 8 characters",
    resetSubmit: "Set password and sign in",
    resetSubmitting: "Setting password...",
    backToSignIn: "Back to sign in",
    errors: {
      missing: "Please enter your email and password",
      missingEmail: "Please enter your email",
      missingCode: "Please enter the code",
      invalid: "Incorrect email or password",
      noEmailFactor: "This email doesn't support code sign-in. Try Google or password.",
      invalidCode: "Invalid code",
      generic: "Unable to sign in. Please try again.",
      googleFailed: "Unable to start Google sign-in",
      no2faFactor: "No supported second-factor verification method found.",
      emailNotFound: "No account found with this email address",
      noResetFactor: "Password reset by email isn't available for this account. Try code sign-in or Google.",
      missingNewPassword: "Please enter the code and your new password",
      passwordMismatch: "Passwords don't match",
      passwordTooShort: "Password is too short — use at least 8 characters",
      passwordPwned: "This password appeared in a data breach. Please choose a different, more secure one.",
      passwordWeak: "Password is too weak. Use a longer, more complex password.",
      resetFailed: "Unable to reset the password. Please try again.",
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

type Mode =
  | "password"
  | "email-code-request"
  | "email-code-verify"
  | "2fa-verify"
  | "reset-request"
  | "reset-verify";

export default function SignInPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const [, navigate] = useLocation();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to redirect target.
  if (userLoaded && isSignedIn) {
    const target = getRedirectTarget();
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== target) {
      navigate(target.startsWith(basePath) ? target.slice(basePath.length) || "/" : target);
    }
  }

  function clerkErrorMessage(err: unknown, fallback: string): string {
    const e = err as {
      errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
    };
    const first = e?.errors?.[0];
    return first?.longMessage || first?.message || fallback;
  }

  async function onSubmitPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);

    const emailTrim = email.trim();
    if (!emailTrim || !password) {
      setError(t.errors.missing);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.create({
        identifier: emailTrim,
        password,
        strategy: "password",
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const target = getRedirectTarget();
        if (typeof window !== "undefined") window.location.assign(target);
        return;
      }
      if (result.status === "needs_second_factor") {
        await prepare2fa(result);
        return;
      }
      setError(t.errors.generic);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string; message?: string; longMessage?: string }> };
      const code = e?.errors?.[0]?.code ?? "";
      if (
        code === "form_password_incorrect" ||
        code === "form_identifier_not_found" ||
        code === "form_param_format_invalid"
      ) {
        setError(t.errors.invalid);
      } else {
        setError(clerkErrorMessage(err, t.errors.generic));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function prepare2fa(attempt: { supportedSecondFactors?: Array<{ strategy: string; emailAddressId?: string; phoneNumberId?: string }> | null }) {
    if (!signIn) return;
    const factors = (attempt.supportedSecondFactors ?? []) as Array<{
      strategy: string;
      emailAddressId?: string;
      phoneNumberId?: string;
    }>;
    const totp = factors.find((f) => f.strategy === "totp");
    const emailFactor = factors.find((f) => f.strategy === "email_code");
    const phoneFactor = factors.find((f) => f.strategy === "phone_code");
    try {
      if (totp) {
        setMode("2fa-verify");
        return;
      }
      if (emailFactor?.emailAddressId) {
        await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
        setMode("2fa-verify");
        return;
      }
      if (phoneFactor?.phoneNumberId) {
        await signIn.prepareSecondFactor({ strategy: "phone_code", phoneNumberId: phoneFactor.phoneNumberId });
        setMode("2fa-verify");
        return;
      }
      setError(t.errors.no2faFactor);
    } catch (err) {
      setError(clerkErrorMessage(err, t.errors.generic));
    }
  }

  async function verify2faCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);
    const codeTrim = code.trim();
    if (!codeTrim) {
      setError(t.errors.missingCode);
      return;
    }
    setSubmitting(true);
    try {
      const factors = (signIn.supportedSecondFactors ?? []) as Array<{ strategy: string }>;
      const hasTotp = factors.some((f) => f.strategy === "totp");
      const hasPhone = factors.some((f) => f.strategy === "phone_code");
      const strategy: "totp" | "phone_code" | "email_code" = hasTotp ? "totp" : hasPhone ? "phone_code" : "email_code";
      const result = await signIn.attemptSecondFactor({ strategy, code: codeTrim });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const target = getRedirectTarget();
        if (typeof window !== "undefined") window.location.assign(target);
        return;
      }
      setError(t.errors.generic);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string }> };
      const code = e?.errors?.[0]?.code ?? "";
      if (code === "form_code_incorrect" || code === "verification_failed") {
        setError(t.errors.invalidCode);
      } else {
        setError(clerkErrorMessage(err, t.errors.generic));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    if (!isLoaded || !signIn) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const target = getRedirectTarget();
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${basePath}/sso-callback`,
        redirectUrlComplete: target,
      });
    } catch {
      setError(t.errors.googleFailed);
      setGoogleLoading(false);
    }
  }

  async function sendEmailCode(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);

    const emailTrim = email.trim();
    if (!emailTrim) {
      setError(t.errors.missingEmail);
      return;
    }

    setSendingCode(true);
    try {
      // Start a sign-in attempt with just the identifier — Clerk responds
      // with the supported first factors (incl. email_code if available).
      const attempt = await signIn.create({ identifier: emailTrim });

      const factors = (attempt.supportedFirstFactors ?? []) as Array<{
        strategy: string;
        emailAddressId?: string;
      }>;
      const emailFactor = factors.find((f) => f.strategy === "email_code");
      if (!emailFactor || !emailFactor.emailAddressId) {
        setError(t.errors.noEmailFactor);
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setMode("email-code-verify");
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string }> };
      const code = e?.errors?.[0]?.code ?? "";
      if (code === "form_identifier_not_found") {
        setError(t.errors.invalid);
      } else {
        setError(clerkErrorMessage(err, t.errors.generic));
      }
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyEmailCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);

    const codeTrim = code.trim();
    if (!codeTrim) {
      setError(t.errors.missingCode);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: codeTrim,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const target = getRedirectTarget();
        if (typeof window !== "undefined") window.location.assign(target);
        return;
      }
      setError(t.errors.generic);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string }> };
      const code = e?.errors?.[0]?.code ?? "";
      if (code === "form_code_incorrect" || code === "verification_failed") {
        setError(t.errors.invalidCode);
      } else {
        setError(clerkErrorMessage(err, t.errors.generic));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function sendResetCode(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);

    const emailTrim = email.trim();
    if (!emailTrim) {
      setError(t.errors.missingEmail);
      return;
    }

    setSendingCode(true);
    try {
      const attempt = await signIn.create({ identifier: emailTrim });

      const factors = (attempt.supportedFirstFactors ?? []) as Array<{
        strategy: string;
        emailAddressId?: string;
      }>;
      const resetFactor = factors.find((f) => f.strategy === "reset_password_email_code");
      if (!resetFactor || !resetFactor.emailAddressId) {
        setError(t.errors.noResetFactor);
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: resetFactor.emailAddressId,
      });
      setMode("reset-verify");
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string }> };
      const code = e?.errors?.[0]?.code ?? "";
      if (code === "form_identifier_not_found") {
        setError(t.errors.emailNotFound);
      } else {
        setError(clerkErrorMessage(err, t.errors.generic));
      }
    } finally {
      setSendingCode(false);
    }
  }

  async function submitResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setError(null);

    const codeTrim = code.trim();
    if (!codeTrim || !newPassword) {
      setError(t.errors.missingNewPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.errors.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: codeTrim,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const target = getRedirectTarget();
        if (typeof window !== "undefined") window.location.assign(target);
        return;
      }
      if (result.status === "needs_second_factor") {
        setCode("");
        await prepare2fa(result);
        return;
      }
      setError(t.errors.resetFailed);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ code?: string }> };
      const errCode = e?.errors?.[0]?.code ?? "";
      if (errCode === "form_code_incorrect" || errCode === "verification_failed") {
        setError(t.errors.invalidCode);
      } else if (errCode === "form_password_pwned") {
        setError(t.errors.passwordPwned);
      } else if (errCode === "form_password_length_too_short") {
        setError(t.errors.passwordTooShort);
      } else if (
        errCode === "form_password_not_strong_enough" ||
        errCode === "form_password_validation_failed" ||
        errCode === "form_password_size_in_bytes_exceeded"
      ) {
        setError(t.errors.passwordWeak);
      } else {
        setError(clerkErrorMessage(err, t.errors.resetFailed));
      }
    } finally {
      setSubmitting(false);
    }
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
        {(mode === "password" || mode === "email-code-request") && (
          <>
            <button
              type="button"
              onClick={onGoogle}
              disabled={!isLoaded || googleLoading || submitting || sendingCode}
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
          </>
        )}

        {mode === "password" && (
          <form onSubmit={onSubmitPassword} className="space-y-4">
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
                  autoComplete="current-password"
                  required
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
              <div className={`mt-1.5 ${isAr ? "text-left" : "text-right"}`}>
                <button
                  type="button"
                  onClick={() => { setError(null); setCode(""); setMode("reset-request"); }}
                  className="text-xs text-secondary hover:underline"
                >
                  {t.forgotPassword}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div id="clerk-captcha" />

            <Button
              type="submit"
              disabled={!isLoaded || submitting || googleLoading}
              className="w-full rounded-none gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t.submitting : t.submit}
            </Button>

            <button
              type="button"
              onClick={() => { setError(null); setMode("email-code-request"); }}
              className="w-full flex items-center justify-center gap-2 text-sm text-secondary hover:underline pt-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t.emailCodeLink}
            </button>
          </form>
        )}

        {mode === "email-code-request" && (
          <form onSubmit={sendEmailCode} className="space-y-4">
            <div>
              <label htmlFor="email-code" className="block text-sm font-bold text-primary mb-1.5">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
                <input
                  id="email-code"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
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

            <div id="clerk-captcha" />

            <Button
              type="submit"
              disabled={!isLoaded || sendingCode}
              className="w-full rounded-none gap-2"
            >
              {sendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {sendingCode ? t.sendingCode : t.sendCode}
            </Button>

            <button
              type="button"
              onClick={() => { setError(null); setMode("password"); }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary pt-1"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
              {t.backToPassword}
            </button>
          </form>
        )}

        {mode === "reset-request" && (
          <form onSubmit={sendResetCode} className="space-y-4">
            <div>
              <div className="text-base font-bold text-primary mb-1">{t.resetTitle}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{t.resetDesc}</div>
            </div>

            <div>
              <label htmlFor="reset-email" className="block text-sm font-bold text-primary mb-1.5">
                {t.emailLabel}
              </label>
              <div className="relative">
                <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
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

            <div id="clerk-captcha" />

            <Button
              type="submit"
              disabled={!isLoaded || sendingCode}
              className="w-full rounded-none gap-2"
            >
              {sendingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {sendingCode ? t.sendingCode : t.sendResetCode}
            </Button>

            <button
              type="button"
              onClick={() => { setError(null); setMode("password"); }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary pt-1"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
              {t.backToSignIn}
            </button>
          </form>
        )}

        {mode === "reset-verify" && (
          <form onSubmit={submitResetPassword} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t.resetCodeSentTo}{" "}
              <span className="font-bold text-primary" dir="ltr">{email}</span>
            </div>

            <div>
              <label htmlFor="reset-code" className="block text-sm font-bold text-primary mb-1.5">
                {t.codeLabel}
              </label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t.codePlaceholder}
                dir="ltr"
                className="w-full border border-border bg-white px-3 py-3 text-center text-xl tracking-[0.5em] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-bold text-primary mb-1.5">
                {t.newPasswordLabel}
              </label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.newPasswordPlaceholder}
                  dir="ltr"
                  className={`w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary ${isAr ? "pr-9 pl-10 text-right" : "pl-9 pr-10"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  aria-label={showNewPassword ? t.hide : t.show}
                  className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isAr ? "left-3" : "right-3"}`}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-bold text-primary mb-1.5">
                {t.confirmPasswordLabel}
              </label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground ${isAr ? "right-3" : "left-3"}`} />
                <input
                  id="confirm-password"
                  type={showNewPassword ? "text" : "password"}
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
              disabled={!isLoaded || submitting || code.length < 4 || !newPassword || !confirmPassword}
              className="w-full rounded-none gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t.resetSubmitting : t.resetSubmit}
            </Button>

            <div className="flex items-center justify-between text-sm pt-1">
              <button
                type="button"
                onClick={() => { setError(null); setCode(""); setNewPassword(""); setConfirmPassword(""); setMode("password"); }}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
                {t.backToSignIn}
              </button>
              <button
                type="button"
                onClick={() => sendResetCode()}
                disabled={sendingCode}
                className="text-secondary hover:underline disabled:opacity-50"
              >
                {sendingCode ? t.sendingCode : t.resend}
              </button>
            </div>
          </form>
        )}

        {mode === "email-code-verify" && (
          <form onSubmit={verifyEmailCode} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t.codeSentTo}{" "}
              <span className="font-bold text-primary" dir="ltr">{email}</span>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-bold text-primary mb-1.5">
                {t.codeLabel}
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t.codePlaceholder}
                dir="ltr"
                className="w-full border border-border bg-white px-3 py-3 text-center text-xl tracking-[0.5em] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!isLoaded || submitting || code.length < 4}
              className="w-full rounded-none gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t.verifying : t.verify}
            </Button>

            <div className="flex items-center justify-between text-sm pt-1">
              <button
                type="button"
                onClick={() => { setError(null); setCode(""); setMode("email-code-request"); }}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
                {t.backToPassword}
              </button>
              <button
                type="button"
                onClick={() => sendEmailCode()}
                disabled={sendingCode}
                className="text-secondary hover:underline disabled:opacity-50"
              >
                {sendingCode ? t.sendingCode : t.resend}
              </button>
            </div>
          </form>
        )}

        {mode === "2fa-verify" && (
          <form onSubmit={verify2faCode} className="space-y-4">
            <div>
              <div className="text-base font-bold text-primary mb-1">{t.twoFaTitle}</div>
              <div className="text-sm text-muted-foreground">
                {t.twoFaDesc}{" "}
                <span className="font-bold text-primary" dir="ltr">{email}</span>
              </div>
            </div>

            <div>
              <label htmlFor="2fa-code" className="block text-sm font-bold text-primary mb-1.5">
                {t.codeLabel}
              </label>
              <input
                id="2fa-code"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t.codePlaceholder}
                dir="ltr"
                className="w-full border border-border bg-white px-3 py-3 text-center text-xl tracking-[0.5em] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!isLoaded || submitting || code.length < 4}
              className="w-full rounded-none gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? t.verifying : t.verify}
            </Button>

            <button
              type="button"
              onClick={() => { setError(null); setCode(""); setMode("password"); }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary pt-1"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
              {t.backToPassword}
            </button>
          </form>
        )}

        <div className={`mt-5 text-sm text-muted-foreground ${isAr ? "text-right" : "text-left"}`}>
          {t.noAccount}{" "}
          <a
            href={`${basePath}/sign-up${typeof window !== "undefined" ? window.location.search : ""}`}
            className="font-bold text-secondary hover:underline"
          >
            {t.signUp}
          </a>
        </div>
      </div>
    </div>
  );
}
