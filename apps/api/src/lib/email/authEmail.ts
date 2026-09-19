/**
 * Transactional emails for the auth flows: verify address, reset password, and
 * one-time sign-in code.
 *
 * These are sent bilingually (Arabic first, English beneath) in a single
 * message rather than picking a language per user. The site is fully bilingual
 * and auth emails arrive in contexts where we have no reliable signal about the
 * reader's current UI language — a password reset can be opened days later, on
 * a different device. One email that both audiences can read beats a guess.
 */
import { sendEmail } from "./email";

const BRAND_HEADER = `
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Consulting</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">AI Consulting Platform</p>
    </div>`;

const BRAND_FOOTER = `
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Consulting AI Platform — Confidential &amp; Proprietary</p>
    </div>`;

function shell(inner: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
${BRAND_HEADER}
    <div style="padding: 40px;">
${inner}
    </div>
${BRAND_FOOTER}
  </div>
</body>
</html>`;
}

function actionButton(url: string, label: string): string {
  return `      <a href="${url}" style="display: inline-block; background: #0D1B3E; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 14px; font-weight: bold;">${label}</a>`;
}

/**
 * Codes are rendered as wide-tracked monospace so digits that look alike in a
 * proportional face (1/l, 0/O) stay distinguishable when retyped by hand.
 */
function codeBlock(code: string): string {
  return `      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 24px; margin: 0 0 28px 0; text-align: center;">
        <p style="margin: 0; color: #0D1B3E; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
      </div>`;
}

function fallbackLink(url: string): string {
  return `      <p style="color: #999; font-size: 12px; margin: 24px 0 0 0; line-height: 1.6;">
        إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:<br/>
        If the button does not work, copy this link into your browser:<br/>
        <span style="color: #0D1B3E; word-break: break-all;">${url}</span>
      </p>`;
}

export async function sendVerificationEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "تأكيد بريدك الإلكتروني | Verify your email",
    html: shell(`
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 20px;" dir="rtl">تأكيد بريدك الإلكتروني</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;" dir="rtl">أهلاً بك. اضغط الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك. الرابط صالح لمدة ساعة واحدة.</p>
      <h2 style="color: #0D1B3E; margin: 24px 0 8px 0; font-size: 18px;">Verify your email</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;">Welcome. Click the button below to verify your email address and activate your account. This link is valid for one hour.</p>
${actionButton(params.url, "تأكيد البريد / Verify email")}
${fallbackLink(params.url)}`),
  });
}

export async function sendResetPasswordEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "إعادة تعيين كلمة المرور | Reset your password",
    html: shell(`
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 20px;" dir="rtl">إعادة تعيين كلمة المرور</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;" dir="rtl">تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك. اضغط الزر أدناه لتعيين كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذه الرسالة — لن يتغيّر شيء.</p>
      <h2 style="color: #0D1B3E; margin: 24px 0 8px 0; font-size: 18px;">Reset your password</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;">We received a request to reset your account password. Click below to choose a new one. This link is valid for one hour. If you did not request this, ignore this email — nothing will change.</p>
${actionButton(params.url, "تعيين كلمة مرور جديدة / Reset password")}
${fallbackLink(params.url)}`),
  });
}

type OtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

const OTP_COPY: Record<OtpType, { subject: string; ar: string; en: string }> = {
  "sign-in": {
    subject: "كود تسجيل الدخول | Your sign-in code",
    ar: "استخدم الكود التالي لتسجيل الدخول إلى حسابك. الكود صالح لمدة خمس دقائق ولا تشاركه مع أحد.",
    en: "Use the code below to sign in to your account. It is valid for five minutes — never share it with anyone.",
  },
  "email-verification": {
    subject: "كود تأكيد البريد | Your verification code",
    ar: "استخدم الكود التالي لتأكيد بريدك الإلكتروني. الكود صالح لمدة خمس دقائق.",
    en: "Use the code below to verify your email address. It is valid for five minutes.",
  },
  "forget-password": {
    subject: "كود إعادة تعيين كلمة المرور | Your password reset code",
    ar: "استخدم الكود التالي لإعادة تعيين كلمة المرور. الكود صالح لمدة خمس دقائق. إذا لم تطلب ذلك، تجاهل هذه الرسالة.",
    en: "Use the code below to reset your password. It is valid for five minutes. If you did not request this, ignore this email.",
  },
  "change-email": {
    subject: "كود تغيير البريد الإلكتروني | Your email change code",
    ar: "استخدم الكود التالي لتأكيد تغيير بريدك الإلكتروني. الكود صالح لمدة خمس دقائق.",
    en: "Use the code below to confirm your new email address. It is valid for five minutes.",
  },
};

export async function sendOtpEmail(params: {
  to: string;
  otp: string;
  type: OtpType;
}): Promise<void> {
  const copy = OTP_COPY[params.type];
  await sendEmail({
    to: params.to,
    subject: copy.subject,
    html: shell(`
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 20px;" dir="rtl">${copy.subject.split(" | ")[0]}</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;" dir="rtl">${copy.ar}</p>
${codeBlock(params.otp)}
      <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.7;">${copy.en}</p>`),
  });
}
