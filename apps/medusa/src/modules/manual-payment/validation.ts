export const MANUAL_PAYMENT_CODES = ["vodafone_cash", "instapay"] as const;
export type ManualPaymentCode = (typeof MANUAL_PAYMENT_CODES)[number];

export type ManualPaymentMethodDTO = {
  id: string;
  code: ManualPaymentCode;
  account_number: string | null;
  account_name: string | null;
  whatsapp_number: string | null;
  instapay_address: string | null;
  qr_image_url: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
};

export type ManualPaymentPatch = Partial<Omit<ManualPaymentMethodDTO, "id" | "code">>;

const TEXT_FIELDS = ["account_name", "instapay_address", "instructions_ar", "instructions_en"] as const;
const PHONE_FIELDS = ["account_number", "whatsapp_number"] as const;
const MAX_LEN = 2000;

export function isManualPaymentCode(v: unknown): v is ManualPaymentCode {
  return typeof v === "string" && (MANUAL_PAYMENT_CODES as readonly string[]).includes(v);
}

function isValidPhone(v: string): boolean {
  if (!/^\+?[\d\s\-()]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function isValidImageUrl(v: string): boolean {
  if (v.startsWith("/static/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseManualPaymentPatch(
  body: unknown,
): { ok: true; patch: ManualPaymentPatch } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const input = body as Record<string, unknown>;
  const patch: ManualPaymentPatch = {};

  const readString = (key: string): string | null | undefined | Error => {
    if (!(key in input)) return undefined;
    const raw = input[key];
    if (raw === null) return null;
    if (typeof raw !== "string") return new Error(`${key} must be a string`);
    const trimmed = raw.trim();
    if (trimmed.length > MAX_LEN) return new Error(`${key} is too long (max ${MAX_LEN})`);
    return trimmed === "" ? null : trimmed;
  };

  for (const key of TEXT_FIELDS) {
    const v = readString(key);
    if (v instanceof Error) return { ok: false, error: v.message };
    if (v !== undefined) patch[key] = v;
  }
  for (const key of PHONE_FIELDS) {
    const v = readString(key);
    if (v instanceof Error) return { ok: false, error: v.message };
    if (v !== undefined) {
      if (v !== null && !isValidPhone(v)) {
        return { ok: false, error: `${key} is not a valid phone number` };
      }
      patch[key] = v;
    }
  }
  const qr = readString("qr_image_url");
  if (qr instanceof Error) return { ok: false, error: qr.message };
  if (qr !== undefined) {
    if (qr !== null && !isValidImageUrl(qr)) {
      return { ok: false, error: "qr_image_url must be an http(s) URL or /static/ path" };
    }
    patch.qr_image_url = qr;
  }
  return { ok: true, patch };
}
