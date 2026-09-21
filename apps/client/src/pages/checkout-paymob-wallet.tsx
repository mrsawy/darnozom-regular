import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  RefreshCcw,
  ExternalLink,
  XCircle,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

const COPY = {
  ar: {
    title: "الدفع عبر المحفظة الإلكترونية",
    subtitle:
      "تم إرسال طلب دفع إلى هاتف محفظتك. أكمل الدفع من تطبيق المحفظة أو عبر صفحة الدفع.",
    loading: "جارٍ تجهيز طلب الدفع...",
    verifying: "جارٍ التحقق من الدفع...",
    openWallet: "فتح صفحة الدفع",
    openWalletHint:
      "افتح صفحة الدفع لإتمام العملية عبر فودافون كاش أو أورنج موني أو اتصالات كاش، أو وافق على طلب الدفع من تطبيق محفظتك مباشرة.",
    paidCheck: "لقد أتممت الدفع",
    paidCheckHint: "أتممت الدفع ولم تتحدث الصفحة؟ اضغط للتحقق الآن.",
    success: "تم الدفع بنجاح",
    successDesc:
      "تم استلام دفعتك وتأكيد طلبك. يمكنك تتبع الطلب من صفحة حسابك، وتصفح الكتب الرقمية فوراً.",
    failed: "تعذّر تجهيز طلب الدفع",
    failedDesc:
      "لم نتمكن من تجهيز طلب الدفع عبر المحفظة. لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى.",
    retry: "إعادة المحاولة",
    orderNo: "رقم الطلب",
    viewOrders: "عرض طلباتي",
    backToStore: "تصفح المتجر",
    backToCart: "الرجوع إلى السلة",
    egpNote: "* يُحصّل المبلغ بالجنيه المصري عبر بوابة Paymob الآمنة.",
    autoNote: "بعد إتمام الدفع سيتم تأكيد طلبك تلقائياً خلال لحظات.",
    cancel: "إلغاء عملية الدفع",
    cancelling: "جارٍ الإلغاء...",
    cancelHint:
      "تعذّر الدفع أو غيّرت رأيك؟ يمكنك إلغاء العملية والعودة لاختيار طريقة أخرى — لن يُخصم أي مبلغ.",
    cancelled: "تم إلغاء عملية الدفع",
    cancelledDesc:
      "تم إلغاء الطلب ولم يتم خصم أي مبلغ. سلة مشترياتك كما هي — يمكنك إعادة المحاولة بطريقة دفع أخرى.",
    chooseAnother: "اختيار طريقة دفع أخرى",
    cancelFailed: "تعذّر الإلغاء الآن. حاول مرة أخرى.",
    declined: "تم رفض عملية الدفع",
    declinedDesc:
      "رفضت المحفظة أو بوابة الدفع هذه العملية ولم يتم خصم أي مبلغ. يمكنك إعادة المحاولة أو اختيار طريقة دفع مختلفة.",
    declineReason: "سبب الرفض",
    retryPayment: "إعادة المحاولة بالدفع",
  },
  en: {
    title: "Mobile wallet payment",
    subtitle:
      "A payment request was sent to your wallet phone. Complete it from your wallet app or via the payment page.",
    loading: "Preparing the payment request...",
    verifying: "Verifying payment...",
    openWallet: "Open payment page",
    openWalletHint:
      "Open the payment page to pay with Vodafone Cash, Orange Money or Etisalat Cash — or approve the payment request directly from your wallet app.",
    paidCheck: "I've completed the payment",
    paidCheckHint: "Finished paying but the page didn't update? Click to verify now.",
    success: "Payment successful",
    successDesc:
      "Your payment was received and your order is confirmed. Track it from your account and access digital books right away.",
    failed: "Could not prepare the payment request",
    failedDesc:
      "We couldn't prepare the wallet payment request. No amount was charged. You can try again.",
    retry: "Try again",
    orderNo: "Order #",
    viewOrders: "View my orders",
    backToStore: "Browse the store",
    backToCart: "Back to cart",
    egpNote: "* The amount is charged in EGP via the secure Paymob gateway.",
    autoNote: "Once you finish paying, your order is confirmed automatically within moments.",
    cancel: "Cancel payment",
    cancelling: "Cancelling...",
    cancelHint:
      "Payment declined or changed your mind? You can cancel and choose another payment method — nothing has been charged.",
    cancelled: "Payment cancelled",
    cancelledDesc:
      "The order was cancelled and nothing was charged. Your cart is untouched — you can try again with another payment method.",
    chooseAnother: "Choose another payment method",
    cancelFailed: "Could not cancel right now. Please try again.",
    declined: "Payment declined",
    declinedDesc:
      "Your wallet or the payment gateway declined this transaction and nothing was charged. You can try again or choose a different payment method.",
    declineReason: "Decline reason",
    retryPayment: "Try the payment again",
  },
};

