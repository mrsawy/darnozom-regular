import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

const COPY = {
  ar: {
    verifying: "جارٍ تأكيد الدفع...",
    verifyingDesc: "لحظات من فضلك، نتحقق من عملية الدفع عبر PayPal.",
    success: "تم الدفع بنجاح",
    successDesc:
      "تم استلام دفعتك وتأكيد طلبك. يمكنك تتبع الطلب من صفحة حسابك، وتصفح الكتب الرقمية فوراً.",
    failed: "تعذّر تأكيد الدفع",
    failedDesc:
      "لم نتمكن من إتمام عملية الدفع. لم يتم خصم أي مبلغ في العادة. يمكنك المحاولة مرة أخرى من السلة.",
    terminalFailed: "فشل تحصيل الدفع",
    terminalFailedDesc:
      "فشل تحصيل الدفع — تم إرجاع المبلغ إليك تلقائياً إن كان قد تم خصمه. لا يمكن إعادة المحاولة على هذا الطلب؛ يمكنك إنشاء طلب جديد من السلة أو التواصل مع الدعم.",
    orderNo: "رقم الطلب",
    viewOrders: "عرض طلباتي",
    backToStore: "تصفح المتجر",
    backToCart: "الرجوع إلى السلة",
  },
  en: {
    verifying: "Confirming payment...",
    verifyingDesc: "One moment please, we're verifying your PayPal payment.",
    success: "Payment successful",
    successDesc:
      "Your payment was received and your order is confirmed. Track it from your account and access digital books right away.",
    failed: "Could not confirm payment",
    failedDesc:
      "We couldn't complete the payment. Usually no amount is charged. You can try again from your cart.",
    terminalFailed: "Payment failed",
    terminalFailedDesc:
      "The payment could not be collected — any charged amount has been refunded to you automatically. This order cannot be retried; you can place a new order from your cart or contact support.",
    orderNo: "Order #",
    viewOrders: "View my orders",
    backToStore: "Browse the store",
    backToCart: "Back to cart",
  },
};

export default function CheckoutPayPalReturnPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const { clear } = useCart();

  const [status, setStatus] = useState<
    "verifying" | "success" | "failed" | "terminal_failed"
  >("verifying");
  const [orderId, setOrderId] = useState<number | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    // PayPal appends its own token param; our reference is the order id, which
    // we resolve from `orderId` if present, else from the PayPal `token`.
    const orderIdParam = params.get("orderId");
    const idNum = orderIdParam ? Number(orderIdParam) : NaN;

    async function run(id: number) {
      try {
        const res = await fetch(`/api/store/orders/${id}/capture`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.paymentStatus === "paid") {
          setStatus("success");
          setOrderId(id);
          clear();
        } else if (body.terminal || body.paymentStatus === "failed") {
          // Definitive rejection (e.g. PayPal COMPLIANCE_VIOLATION): the
          // charge can never be retried and any charged amount is
          // auto-refunded by PayPal.
          setStatus("terminal_failed");
          setOrderId(id);
        } else {
          setStatus("failed");
          setOrderId(id);
        }
      } catch {
        setStatus("failed");
        setOrderId(id);
      }
    }

    if (Number.isFinite(idNum) && idNum > 0) {
      void run(idNum);
    } else {
      setStatus("failed");
    }
  }, [clear]);

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="bg-card border border-border p-8 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-secondary mx-auto mb-3" />
              <h1 className="text-2xl font-black text-primary mb-2">{t.verifying}</h1>
              <p className="text-muted-foreground">{t.verifyingDesc}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h1 className="text-2xl font-black text-primary mb-2">{t.success}</h1>
              <p className="text-muted-foreground mb-6">{t.successDesc}</p>
              {orderId && (
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
            </>
          )}

          {status === "terminal_failed" && (
            <>
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <h1
                className="text-2xl font-black text-primary mb-2"
                data-testid="text-payment-terminal-failed"
              >
                {t.terminalFailed}
              </h1>
              <p className="text-muted-foreground mb-6">{t.terminalFailedDesc}</p>
              {orderId && (
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
            </>
          )}

          {status === "failed" && (
            <>
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <h1 className="text-2xl font-black text-primary mb-2">{t.failed}</h1>
              <p className="text-muted-foreground mb-6">{t.failedDesc}</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/cart">
                  <Button className="rounded-none gap-2">
                    {t.backToCart}
                    <Arrow className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/services/store">
                  <Button variant="outline" className="rounded-none">
                    {t.backToStore}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
