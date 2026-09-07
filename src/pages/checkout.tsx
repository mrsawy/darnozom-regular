import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  CreditCard,
  Smartphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const COPY = {
  ar: {
    title: "إتمام الطلب",
    subtitle: "أكمل بياناتك وسنتواصل معك لتأكيد الطلب وترتيب الدفع والتوصيل.",
    contactInfo: "بيانات التواصل",
    fullName: "الاسم الكامل",
    fullNamePh: "اسمك الثلاثي",
    email: "البريد الإلكتروني",
    phone: "رقم الجوال",
    phonePh: "+966...",
    address: "العنوان",
    addressPh: "الحي والشارع ورقم المبنى",
    city: "المدينة",
    notes: "ملاحظات إضافية (اختياري)",
    notesPh: "أي تفاصيل إضافية تخص طلبك",
    summary: "ملخص الطلب",
    items: "العناصر",
    total: "الإجمالي",
    place: "تأكيد الطلب",
    placing: "جارٍ الإرسال...",
    redirecting: "جارٍ التحويل إلى PayPal...",
    backToCart: "الرجوع إلى السلة",
    paymentMethod: "طريقة الدفع",
    card: "بطاقة ائتمان / مدى",
    cardDesc: "ادفع ببطاقتك (Visa / Mastercard / Meeza) عبر بوابة Paymob الآمنة.",
    payCard: "ادفع بالبطاقة",
    payingCard: "جارٍ تجهيز صفحة الدفع...",
    cardEgpNote: "* يُحصّل الدفع بالبطاقة بالجنيه المصري مباشرة دون تحويل عملة.",
    cardSetupNotice:
      "الدفع بالبطاقة غير مفعّل بعد — يتطلب إعداد حساب Paymob. اختر طريقة دفع أخرى حالياً.",
    wallet: "محفظة إلكترونية",
    walletDesc: "ادفع عبر فودافون كاش أو أورنج موني أو اتصالات كاش عبر بوابة Paymob الآمنة.",
    payWallet: "ادفع بالمحفظة",
    payingWallet: "جارٍ تجهيز طلب الدفع...",
    walletEgpNote: "* يُحصّل الدفع عبر المحفظة بالجنيه المصري مباشرة دون تحويل عملة.",
    walletSetupNotice:
      "الدفع عبر المحفظة الإلكترونية غير مفعّل بعد — يتطلب إعداد تكامل المحافظ في Paymob. اختر طريقة دفع أخرى حالياً.",
    walletPhoneLabel: "رقم هاتف المحفظة",
    walletPhonePh: "01XXXXXXXXX",
    walletPhoneHint: "أدخل رقم الهاتف المرتبط بمحفظتك الإلكترونية (مثال: 01012345678).",
    walletPhoneInvalid: "أدخل رقم محفظة مصري صحيح مكوّن من 11 رقماً يبدأ بـ 01.",
    paypal: "PayPal (بطاقة / حساب)",
    paypalDesc: "ادفع بأمان عبر PayPal. تُحوّل القيمة إلى الدولار عند الدفع.",
    cod: "الدفع عند الاستلام",
    codDesc: "ادفع نقداً عند استلام الطلب (النسخ الورقية فقط).",
    codDisabledDigital: "الدفع عند الاستلام غير متاح للكتب الرقمية — اختر PayPal.",
    usdNote: "* يُحصّل الدفع عبر PayPal بالدولار الأمريكي حسب سعر الصرف وقت الدفع.",
    signInRequired: "تسجيل الدخول مطلوب",
    signInDesc: "سجّل دخولك أولاً لإتمام الطلب وتتبعه لاحقاً.",
    signIn: "تسجيل الدخول",
    emptyCart: "السلة فارغة",
    backToStore: "تصفح المتجر",
    success: "تم إنشاء الطلب بنجاح",
    successDesc:
      "سيقوم فريقنا بمراجعة الطلب والتواصل معك خلال 24 ساعة. يمكنك تتبع حالة الطلب من صفحة حسابك.",
    viewOrders: "عرض طلباتي",
    types: { book: "كتاب", course: "دورة", app: "تطبيق" } as Record<string, string>,
    formats: { paper: "ورقي", digital: "رقمي PDF" } as Record<string, string>,
    shippingTo: "الشحن إلى",
    shipping: "الشحن",
    shippingFreePending: "—",
    cityRequiredForPaper: "المدينة مطلوبة للنسخ الورقية",
    addressRequiredForPaper: "العنوان مطلوب للنسخ الورقية",
    shippingNoMatch: "تعذّر حساب تكلفة الشحن حالياً. يرجى المحاولة مرة أخرى.",
    shippingDefault: "لم نجد سعراً مخصصاً لمدينتك، تم تطبيق التعرفة الافتراضية.",
    shippingRetry: "إعادة المحاولة",
    shippingUnresolvedError: "يرجى الانتظار حتى يتم حساب تكلفة الشحن قبل تأكيد الطلب.",
    errors: {
      missing: "من فضلك ادخل الاسم ورقم الجوال",
      generic: "تعذر إرسال الطلب. حاول مرة أخرى.",
    },
  },
  en: {
    title: "Checkout",
    subtitle:
      "Complete your details and we'll contact you to confirm the order and arrange payment and delivery.",
    contactInfo: "Contact information",
    fullName: "Full name",
    fullNamePh: "Your full name",
    email: "Email",
    phone: "Phone number",
    phonePh: "+966...",
    address: "Address",
    addressPh: "District, street, building number",
    city: "City",
    notes: "Additional notes (optional)",
    notesPh: "Any additional details about your order",
    summary: "Order summary",
    items: "Items",
    total: "Total",
    place: "Place order",
    placing: "Submitting...",
    redirecting: "Redirecting to PayPal...",
    backToCart: "Back to cart",
    paymentMethod: "Payment method",
    card: "Credit / Debit card",
    cardDesc: "Pay with your card (Visa / Mastercard / Meeza) via the secure Paymob gateway.",
    payCard: "Pay by card",
    payingCard: "Preparing payment page...",
    cardEgpNote: "* Card payments are charged directly in EGP — no currency conversion.",
    cardSetupNotice:
      "Card payment is not enabled yet — it requires a Paymob account setup. Please choose another payment method for now.",
    wallet: "Mobile wallet",
    walletDesc:
      "Pay with Vodafone Cash, Orange Money or Etisalat Cash via the secure Paymob gateway.",
    payWallet: "Pay by wallet",
    payingWallet: "Preparing payment request...",
    walletEgpNote: "* Wallet payments are charged directly in EGP — no currency conversion.",
    walletSetupNotice:
      "Mobile wallet payment is not enabled yet — it requires the Paymob wallets integration setup. Please choose another payment method for now.",
    walletPhoneLabel: "Wallet phone number",
    walletPhonePh: "01XXXXXXXXX",
    walletPhoneHint: "Enter the phone number linked to your mobile wallet (e.g. 01012345678).",
    walletPhoneInvalid: "Enter a valid 11-digit Egyptian wallet number starting with 01.",
    paypal: "PayPal (card / account)",
    paypalDesc: "Pay securely via PayPal. Amount is converted to USD at payment time.",
    cod: "Cash on delivery",
    codDesc: "Pay in cash when your order arrives (paper items only).",
    codDisabledDigital: "Cash on delivery is not available for digital books — choose PayPal.",
    usdNote: "* PayPal is charged in USD based on the exchange rate at payment time.",
    signInRequired: "Sign-in required",
    signInDesc: "Please sign in first to place and track your order.",
    signIn: "Sign in",
    emptyCart: "Your cart is empty",
    backToStore: "Browse the store",
    success: "Order placed successfully",
    successDesc:
      "Our team will review your order and contact you within 24 hours. You can track its status from your account page.",
    viewOrders: "View my orders",
    types: { book: "Book", course: "Course", app: "App" } as Record<string, string>,
    formats: { paper: "Paper", digital: "Digital PDF" } as Record<string, string>,
    shippingTo: "Shipping to",
    shipping: "Shipping",
    shippingFreePending: "—",
    cityRequiredForPaper: "City is required for paper items",
    addressRequiredForPaper: "Address is required for paper items",
    shippingNoMatch: "We couldn't calculate shipping right now. Please try again.",
    shippingDefault: "No exact match for your city — default shipping rate applied.",
    shippingRetry: "Try again",
    shippingUnresolvedError: "Please wait for the shipping cost to be calculated before placing the order.",
    errors: {
      missing: "Please enter your name and phone",
      generic: "Unable to submit order. Please try again.",
    },
  },
};

