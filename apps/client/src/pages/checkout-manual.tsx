import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Copy, Loader2, MessageCircle } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { fetchManualPaymentMethods } from "@/lib/medusa-client";
import {
  MANUAL_METHOD_LABELS,
  buildWhatsAppLink,
  isConfigured,
  isManualPaymentCode,
  type ManualPaymentDetails,
} from "@/lib/manual-payments";

interface OrderSummary {
  id: number;
  totalAmount: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
}

const COPY = {
  ar: {
    title: "أكمل الدفع",
    order: "رقم الطلب",
    amount: "المبلغ المطلوب",
    wallet: "رقم المحفظة",
    holder: "اسم صاحب الحساب",
    address: "عنوان إنستاباي",
    scan: "امسح رمز QR من تطبيق إنستاباي",
    vcSteps: "حوّل المبلغ إلى رقم فودافون كاش أعلاه، ثم أرسل صورة الإيصال على واتساب.",
    ipSteps: "ادفع عبر إنستاباي، ثم أرسل رمز التأكيد على واتساب.",
    vcButton: "إرسال صورة الإيصال على واتساب",
    ipButton: "إرسال رمز التأكيد على واتساب",
    after: "سنؤكد الدفع ونفعّل طلبك في أقرب وقت. ستصلك رسالة بالبريد عند التأكيد.",
    notConfigured: "بيانات الدفع قيد التحديث حالياً. يرجى التواصل معنا لإتمام الدفع.",
    contact: "تواصل معنا",
    paid: "تم تأكيد الدفع. شكراً لك!",
    account: "طلباتي",
    notFound: "لم يتم العثور على الطلب. افتح الرابط من البريد الإلكتروني أو سجّل الدخول.",
    copy: "نسخ",
    copied: "تم النسخ",
  },
  en: {
    title: "Complete your payment",
    order: "Order number",
    amount: "Amount due",
    wallet: "Wallet number",
    holder: "Account holder",
    address: "InstaPay address",
    scan: "Scan the QR code from the InstaPay app",
    vcSteps:
      "Transfer the amount to the Vodafone Cash number above, then send the receipt screenshot on WhatsApp.",
    ipSteps: "Pay via InstaPay, then send the confirmation code on WhatsApp.",
    vcButton: "Send screenshot on WhatsApp",
    ipButton: "Send confirmation code on WhatsApp",
    after:
      "We'll confirm your payment and activate your order shortly. You'll get an email once it's confirmed.",
    notConfigured: "Payment details are being updated. Please contact us to complete your payment.",
    contact: "Contact us",
    paid: "Payment confirmed. Thank you!",
    account: "My orders",
    notFound: "Order not found. Open the link from your email or sign in.",
    copy: "Copy",
    copied: "Copied",
  },
} as const;

type Copy = (typeof COPY)["en"] | (typeof COPY)["ar"];

function CopyValue({ value, t }: { value: string; t: Copy }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono font-bold text-primary" dir="ltr">
        {value}
      </span>
      <button
        type="button"
        className="text-xs text-secondary inline-flex items-center gap-1"
        onClick={() => {
          navigator.clipboard
            ?.writeText(value)
            .then(() => setCopied(true))
            .catch(() => {});
        }}
      >
        <Copy className="w-3 h-3" /> {copied ? t.copied : t.copy}
      </button>
    </span>
  );
}

export default function CheckoutManualPage() {
  const { language } = useLanguage();
  const lang: "ar" | "en" = language === "ar" ? "ar" : "en";
  const t = COPY[lang];

  const params = new URLSearchParams(window.location.search);
  const orderId = Number(params.get("orderId"));
  const emailParam = params.get("email");

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [details, setDetails] = useState<ManualPaymentDetails[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) return;
    let email = emailParam;
    if (!email) {
      try {
        email = sessionStorage.getItem(`order-email-${orderId}`);
      } catch {
        email = null;
      }
    }
    const qs = email ? `?email=${encodeURIComponent(email)}` : "";
    Promise.all([
      fetch(`/api/store/orders/${orderId}/manual-payment${qs}`, { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : Promise.reject(r.status)),
      ),
      fetchManualPaymentMethods(),
    ])
      .then(([o, d]) => {
        setOrder(o);
        setDetails(d);
      })
      .catch(() => setError(true));
  }, [orderId, emailParam]);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <div className="container mx-auto max-w-xl px-4 pt-28 pb-16 space-y-6">{children}</div>
    </div>
  );

  if (error || !Number.isInteger(orderId) || orderId <= 0) {
    return shell(<p className="text-center">{t.notFound}</p>);
  }
  if (!order || !details) {
    return shell(
      <div className="flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>,
    );
  }
  if (!isManualPaymentCode(order.paymentMethod)) {
    return shell(<p className="text-center">{t.notFound}</p>);
  }

  const method = order.paymentMethod;
  const d = details.find((x) => x.code === method);
  const label = MANUAL_METHOD_LABELS[method][lang];
  const instructions = d ? (lang === "ar" ? d.instructions_ar : d.instructions_en) : null;
  const waLink = d?.whatsapp_number
    ? buildWhatsAppLink({
        number: d.whatsapp_number,
        orderId: order.id,
        method,
        amount: order.totalAmount,
        currency: order.currency,
        lang,
      })
    : null;

  return shell(
    <>
      <h1 className="text-2xl font-black text-primary">
        {t.title} — {label}
      </h1>
      <div className="border border-border p-4 space-y-1 text-sm">
        <div>
          {t.order}: <strong>#{order.id}</strong>
        </div>
        <div>
          {t.amount}:{" "}
          <strong dir="ltr">
            {order.totalAmount} {order.currency}
          </strong>
        </div>
      </div>

      {order.paymentStatus === "paid" ? (
        <div
          data-testid="manual-paid"
          className="border border-green-600/40 bg-green-600/10 p-4 flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-green-700" /> {t.paid}{" "}
          <Link href="/account" className="underline font-bold">
            {t.account}
          </Link>
        </div>
      ) : !d || !isConfigured(d) ? (
        <div
          data-testid="manual-not-configured"
          className="border border-amber-500/40 bg-amber-500/10 p-4 space-y-2"
        >
          <p>{t.notConfigured}</p>
          <Link href="/contact" className="underline font-bold">
            {t.contact}
          </Link>
        </div>
      ) : (
        <div className="border border-border p-4 space-y-4">
          {method === "vodafone_cash" && d.account_number && (
            <div>
              {t.wallet}: <CopyValue value={d.account_number} t={t} />
            </div>
          )}
          {method === "instapay" && d.qr_image_url && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t.scan}</p>
              <img
                src={d.qr_image_url}
                alt="InstaPay QR"
                className="w-56 h-56 object-contain border border-border"
              />
            </div>
          )}
          {method === "instapay" && d.instapay_address && (
            <div>
              {t.address}: <CopyValue value={d.instapay_address} t={t} />
            </div>
          )}
          {d.account_name && (
            <div>
              {t.holder}: <strong>{d.account_name}</strong>
            </div>
          )}
          {instructions && <p className="text-sm whitespace-pre-wrap">{instructions}</p>}
          <p className="text-sm text-muted-foreground">
            {method === "vodafone_cash" ? t.vcSteps : t.ipSteps}
          </p>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-whatsapp-proof"
              className="block"
            >
              <Button type="button" className="rounded-none gap-2 w-full">
                <MessageCircle className="w-4 h-4" />
                {method === "vodafone_cash" ? t.vcButton : t.ipButton}
              </Button>
            </a>
          )}
          <p className="text-xs text-muted-foreground">{t.after}</p>
        </div>
      )}
    </>,
  );
}
