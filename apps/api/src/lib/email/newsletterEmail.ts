/**
 * Newsletter emails: double-opt-in confirmation and "new content published".
 * Bilingual like the auth emails, but the content email leads with the
 * subscriber's own locale so the item title/summary read naturally.
 */
import { sendEmail, PLATFORM_URL } from "./email";
import type { ContentItem } from "@workspace/db";
import { contentPath } from "../cms/paths";

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const HEADER = `
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | DarNozom</p>
    </div>`;

function shell(inner: string, footer: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
${HEADER}
    <div style="padding: 40px;">
${inner}
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
${footer}
    </div>
  </div>
</body>
</html>`;
}

const button = (url: string, label: string) =>
  `<a href="${esc(url)}" style="display: inline-block; background: #0D1B3E; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 14px; font-weight: bold;">${esc(label)}</a>`;

export const confirmUrl = (token: string) => `${PLATFORM_URL}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
export const unsubscribeUrl = (token: string) => `${PLATFORM_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

export async function sendNewsletterConfirmEmail(params: { to: string; token: string }) {
  const url = confirmUrl(params.token);
  return sendEmail({
    to: params.to,
    subject: "تأكيد الاشتراك في النشرة | Confirm your subscription",
    html: shell(
      `
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 20px;" dir="rtl">تأكيد الاشتراك في نشرة دار نظم</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;" dir="rtl">اضغط الزر أدناه لتأكيد اشتراكك. إن لم تطلب الاشتراك فتجاهل هذه الرسالة.</p>
      <h2 style="color: #0D1B3E; margin: 24px 0 8px 0; font-size: 18px;">Confirm your DarNozom newsletter subscription</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0; line-height: 1.7;">Click the button below to confirm. If you did not request this, ignore this email.</p>
      ${button(url, "تأكيد الاشتراك / Confirm")}
      <p style="color: #999; font-size: 12px; margin: 24px 0 0 0; word-break: break-all;">${esc(url)}</p>`,
      `<p style="color: #999; font-size: 12px; margin: 0;">© DarNozom</p>`,
    ),
  });
}

export async function sendContentPublishedEmail(params: {
  to: string;
  locale: "ar" | "en";
  item: ContentItem;
  unsubscribeToken: string;
}) {
  const { item, locale } = params;
  const ar = locale === "ar";
  const title = (ar ? item.titleAr : item.titleEn) || item.titleAr;
  const summary = (ar ? item.summaryAr : item.summaryEn) || (ar ? "" : item.summaryAr);
  const link = item.isExternal && item.externalUrl ? item.externalUrl : `${PLATFORM_URL}${contentPath(item.type, item.slug)}`;
  const unsub = unsubscribeUrl(params.unsubscribeToken);
  const cover = item.coverImageUrl
    ? `<img src="${esc(item.coverImageUrl.startsWith("/") ? PLATFORM_URL + item.coverImageUrl : item.coverImageUrl)}" alt="" style="width: 100%; border-radius: 6px; margin: 0 0 20px 0;" />`
    : "";
  return sendEmail({
    to: params.to,
    subject: ar ? `جديد من دار نظم: ${title}` : `New from DarNozom: ${title}`,
    headers: {
      "List-Unsubscribe": `<${unsub}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: shell(
      `
      <div dir="${ar ? "rtl" : "ltr"}">
      ${cover}
      <h2 style="color: #0D1B3E; margin: 0 0 12px 0; font-size: 22px; line-height: 1.4;">${esc(title)}</h2>
      ${summary ? `<p style="color: #555; font-size: 15px; margin: 0 0 24px 0; line-height: 1.8;">${esc(summary)}</p>` : ""}
      ${button(link, ar ? "اقرأ المزيد" : "Read more")}
      </div>`,
      `<p style="color: #999; font-size: 12px; margin: 0; line-height: 1.7;" dir="${ar ? "rtl" : "ltr"}">${
        ar ? "تصلك هذه الرسالة لأنك مشترك في نشرة دار نظم." : "You receive this because you subscribed to the DarNozom newsletter."
      } <a href="${esc(unsub)}" style="color: #0D1B3E;">${ar ? "إلغاء الاشتراك" : "Unsubscribe"}</a></p>`,
    ),
  });
}
