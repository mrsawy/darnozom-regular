import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useSession } from "@/lib/auth-client";
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
import { useCart, useStandaloneCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";
import {
  fetchAvailablePaymentMethods,
  fetchManualPaymentMethods,
  getStoreRegionId,
  type StorePaymentMethod,
} from "@/lib/medusa-client";
import EditionBadge from "@/components/store/edition-badge";
import { codAvailability, type CodAvailability } from "@/lib/checkout-methods";
import {
  type ManualPaymentCode,
  unconfiguredManualMethods,
  withoutUnconfiguredManualMethods,
} from "@/lib/manual-payments";

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
    paypalSetupNotice:
      "الدفع عبر PayPal غير مفعّل بعد — يتطلب إعداد حساب PayPal. اختر طريقة دفع أخرى حالياً.",
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
    vodafoneCash: "فودافون كاش",
    vodafoneCashDesc: "حوّل المبلغ إلى رقم فودافون كاش وأرسل صورة الإيصال على واتساب.",
    instapay: "إنستاباي",
    instapayDesc: "ادفع عبر إنستاباي وأرسل رمز التأكيد على واتساب.",
    placeManual: "تأكيد الطلب وعرض بيانات الدفع",
    manualNote: "* سيتم تفعيل الطلب بعد تأكيد الدفع يدوياً.",
    manualNotSetUp: "غير متاح حالياً — لم تُضبط بيانات الدفع بعد.",
    codDisabledDigital:
      "غير متاح لهذا الطلب لأنه يحتوي على كتاب رقمي. الدفع عند الاستلام متاح للنسخ الورقية فقط، لأن المبلغ يُحصَّل عند تسليم الشحنة، بينما تُسلَّم النسخ الرقمية إلكترونياً. لاستخدامه، اطلب النسخ الورقية في طلب منفصل.",
    usdNote: "* يُحصّل الدفع عبر PayPal بالدولار الأمريكي حسب سعر الصرف وقت الدفع.",
    signInOptional: "لديك حساب؟",
    signInLink: "سجّل الدخول",
    signInOptionalHint: "لتتبع الطلبات من حسابك وحفظ بياناتك للمرة القادمة.",
    digitalNeedsAccount: "الكتب الرقمية تُضاف إلى مكتبتك في حسابك، لذا يلزم تسجيل الدخول أو إنشاء حساب لإتمام الطلب.",
    signInOrSignUp: "تسجيل الدخول / إنشاء حساب",
    guestCheckout: "إتمام الشراء كزائر",
    emailRequired: "البريد الإلكتروني مطلوب",
    emailInvalid: "أدخل بريداً إلكترونياً صالحاً",
    emptyCart: "السلة فارغة",
    backToStore: "تصفح المتجر",
    success: "تم إنشاء الطلب بنجاح",
    successDesc:
      "سيقوم فريقنا بمراجعة الطلب والتواصل معك خلال 24 ساعة. إن كان لديك حساب، يمكنك تتبع الطلب من صفحة حسابك.",
    viewOrders: "عرض طلباتي",
    types: { book: "كتاب", course: "دورة", app: "تطبيق" } as Record<string, string>,
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
    paypalSetupNotice:
      "PayPal is not enabled yet — it requires a PayPal account setup. Please choose another payment method for now.",
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
    vodafoneCash: "Vodafone Cash",
    vodafoneCashDesc: "Transfer to our Vodafone Cash number and send the receipt screenshot on WhatsApp.",
    instapay: "InstaPay",
    instapayDesc: "Pay via InstaPay and send the confirmation code on WhatsApp.",
    placeManual: "Place order & view payment details",
    manualNote: "* Your order is activated once we verify the payment.",
    manualNotSetUp: "Not available yet — payment details have not been set up.",
    codDisabledDigital:
      "Not available for this order because it includes a digital book. Cash on delivery is for paper books only — the cash is collected when the parcel is delivered, and digital books are delivered online. To pay cash, order the paper books separately.",
    usdNote: "* PayPal is charged in USD based on the exchange rate at payment time.",
    signInOptional: "Have an account?",
    signInLink: "Sign in",
    signInOptionalHint: "Track orders from your account and save your details for next time.",
    digitalNeedsAccount: "Digital books are delivered to the library in your account, so please sign in or create an account to place this order.",
    signInOrSignUp: "Sign in / Create account",
    guestCheckout: "Continue as guest",
    emailRequired: "Email is required",
    emailInvalid: "Enter a valid email address",
    emptyCart: "Your cart is empty",
    backToStore: "Browse the store",
    success: "Order placed successfully",
    successDesc:
      "Our team will review your order and contact you within 24 hours. If you have an account, you can track it from your account page.",
    viewOrders: "View my orders",
    types: { book: "Book", course: "Course", app: "App" } as Record<string, string>,
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

  const { data: session, isPending } = useSession();
  const user = session?.user;
  const userLoaded = !isPending;
  const isSignedIn = !!user;
  // "Buy now" links here with ?buyNowCart=<id> pointing at a standalone,
  // single-item Medusa cart (see createBuyNowCart) instead of the shopper's
  // persisted one, so checkout only ever submits that one item. Both hooks
  // are called unconditionally (rules of hooks); useStandaloneCart is inert
  // when there's no buyNowCart param.
  const buyNowCartId = new URLSearchParams(useSearch()).get("buyNowCart");
  const mainCart = useCart();
  const standaloneCart = useStandaloneCart(buyNowCartId);
  const { items, count, total, currency, clear, hasPaperItems, hasDigitalItems } =
    buyNowCartId ? standaloneCart : mainCart;
  // Digital books go to the account library — the server rejects guest
  // digital orders, so ask for sign-in up front.
  const needsAccount = userLoaded && !isSignedIn && hasDigitalItems;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<StorePaymentMethod>("paypal");
  const [allowedMethods, setAllowedMethods] = useState<StorePaymentMethod[] | null>(null);
  // Enabled on the region but missing payment details: shown disabled.
  const [notSetUpMethods, setNotSetUpMethods] = useState<ManualPaymentCode[]>([]);
  // COD is paper-only: with a digital book in the cart it is shown disabled.
  const [cod, setCod] = useState<CodAvailability>("not_offered");
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

  // Digital books can never be paid via cash on delivery — force another method.
  useEffect(() => {
    if (hasDigitalItems && paymentMethod === "cash_on_delivery") {
      const fallback =
        (allowedMethods ?? []).find((m) => m !== "cash_on_delivery") ?? "paypal";
      setPaymentMethod(fallback);
    }
  }, [hasDigitalItems, paymentMethod, allowedMethods]);

  // PayPal needs REST credentials on the server; same pattern as card/wallet.
  const [paypalStatus, setPaypalStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/api/store/paypal-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((cfg: { cardEnabled?: boolean }) => {
        if (!cancelled) setPaypalStatus(cfg.cardEnabled ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setPaypalStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Payment methods come from Medusa (region / cart), not a hard-coded list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolvedRegionId = await getStoreRegionId();
        const regionMethods = await fetchAvailablePaymentMethods(resolvedRegionId);
        // Vodafone Cash / InstaPay are selectable only when their payment
        // details are set; otherwise they're listed disabled. If the details
        // can't be loaded, treat them as not set up.
        const manualDetails = await fetchManualPaymentMethods().catch(() => []);
        const methods = withoutUnconfiguredManualMethods(regionMethods, manualDetails);
        if (cancelled) return;
        setNotSetUpMethods(unconfiguredManualMethods(regionMethods, manualDetails));
        setCod(codAvailability(methods, hasDigitalItems));
        const next = hasDigitalItems
          ? methods.filter((m) => m !== "cash_on_delivery")
          : methods;
        setAllowedMethods(next);
        if (next.length > 0) {
          setPaymentMethod((current) => (next.includes(current) ? current : next[0]));
        }
      } catch {
        if (!cancelled) setAllowedMethods([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasDigitalItems]);

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

  // Tracks fields the user has typed into so async pre-fills (account,
  // saved checkout details) never clobber their edits.
  const editedFieldsRef = useRef<Set<string>>(new Set());
  const markEdited = (field: string) => {
    editedFieldsRef.current.add(field);
  };

  // Pre-fill from the signed-in account (fallback — only fills fields still
  // empty so it never overwrites saved checkout details or user edits).
  useEffect(() => {
    if (user?.name) {
      setFullName((prev) => prev || user.name);
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Pre-fill from the customer's saved checkout details (last order). Saved
  // values take precedence over the account fallback but never over fields the
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError(t.errors.missing);
      return;
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setError(t.emailRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError(t.emailInvalid);
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

    if (paymentMethod === "paypal" && paypalStatus !== "ready") {
      setError(t.paypalSetupNotice);
      return;
    }
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

      // ── Hybrid submission: Medusa cart data → Express order endpoint ──
      // The Express POST /api/store/orders endpoint expects legacy numeric
      // product IDs. We read legacyProductId from the Medusa product
      // metadata (stamped by the Task 4 migration script).
      const res = await fetch("/api/store/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: emailTrimmed,
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
            productId: it.legacyProductId ?? it.productId,
            quantity: it.quantity,
            format: it.format ?? undefined,
            // The exact Medusa variant in the cart — lets the server tell
            // apart multiple editions of the same format (e.g. two paper
            // editions). See orders/index.ts's lookupBookProduct.
            variantId: it.variantId ?? undefined,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || t.errors.generic);
        return;
      }
      // Stash email for guest payment continuation (PayPal capture / Paymob).
      try {
        sessionStorage.setItem(`order-email-${body.id}`, emailTrimmed);
      } catch {
        // ignore
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
      // Manual transfer: the order is placed; payment happens out-of-band.
      if ((paymentMethod === "vodafone_cash" || paymentMethod === "instapay") && body.id) {
        clear();
        navigate(`/checkout/manual?orderId=${body.id}`);
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
              {isSignedIn ? (
                <Link href="/account?tab=orders">
                  <Button className="rounded-none gap-2">
                    {t.viewOrders}
                    <Arrow className="w-4 h-4" />
                  </Button>
                </Link>
              ) : null}
              <Link href="/services/store">
                <Button variant={isSignedIn ? "outline" : "default"} className="rounded-none">
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-black text-primary">{t.contactInfo}</h2>
                {!isSignedIn ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/sign-in?redirect_url=${encodeURIComponent(`${basePath}/checkout`)}`,
                      )
                    }
                    className="text-sm text-secondary hover:underline"
                  >
                    {t.signInOptional} {t.signInLink}
                  </button>
                ) : null}
              </div>
              {needsAccount ? (
                <div
                  className="border border-amber-500/40 bg-amber-500/10 p-3 mb-4 space-y-2"
                  data-testid="digital-needs-account"
                >
                  <p className="text-sm">{t.digitalNeedsAccount}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-none"
                    onClick={() =>
                      navigate(`/sign-in?redirect_url=${encodeURIComponent(`${basePath}/checkout`)}`)
                    }
                  >
                    {t.signInOrSignUp}
                  </Button>
                </div>
              ) : !isSignedIn ? (
                <p className="text-xs text-muted-foreground mb-4">{t.signInOptionalHint}</p>
              ) : null}
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
                <Field label={t.email} required>
                  <input
                    type="email"
                    required
                    value={email}
                    readOnly={isSignedIn}
                    onChange={(e) => {
                      if (isSignedIn) return;
                      markEdited("email");
                      setEmail(e.target.value);
                    }}
                    dir="ltr"
                    className={`${inputClass}${isSignedIn ? " bg-muted/40 cursor-not-allowed" : ""}`}
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
                {allowedMethods === null && (
                  <p className="text-sm text-muted-foreground">
                    {isAr ? "جارٍ تحميل طرق الدفع..." : "Loading payment methods..."}
                  </p>
                )}
                {allowedMethods?.length === 0 && notSetUpMethods.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {isAr
                      ? "لا توجد طرق دفع مفعّلة لهذه المنطقة في لوحة التجارة."
                      : "No payment methods are enabled for this region in Medusa."}
                  </p>
                )}
                {allowedMethods?.includes("card") && (
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
                )}

                {paymentMethod === "card" && cardStatus === "unavailable" && (
                  <div
                    className="flex items-start gap-2 border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2.5"
                    data-testid="notice-card-setup"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t.cardSetupNotice}</span>
                  </div>
                )}

                {allowedMethods?.includes("wallet") && (
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
                )}

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

                {allowedMethods?.includes("paypal") && (
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
                )}
                {paymentMethod === "paypal" && paypalStatus === "unavailable" && (
                  <div
                    className="flex items-start gap-2 border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2.5"
                    data-testid="notice-paypal-setup"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t.paypalSetupNotice}</span>
                  </div>
                )}

                {cod !== "not_offered" && (
                <label
                  data-testid="option-payment-cod"
                  className={`flex items-start gap-3 border p-4 transition-colors ${
                    cod === "blocked_digital"
                      ? "border-border bg-muted/30 cursor-not-allowed"
                      : paymentMethod === "cash_on_delivery"
                        ? "border-secondary bg-secondary/5 cursor-pointer"
                        : "border-border hover:border-secondary/50 cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={cod === "available" && paymentMethod === "cash_on_delivery"}
                    onChange={() => setPaymentMethod("cash_on_delivery")}
                    disabled={cod === "blocked_digital"}
                    className={`mt-1 accent-secondary ${cod === "blocked_digital" ? "opacity-50" : ""}`}
                  />
                  <div className="flex-1">
                    <div className={cod === "blocked_digital" ? "opacity-50" : undefined}>
                      <div className="font-bold text-primary">{t.cod}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.codDesc}</div>
                    </div>
                    {cod === "blocked_digital" && (
                      <div
                        role="note"
                        className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-2"
                      >
                        {t.codDisabledDigital}
                      </div>
                    )}
                  </div>
                </label>
                )}

                {(["vodafone_cash", "instapay"] as const)
                  .filter((m) => allowedMethods?.includes(m) || notSetUpMethods.includes(m))
                  .map((m) => {
                    const notSetUp = !allowedMethods?.includes(m);
                    return (
                    <label
                      key={m}
                      data-testid={`option-payment-${m}`}
                      className={`flex items-start gap-3 border p-4 transition-colors ${
                        notSetUp
                          ? "border-border opacity-50 cursor-not-allowed"
                          : paymentMethod === m
                            ? "border-secondary bg-secondary/5 cursor-pointer"
                            : "border-border hover:border-secondary/50 cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m}
                        checked={!notSetUp && paymentMethod === m}
                        onChange={() => setPaymentMethod(m)}
                        disabled={notSetUp}
                        className="mt-1 accent-secondary"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-primary">
                          {m === "vodafone_cash" ? t.vodafoneCash : t.instapay}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {notSetUp
                            ? t.manualNotSetUp
                            : m === "vodafone_cash"
                              ? t.vodafoneCashDesc
                              : t.instapayDesc}
                        </div>
                      </div>
                    </label>
                    );
                  })}

                {paymentMethod === "paypal" && (
                  <p className="text-[11px] text-muted-foreground">{t.usdNote}</p>
                )}
                {paymentMethod === "card" && (
                  <p className="text-[11px] text-muted-foreground">{t.cardEgpNote}</p>
                )}
                {paymentMethod === "wallet" && (
                  <p className="text-[11px] text-muted-foreground">{t.walletEgpNote}</p>
                )}
                {(paymentMethod === "vodafone_cash" || paymentMethod === "instapay") && (
                  <p className="text-[11px] text-muted-foreground">{t.manualNote}</p>
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
                  needsAccount ||
                  shippingUnresolved ||
                  !allowedMethods?.includes(paymentMethod) ||
                  (paymentMethod === "paypal" && paypalStatus !== "ready") ||
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
                      : paymentMethod === "vodafone_cash" || paymentMethod === "instapay"
                        ? t.placeManual
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
                    key={it.lineItemId}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-12 h-12 shrink-0 bg-muted/40 border border-border overflow-hidden">
                      {it.thumbnail ? (
                        <img src={it.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-sm font-bold">
                          {it.title.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-secondary uppercase">{t.types[it.type]}</div>
                      <div className="font-bold text-primary line-clamp-2 leading-snug">
                        {it.title}
                      </div>
                      <div className="mt-1">
                        <EditionBadge format={it.format} lang={isAr ? "ar" : "en"} hint={false} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {it.quantity} × {it.unitPrice.toFixed(2)} {currency}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary shrink-0">
                      {(it.unitPrice * it.quantity).toFixed(2)}
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
