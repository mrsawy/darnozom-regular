import { useState, type FormEvent } from "react";
import { Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/**
 * Self-hosted replacement for Clerk's `openUserProfile()` modal.
 *
 * Clerk rendered a hosted, separately themed profile dialog covering name,
 * avatar, email addresses, connected accounts, and password. This covers the
 * two things this app actually lets people change — display name and password —
 * in the site's own styling and both languages. Email changes are deliberately
 * left out: they require a verification round-trip and nothing in the app keys
 * off a changed address today.
 */
const COPY = {
  ar: {
    title: "تعديل البروفايل",
    close: "إغلاق",
    nameSection: "الاسم",
    nameLabel: "الاسم المعروض",
    saveName: "حفظ الاسم",
    savingName: "جارٍ الحفظ...",
    nameSaved: "تم حفظ الاسم",
    passwordSection: "كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة",
    passwordPlaceholder: "8 أحرف على الأقل",
    savePassword: "تغيير كلمة المرور",
    savingPassword: "جارٍ التغيير...",
    passwordSaved: "تم تغيير كلمة المرور",
    signOutOthers: "تسجيل الخروج من الأجهزة الأخرى",
    errors: {
      nameRequired: "من فضلك ادخل الاسم",
      missing: "من فضلك املأ جميع الحقول",
      mismatch: "كلمتا المرور غير متطابقتين",
      tooShort: "كلمة المرور قصيرة جداً — استخدم 8 أحرف على الأقل",
      wrongPassword: "كلمة المرور الحالية غير صحيحة",
      noPassword: "هذا الحساب يسجّل الدخول عبر Google ولا يملك كلمة مرور.",
      generic: "تعذر الحفظ. حاول مرة أخرى.",
    },
  },
  en: {
    title: "Edit profile",
    close: "Close",
    nameSection: "Name",
    nameLabel: "Display name",
    saveName: "Save name",
    savingName: "Saving...",
    nameSaved: "Name saved",
    passwordSection: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordPlaceholder: "At least 8 characters",
    savePassword: "Change password",
    savingPassword: "Changing...",
    passwordSaved: "Password changed",
    signOutOthers: "Sign out of other devices",
    errors: {
      nameRequired: "Please enter a name",
      missing: "Please fill in every field",
      mismatch: "Passwords don't match",
      tooShort: "Password is too short — use at least 8 characters",
      wrongPassword: "Your current password is incorrect",
      noPassword: "This account signs in with Google and has no password.",
      generic: "Unable to save. Please try again.",
    },
  },
} as const;

const inputClass =
  "w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary";

export function ProfileDialog({
  open,
  onClose,
  language,
  currentName,
  email,
}: {
  open: boolean;
  onClose: () => void;
  language: "ar" | "en";
  currentName: string;
  email: string;
}) {
  const t = COPY[language];
  const isAr = language === "ar";

  const [name, setName] = useState(currentName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState(false);

  if (!open) return null;

  async function onSaveName(e: FormEvent) {
    e.preventDefault();
    setNameError(null);
    setNameOk(false);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t.errors.nameRequired);
      return;
    }
    setSavingName(true);
    try {
      const { error } = await authClient.updateUser({ name: trimmed });
      if (error) {
        setNameError(error.message || t.errors.generic);
        return;
      }
      setNameOk(true);
    } catch {
      setNameError(t.errors.generic);
    } finally {
      setSavingName(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordOk(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t.errors.missing);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.errors.mismatch);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t.errors.tooShort);
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        // Changing a password is the standard moment to invalidate sessions
        // elsewhere — it is the only lever a user has if an old device is lost.
        revokeOtherSessions: revokeOthers,
      });
      if (error) {
        setPasswordError(
          error.code === "INVALID_PASSWORD"
            ? t.errors.wrongPassword
            : error.code === "CREDENTIAL_ACCOUNT_NOT_FOUND"
              ? t.errors.noPassword
              : error.message || t.errors.generic,
        );
        return;
      }
      setPasswordOk(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError(t.errors.generic);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-black text-primary">{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="text-muted-foreground hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-8">
          <div className="text-sm">
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-mono text-primary break-all" dir="ltr">{email}</div>
          </div>

          <form onSubmit={onSaveName} className="space-y-3">
            <div className="text-sm font-bold text-primary">{t.nameSection}</div>
            <div>
              <label htmlFor="profile-name" className="block text-xs text-muted-foreground mb-1.5">
                {t.nameLabel}
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameOk(false); }}
                className={`${inputClass} ${isAr ? "text-right" : ""}`}
              />
            </div>
            {nameError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{nameError}</span>
              </div>
            )}
            {nameOk && (
              <div className="flex items-center gap-2 text-secondary text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t.nameSaved}</span>
              </div>
            )}
            <Button type="submit" disabled={savingName} className="rounded-none gap-2">
              {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {savingName ? t.savingName : t.saveName}
            </Button>
          </form>

          <form onSubmit={onChangePassword} className="space-y-3 border-t border-border pt-6">
            <div className="text-sm font-bold text-primary">{t.passwordSection}</div>
            <div>
              <label htmlFor="current-password" className="block text-xs text-muted-foreground mb-1.5">
                {t.currentPassword}
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordOk(false); }}
                className={inputClass}
                dir="ltr"
              />
            </div>
            <div>
              <label htmlFor="profile-new-password" className="block text-xs text-muted-foreground mb-1.5">
                {t.newPassword}
              </label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordOk(false); }}
                placeholder={t.passwordPlaceholder}
                className={inputClass}
                dir="ltr"
              />
            </div>
            <div>
              <label htmlFor="profile-confirm-password" className="block text-xs text-muted-foreground mb-1.5">
                {t.confirmPassword}
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordOk(false); }}
                placeholder={t.passwordPlaceholder}
                className={inputClass}
                dir="ltr"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(e) => setRevokeOthers(e.target.checked)}
                className="accent-[#0F3D2E]"
              />
              {t.signOutOthers}
            </label>
            {passwordError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordOk && (
              <div className="flex items-center gap-2 text-secondary text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t.passwordSaved}</span>
              </div>
            )}
            <Button type="submit" disabled={savingPassword} className="rounded-none gap-2">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {savingPassword ? t.savingPassword : t.savePassword}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