export default function CheckoutPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  const [, navigate] = useLocation();

  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { items, count, total, currency, clear, hasPaperItems, hasDigitalItems } = useCart();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "paypal" | "card" | "wallet" | "cash_on_delivery"
  >("paypal");
  const [walletPhone, setWalletPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  // ── Card payments (Paymob) ──────────────────────────────────────────────
  // The card option is always visible. "loading" until the server reports
  // whether the Paymob secrets are configured; "unavailable" keeps the option
  // visible but shows a setup notice and blocks submission.
  const [cardStatus, setCardStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  // Same pattern for mobile wallets (needs the extra wallet integration id).
  const [walletStatus, setWalletStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );

  // Digital books can never be paid via cash on delivery — force PayPal.
  useEffect(() => {
    if (hasDigitalItems && paymentMethod === "cash_on_delivery") {
      setPaymentMethod("paypal");
    }
  }, [hasDigitalItems, paymentMethod]);

  // Ask the server whether Paymob card payments are configured.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/paymob-config", { credentials: "include" });
        const cfg = await res.json().catch(() => ({}));
        if (cancelled) return;
        setCardStatus(res.ok && cfg.cardEnabled ? "ready" : "unavailable");
        setWalletStatus(res.ok && cfg.walletEnabled ? "ready" : "unavailable");
      } catch {
        if (!cancelled) {
          setCardStatus("unavailable");
          setWalletStatus("unavailable");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  type ShippingState = {
    loading: boolean;
    rate: { id: number; city: string; price: string; currency: string; isDefault: boolean } | null;
    matched: boolean;
    queriedCity: string | null;
    error: boolean;
  };
  const [shipping, setShipping] = useState<ShippingState>({
    loading: false,
    rate: null,
    matched: false,
    queriedCity: null,
    error: false,
  });
  const [shippingReloadKey, setShippingReloadKey] = useState(0);

  // Lookup shipping rate when city changes (debounced) and paper items exist.
  useEffect(() => {
    if (!hasPaperItems) {
      setShipping({ loading: false, rate: null, matched: false, queriedCity: null, error: false });
      return;
    }
    const c = city.trim();
    if (!c) {
      setShipping({ loading: false, rate: null, matched: false, queriedCity: null, error: false });
      return;
    }
    let cancelled = false;
    setShipping((s) => ({ ...s, loading: true, error: false }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shipping-rates/lookup?city=${encodeURIComponent(c)}`, {
          credentials: "include",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && body.rate) {
          setShipping({
            loading: false,
            rate: body.rate,
            matched: Boolean(body.matched),
            queriedCity: c,
            error: false,
          });
        } else {
          // Either the request failed or no rate could be resolved at all
          // (e.g. no shipping rates configured). Treat as an error so we never
          // silently show a misleading "0" shipping cost.
          setShipping({ loading: false, rate: null, matched: false, queriedCity: c, error: true });
        }
      } catch {
        if (!cancelled)
          setShipping({ loading: false, rate: null, matched: false, queriedCity: c, error: true });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, hasPaperItems, shippingReloadKey]);

  const shippingPrice = shipping.rate ? Number.parseFloat(shipping.rate.price) || 0 : 0;
  const grandTotal = total + (hasPaperItems ? shippingPrice : 0);
  // Block submission while a paper order's shipping cost is still unknown
  // (loading, errored, or unresolved) so the charged total always matches.
  const shippingUnresolved =
    hasPaperItems && (shipping.loading || shipping.error || !shipping.rate);

  // Tracks fields the user has typed into so async pre-fills (Clerk profile,
  // saved checkout details) never clobber their edits.
  const editedFieldsRef = useRef<Set<string>>(new Set());
  const markEdited = (field: string) => {
    editedFieldsRef.current.add(field);
  };

  // Pre-fill from Clerk user (fallback — only fills fields still empty so it
  // never overwrites saved checkout details or user edits).
  useEffect(() => {
    if (user) {
      const clerkName =
        user.fullName || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "";
      if (clerkName) setFullName((prev) => prev || clerkName);
      const phoneFromClerk = user.primaryPhoneNumber?.phoneNumber || "";
      if (phoneFromClerk) setPhone((prev) => prev || phoneFromClerk);
    }
  }, [user]);

  // Pre-fill from the customer's saved checkout details (last order). Saved
  // values take precedence over the Clerk fallback but never over fields the
  // user has already edited. Notes are intentionally not pre-filled. Setting
  // the city also triggers the debounced shipping-rate lookup above.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/me/checkout-details", {
          credentials: "include",
        });
        if (!res.ok) return;
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const d = body?.details;
        if (!d) return;
        const edited = editedFieldsRef.current;
        if (typeof d.fullName === "string" && d.fullName && !edited.has("fullName")) {
          setFullName(d.fullName);
        }
        if (typeof d.phone === "string" && d.phone && !edited.has("phone")) {
          setPhone(d.phone);
        }
        if (typeof d.city === "string" && d.city && !edited.has("city")) {
          setCity(d.city);
        }
        if (typeof d.address === "string" && d.address && !edited.has("address")) {
          setAddress(d.address);
        }
      } catch {
        // Non-fatal — the customer simply fills the form manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const email = user?.primaryEmailAddress?.emailAddress || "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError(t.errors.missing);
      return;
    }
    if (hasPaperItems && !city.trim()) {
      setError(t.cityRequiredForPaper);
      return;
    }
    if (hasPaperItems && !address.trim()) {
      setError(t.addressRequiredForPaper);
      return;
    }
    if (shippingUnresolved) {
      setError(t.shippingUnresolvedError);
      return;
    }
    if (items.length === 0) return;

    // Card payments require the Paymob secrets to be configured server-side.
    if (paymentMethod === "card" && cardStatus !== "ready") {
      setError(t.cardSetupNotice);
      return;
    }
    // Wallet payments additionally require the wallet integration id.
    if (paymentMethod === "wallet" && walletStatus !== "ready") {
      setError(t.walletSetupNotice);
      return;
    }
    // Wallet payments need a valid Egyptian wallet number (01XXXXXXXXX).
    if (paymentMethod === "wallet") {
      const digits = walletPhone.replace(/[\s\-()]/g, "");
      if (!/^01[0-9]{9}$/.test(digits)) {
        setError(t.walletPhoneInvalid);
        return;
      }
    }

    setSubmitting(true);
    try {
      const isPaypal = paymentMethod === "paypal";
      const returnUrl = isPaypal
        ? `${window.location.origin}${basePath}/checkout/paypal/return`
        : undefined;
      const cancelUrl = isPaypal
        ? `${window.location.origin}${basePath}/checkout/paypal/cancel`
        : undefined;
      const res = await fetch("/api/store/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
          paymentMethod,
          walletPhone:
            paymentMethod === "wallet"
              ? walletPhone.replace(/[\s\-()]/g, "")
              : undefined,
          returnUrl,
          cancelUrl,
          items: items.map((it) => ({
            productType: it.type,
            productId: it.productId,
            quantity: it.quantity,
            format: it.format ?? undefined,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || t.errors.generic);
        return;
      }
      // PayPal: redirect the buyer to approve. Do NOT clear the cart until the
      // capture succeeds (handled on the return page) so a cancel keeps items.
      if (isPaypal && body.approveUrl) {
        window.location.href = body.approveUrl;
        return;
      }
      // Card (Paymob): move to the payment page that embeds the card iframe.
      // Do NOT clear the cart yet — that happens once the payment succeeds.
      if (paymentMethod === "card" && body.id) {
        if (body.checkoutUrl) {
          try {
            sessionStorage.setItem(`paymob-checkout-${body.id}`, String(body.checkoutUrl));
          } catch {
            // sessionStorage unavailable — the pay page fetches a fresh URL.
          }
        }
        navigate(`/checkout/paymob/pay?orderId=${body.id}`);
        return;
      }
      // Wallet (Paymob): move to the wallet payment page which opens the
      // wallet provider's redirect URL. Do NOT clear the cart yet.
      if (paymentMethod === "wallet" && body.id) {
        if (body.redirectUrl) {
          try {
            sessionStorage.setItem(`paymob-wallet-${body.id}`, String(body.redirectUrl));
          } catch {
            // sessionStorage unavailable — the pay page fetches a fresh URL.
          }
        }
        navigate(`/checkout/paymob/wallet?orderId=${body.id}`);
        return;
      }
      // Cash on delivery: order is placed; show success.
      setOrderId(body.id);
      clear();
    } catch {
      setError(t.errors.generic);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render branches ─────────────────────────────────────────────────────

  if (!userLoaded) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <SiteNav mode="page" />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <SiteNav mode="page" />
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-card border border-border p-8 text-center">
            <AlertCircle className="w-10 h-10 text-secondary mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.signInRequired}</h1>
            <p className="text-muted-foreground mb-6">{t.signInDesc}</p>
            <Button
              onClick={() =>
                navigate(`/sign-in?redirect_url=${encodeURIComponent(`${basePath}/checkout`)}`)
              }
              className="rounded-none gap-2"
            >
              {t.signIn}
              <Arrow className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (orderId) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <SiteNav mode="page" />
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="bg-card border border-border p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h1 className="text-2xl font-black text-primary mb-2">{t.success}</h1>
            <p className="text-muted-foreground mb-6">{t.successDesc}</p>
            <div className="text-sm text-muted-foreground mb-6">
              {isAr ? "رقم الطلب" : "Order #"}{" "}
              <span className="font-mono font-bold text-primary">#{orderId}</span>
            </div>
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
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
        <SiteNav mode="page" />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-black text-primary mb-3">{t.emptyCart}</h1>
          <Link href="/services/store">
            <Button className="rounded-none gap-2">
              {t.backToStore}
              <Arrow className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <div className="bg-primary text-primary-foreground py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-7 h-7 text-secondary" />
            <h1 className="text-3xl md:text-4xl font-black">{t.title}</h1>
          </div>
          <p className="text-primary-foreground/70 max-w-2xl">{t.subtitle}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={onSubmit} className="lg:col-span-2 space-y-5">
            <div className="bg-card border border-border p-6">
              <h2 className="text-lg font-black text-primary mb-4">{t.contactInfo}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label={t.fullName} required>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      markEdited("fullName");
                      setFullName(e.target.value);
                    }}
                    placeholder={t.fullNamePh}
                    className={inputClass}
                  />
                </Field>
                <Field label={t.email}>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    dir="ltr"
                    className={`${inputClass} bg-muted/40 cursor-not-allowed`}
                  />
                </Field>
                <Field label={t.phone} required>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      markEdited("phone");
                      setPhone(e.target.value);
                    }}
                    placeholder={t.phonePh}
                    dir="ltr"
                    className={inputClass}
                  />
                </Field>
                <Field label={t.city} required={hasPaperItems}>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                      markEdited("city");
                      setCity(e.target.value);
                    }}
                    required={hasPaperItems}
                    className={inputClass}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label={t.address} required={hasPaperItems}>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        markEdited("address");
                        setAddress(e.target.value);
                      }}
                      placeholder={t.addressPh}
                      required={hasPaperItems}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={t.notes}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.notesPh}
                      rows={4}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="bg-card border border-border p-6">
              <h2 className="text-lg font-black text-primary mb-4">{t.paymentMethod}</h2>
              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 border p-4 cursor-pointer transition-colors ${
                    paymentMethod === "card"
                      ? "border-secondary bg-secondary/5"
                      : "border-border hover:border-secondary/50"
                  }`}
                  data-testid="option-payment-card"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mt-1 accent-secondary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-primary flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-secondary" />
                      {t.card}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.cardDesc}</div>
                  </div>
                </label>

                {paymentMethod === "card" && cardStatus === "unavailable" && (
                  <div
                    className="flex items-start gap-2 border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2.5"
                    data-testid="notice-card-setup"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t.cardSetupNotice}</span>
                  </div>
                )}

                <label
                  className={`flex items-start gap-3 border p-4 cursor-pointer transition-colors ${
                    paymentMethod === "wallet"
                      ? "border-secondary bg-secondary/5"
                      : "border-border hover:border-secondary/50"
                  }`}
                  data-testid="option-payment-wallet"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === "wallet"}
                    onChange={() => setPaymentMethod("wallet")}
                    className="mt-1 accent-secondary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-primary flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-secondary" />
                      {t.wallet}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.walletDesc}</div>
                  </div>
                </label>

                {paymentMethod === "wallet" && walletStatus === "unavailable" && (
                  <div
                    className="flex items-start gap-2 border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2.5"
                    data-testid="notice-wallet-setup"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t.walletSetupNotice}</span>
                  </div>
                )}

                {paymentMethod === "wallet" && walletStatus === "ready" && (
                  <div className="border border-border bg-muted/30 p-4 space-y-2">
                    <label
                      className="block text-sm font-bold text-primary"
                      htmlFor="wallet-phone"
                    >
                      {t.walletPhoneLabel}
                    </label>
                    <input
                      id="wallet-phone"
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder={t.walletPhonePh}
                      className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-secondary"
                      data-testid="input-wallet-phone"
                    />
                    <p className="text-[11px] text-muted-foreground">{t.walletPhoneHint}</p>
                  </div>
                )}

                <label
                  className={`flex items-start gap-3 border p-4 cursor-pointer transition-colors ${
                    paymentMethod === "paypal"
                      ? "border-secondary bg-secondary/5"
                      : "border-border hover:border-secondary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === "paypal"}
                    onChange={() => setPaymentMethod("paypal")}
                    className="mt-1 accent-secondary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-primary">{t.paypal}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.paypalDesc}</div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 border p-4 transition-colors ${
                    hasDigitalItems
                      ? "border-border opacity-50 cursor-not-allowed"
                      : paymentMethod === "cash_on_delivery"
                        ? "border-secondary bg-secondary/5 cursor-pointer"
                        : "border-border hover:border-secondary/50 cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={paymentMethod === "cash_on_delivery"}
                    onChange={() => setPaymentMethod("cash_on_delivery")}
                    disabled={hasDigitalItems}
                    className="mt-1 accent-secondary"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-primary">{t.cod}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.codDesc}</div>
                  </div>
                </label>

                {hasDigitalItems && (
                  <p className="text-[11px] text-muted-foreground">{t.codDisabledDigital}</p>
                )}
                {paymentMethod === "paypal" && (
                  <p className="text-[11px] text-muted-foreground">{t.usdNote}</p>
                )}
                {paymentMethod === "card" && (
                  <p className="text-[11px] text-muted-foreground">{t.cardEgpNote}</p>
                )}
                {paymentMethod === "wallet" && (
                  <p className="text-[11px] text-muted-foreground">{t.walletEgpNote}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Link href="/cart">
                <Button type="button" variant="outline" className="rounded-none gap-2">
                  <Arrow className="w-4 h-4 rotate-180" />
                  {t.backToCart}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  shippingUnresolved ||
                  (paymentMethod === "card" && cardStatus !== "ready") ||
                  (paymentMethod === "wallet" && walletStatus !== "ready")
                }
                className="rounded-none gap-2 h-11 px-6"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting
                  ? paymentMethod === "paypal"
                    ? t.redirecting
                    : paymentMethod === "card"
                      ? t.payingCard
                      : paymentMethod === "wallet"
                        ? t.payingWallet
                        : t.placing
                  : paymentMethod === "card"
                    ? t.payCard
                    : paymentMethod === "wallet"
                      ? t.payWallet
                      : t.place}
              </Button>
            </div>
          </form>

          {/* Summary */}
          <aside className="lg:col-span-1">
            <div className="bg-card border border-border p-6 sticky top-24">
              <h2 className="text-lg font-black text-primary mb-4">{t.summary}</h2>
              <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                {items.map((it) => (
                  <li
                    key={`${it.type}-${it.productId}-${it.format ?? "x"}`}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-12 h-12 shrink-0 bg-muted/40 border border-border overflow-hidden">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-sm font-bold">
                          {it.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-secondary uppercase flex items-center gap-1.5 flex-wrap">
                        <span>{t.types[it.type]}</span>
                        {it.format && (
                          <span className="px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20 normal-case">
                            {t.formats[it.format]}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-primary line-clamp-2 leading-snug">
                        {it.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {it.quantity} × {it.price.toFixed(2)} {it.currency}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary shrink-0">
                      {(it.price * it.quantity).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>{t.items}</span>
                  <span className="font-bold text-primary">{count}</span>
                </div>
                {hasPaperItems && (
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>
                      {t.shipping}
                      {shipping.queriedCity ? ` • ${shipping.queriedCity}` : ""}
                    </span>
                    <span className="font-bold text-primary">
                      {shipping.loading
                        ? "…"
                        : shipping.rate
                          ? `${shippingPrice.toFixed(2)} ${shipping.rate.currency}`
                          : t.shippingFreePending}
                    </span>
                  </div>
                )}
                {hasPaperItems && shipping.error && !shipping.loading && (
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-destructive">{t.shippingNoMatch}</p>
                    <button
                      type="button"
                      onClick={() => setShippingReloadKey((k) => k + 1)}
                      className="text-[11px] font-bold text-secondary hover:underline shrink-0"
                    >
                      {t.shippingRetry}
                    </button>
                  </div>
                )}
                {hasPaperItems &&
                  shipping.queriedCity &&
                  !shipping.loading &&
                  !shipping.error &&
                  shipping.rate &&
                  !shipping.matched && (
                    <p className="text-[11px] text-muted-foreground mb-2">{t.shippingDefault}</p>
                  )}
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-primary">{t.total}</span>
                  <span className="text-2xl font-black text-secondary">
                    {grandTotal.toFixed(2)}{" "}
                    <span className="text-sm font-bold text-primary">{currency}</span>
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full border border-border bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-primary mb-1.5">
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </label>
      {children}
    </div>
  );
}
