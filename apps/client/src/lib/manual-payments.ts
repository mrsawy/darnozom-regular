export type ManualPaymentCode = "vodafone_cash" | "instapay";

export interface ManualPaymentDetails {
  code: ManualPaymentCode;
  account_number: string | null;
  account_name: string | null;
  whatsapp_number: string | null;
  instapay_address: string | null;
  qr_image_url: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
}

export const MANUAL_METHOD_LABELS: Record<ManualPaymentCode, { ar: string; en: string }> = {
  vodafone_cash: { ar: "فودافون كاش", en: "Vodafone Cash" },
  instapay: { ar: "إنستاباي", en: "InstaPay" },
};

export function isManualPaymentCode(m: unknown): m is ManualPaymentCode {
  return m === "vodafone_cash" || m === "instapay";
}

/** Normalize a phone number to wa.me format (international digits, no +). */
export function toWhatsAppDigits(raw: string): string | null {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Egyptian local mobile: 01XXXXXXXXX → 201XXXXXXXXX
  if (digits.length === 11 && digits.startsWith("01")) digits = `2${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function buildWhatsAppLink(p: {
  number: string;
  orderId: number;
  method: ManualPaymentCode;
  amount: string;
  currency: string;
  lang: "ar" | "en";
}): string | null {
  const digits = toWhatsAppDigits(p.number);
  if (!digits) return null;
  const label = MANUAL_METHOD_LABELS[p.method][p.lang];
  const text =
    p.lang === "ar"
      ? p.method === "vodafone_cash"
        ? `طلب رقم #${p.orderId} — تم الدفع عبر ${label} بمبلغ ${p.amount} ${p.currency}. مرفق صورة الإيصال.`
        : `طلب رقم #${p.orderId} — تم الدفع عبر ${label} بمبلغ ${p.amount} ${p.currency}. رمز التأكيد: `
      : p.method === "vodafone_cash"
        ? `Order #${p.orderId} — paid via ${label}, ${p.amount} ${p.currency}. Screenshot attached.`
        : `Order #${p.orderId} — paid via ${label}, ${p.amount} ${p.currency}. Confirmation code: `;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Enough data to actually pay and send proof. */
export function isConfigured(d: ManualPaymentDetails | undefined): boolean {
  if (!d || !d.whatsapp_number) return false;
  return d.code === "vodafone_cash"
    ? !!d.account_number
    : !!(d.qr_image_url || d.instapay_address);
}

/**
 * Hide Vodafone Cash / InstaPay at checkout until the admin has filled in
 * the details a buyer needs to pay (see isConfigured). Enabling the provider
 * on the Medusa region alone is not enough — otherwise the buyer places an
 * order and lands on an instructions page with no number to pay to.
 */
export function withoutUnconfiguredManualMethods<M extends string>(
  methods: M[],
  details: ManualPaymentDetails[],
): M[] {
  return methods.filter(
    (m) => !isManualPaymentCode(m) || isConfigured(details.find((d) => d.code === m)),
  );
}

/**
 * Manual methods enabled on the region whose details are still missing.
 * Checkout lists these disabled with a "not set up yet" note instead of
 * hiding them, so enabling the provider in Medusa visibly does something.
 */
export function unconfiguredManualMethods(
  methods: string[],
  details: ManualPaymentDetails[],
): ManualPaymentCode[] {
  return methods.filter(
    (m): m is ManualPaymentCode =>
      isManualPaymentCode(m) && !isConfigured(details.find((d) => d.code === m)),
  );
}