// Failure reasons are stored like "PAYMOB_DECLINED: Do not honour (code 05)".
// Strip the machine prefix for display; hide purely internal codes.
function formatDeclineReason(reason: string | null | undefined): string | null {
  if (!reason || typeof reason !== "string") return null;
  const cleaned = reason.replace(/^PAYMOB_DECLINED:?\s*/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export default function CheckoutPaymobWalletPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const { clear } = useCart();

  const [status, setStatus] = useState<
    "loading" | "paying" | "paid" | "failed" | "cancelled" | "declined"
  >("loading");
  const [declineReason, setDeclineReason] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const clearedRef = useRef(false);

  const params = new URLSearchParams(window.location.search);
  const orderIdParam = params.get("orderId");
  const orderId = orderIdParam ? Number(orderIdParam) : NaN;
  const validOrder = Number.isFinite(orderId) && orderId > 0;

  // Resolve the wallet redirect URL: use the one stashed by the checkout page
  // if present, otherwise ask the server to restart the wallet payment.
  useEffect(() => {
    if (!validOrder) {
      setStatus("failed");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("loading");
      let url: string | null = null;
      try {
        url = sessionStorage.getItem(`paymob-wallet-${orderId}`);
      } catch {
        url = null;
      }
      if (!url) {
        try {
          const guestEmail = (() => {
            try {
              return sessionStorage.getItem(`order-email-${orderId}`);
            } catch {
              return null;
            }
          })();
          const res = await fetch(`/api/store/orders/${orderId}/paymob-wallet-checkout`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(guestEmail ? { email: guestEmail } : {}),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && body.redirectUrl) {
            url = String(body.redirectUrl);
          } else if (
            res.status === 400 &&
            typeof body.error === "string" &&
            body.error.includes("already paid")
          ) {
            // Order already paid (webhook won) — jump straight to success.
            if (!cancelled) {
              if (!clearedRef.current) {
                clearedRef.current = true;
                clear();
              }
              setStatus("paid");
            }
            return;
          }
        } catch {
          url = null;
        }
      }
      if (cancelled) return;
      if (url) {
        setRedirectUrl(url);
        setStatus("paying");
      } else {
        setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, validOrder, reloadKey]);

  const markPaid = useCallback(() => {
    if (!clearedRef.current) {
      clearedRef.current = true;
      try {
        sessionStorage.removeItem(`paymob-wallet-${orderId}`);
      } catch {
        // ignore
      }
      clear();
    }
    setStatus("paid");
  }, [clear, orderId]);

  const confirmPayment = useCallback(async (): Promise<boolean> => {
    try {
      const guestEmail = (() => {
        try {
          return sessionStorage.getItem(`order-email-${orderId}`);
        } catch {
          return null;
        }
      })();
      const res = await fetch(`/api/store/orders/${orderId}/paymob-confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestEmail ? { email: guestEmail } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.paymentStatus === "paid") {
        markPaid();
        return true;
      }
      if (res.ok && body.paymentStatus === "failed") {
        // Declined — swap the wallet prompt for the decline screen right away.
        try {
          sessionStorage.removeItem(`paymob-wallet-${orderId}`);
        } catch {
          // ignore
        }
        setDeclineReason(
          typeof body.paymentFailureReason === "string"
            ? body.paymentFailureReason
            : null,
        );
        setStatus("declined");
      }
    } catch {
      // transient — the poll will retry
    }
    return false;
  }, [orderId, markPaid]);

  // Poll for payment confirmation while awaiting the wallet payment. The
  // Paymob webhook usually flips the order first; this poll picks that up
  // (and also verifies directly with Paymob as a fallback).
  useEffect(() => {
    if (status !== "paying" || !validOrder) return;
    let stopped = false;
    const timer = setInterval(() => {
      if (stopped) return;
      void confirmPayment();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [status, validOrder, confirmPayment]);

  async function onManualCheck() {
    setVerifying(true);
    await confirmPayment();
    setVerifying(false);
  }

  // Retry after a decline: drop any stale redirect URL and rerun the load
  // effect — the server reopens the failed order and issues a fresh redirect.
  function onRetryDeclined() {
    try {
      sessionStorage.removeItem(`paymob-wallet-${orderId}`);
    } catch {
      // ignore
    }
    setDeclineReason(null);
    setReloadKey((k) => k + 1);
  }

  async function onCancel() {
    if (!validOrder || cancelling) return;
    setCancelling(true);
    setCancelError(false);
    try {
      const res = await fetch(`/api/account/me/orders/${orderId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === "cancelled") {
        try {
          sessionStorage.removeItem(`paymob-wallet-${orderId}`);
        } catch {
          // ignore
        }
        setStatus("cancelled");
      } else {
        // The order may have just been paid (webhook won the race) — verify
        // before reporting a cancel failure.
        const paid = await confirmPayment();
        if (!paid) setCancelError(true);
      }
    } catch {
      setCancelError(true);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {status === "paying" && (
        <div className="bg-primary text-primary-foreground py-10">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="w-6 h-6 text-secondary" />
              <h1 className="text-2xl md:text-3xl font-black">{t.title}</h1>
            </div>
            <p className="text-primary-foreground/70">{t.subtitle}</p>
          </div>
        </div>
      )}

      <div
        className={
          status === "paying" ? "max-w-4xl mx-auto px-6 py-8" : "max-w-2xl mx-auto px-6 py-20"
        }
      >
        {status === "loading" && (
          <div className="bg-card border border-border p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-secondary mx-auto mb-3" />
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        )}

        {status === "paying" && redirectUrl && (
          <div className="space-y-4">
            <div
              className="bg-card border border-border p-8 text-center"
              data-testid="paymob-wallet-wrap"
            >
              <Smartphone className="w-12 h-12 text-secondary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
                {t.openWalletHint}
              </p>
              <Button
                asChild
                className="rounded-none gap-2 h-11 px-6"
                data-testid="button-open-wallet"
              >
                <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  {t.openWallet}
                </a>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{t.egpNote}</p>
            <div className="bg-card border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t.autoNote}</p>
              <Button
                type="button"
                variant="outline"
                onClick={onManualCheck}
                disabled={verifying}
                className="rounded-none gap-2 shrink-0"
                data-testid="button-paymob-wallet-confirm"
              >
                {verifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                {verifying ? t.verifying : t.paidCheck}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{t.paidCheckHint}</p>
            <div className="bg-card border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t.cancelHint}</p>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={cancelling}
                className="rounded-none gap-2 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                data-testid="button-paymob-wallet-cancel"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {cancelling ? t.cancelling : t.cancel}
              </Button>
            </div>
            {cancelError && (
              <p className="text-[11px] text-destructive" data-testid="text-cancel-error">
                {t.cancelFailed}{" "}
                <Link href="/cart" className="underline text-primary">
                  {t.backToCart}
                </Link>
              </p>
            )}
          </div>
        )}

        {status === "declined" && (
          <div
            className="bg-card border border-border p-8 text-center"
            data-testid="paymob-wallet-declined"
          >
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.declined}</h1>
            <p className="text-muted-foreground mb-4">{t.declinedDesc}</p>
            {formatDeclineReason(declineReason) && (
              <div
                className="bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4 max-w-md mx-auto"
                data-testid="text-decline-reason"
              >
                <span className="font-bold">{t.declineReason}:</span>{" "}
                {formatDeclineReason(declineReason)}
              </div>
            )}
            {validOrder && (
              <div className="text-sm text-muted-foreground mb-6">
                {t.orderNo}{" "}
                <span className="font-mono font-bold text-primary">#{orderId}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {validOrder && (
                <Button
                  className="rounded-none gap-2"
                  onClick={onRetryDeclined}
                  data-testid="button-retry-declined"
                >
                  <RefreshCcw className="w-4 h-4" />
                  {t.retryPayment}
                </Button>
              )}
              <Link href="/checkout">
                <Button variant="outline" className="rounded-none gap-2">
                  {t.chooseAnother}
                  <Arrow className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "cancelled" && (
          <div
            className="bg-card border border-border p-8 text-center"
            data-testid="paymob-wallet-cancelled"
          >
            <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.cancelled}</h1>
            <p className="text-muted-foreground mb-6">{t.cancelledDesc}</p>
            {validOrder && (
              <div className="text-sm text-muted-foreground mb-6">
                {t.orderNo}{" "}
                <span className="font-mono font-bold text-primary">#{orderId}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Link href="/checkout">
                <Button className="rounded-none gap-2">
                  {t.chooseAnother}
                  <Arrow className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/services/store">
                <Button variant="outline" className="rounded-none">
                  {t.backToStore}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "paid" && (
          <div className="bg-card border border-border p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.success}</h1>
            <p className="text-muted-foreground mb-6">{t.successDesc}</p>
            {validOrder && (
              <div className="text-sm text-muted-foreground mb-6">
                {t.orderNo}{" "}
                <span className="font-mono font-bold text-primary">#{orderId}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Link href="/account?tab=orders">
                <Button className="rounded-none gap-2">
                  {t.viewOrders}
                  <Arrow className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/services/store">
                <Button variant="outline" className="rounded-none">
                  {t.backToStore}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="bg-card border border-border p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.failed}</h1>
            <p className="text-muted-foreground mb-6">{t.failedDesc}</p>
            <div className="flex items-center justify-center gap-3">
              {validOrder && (
                <Button
                  className="rounded-none gap-2"
                  onClick={() => setReloadKey((k) => k + 1)}
                >
                  <RefreshCcw className="w-4 h-4" />
                  {t.retry}
                </Button>
              )}
              <Link href="/cart">
                <Button variant="outline" className="rounded-none gap-2">
                  {t.backToCart}
                  <Arrow className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
