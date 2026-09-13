import { useEffect, useMemo } from "react";
import { Redirect, Link } from "wouter";
import { useSession } from "@/lib/auth-client";
import { ProfileDialog } from "@/components/profile-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ShoppingBag,
  GraduationCap,
  FileText,
  UserCircle2,
  Calendar,
  Pencil,
  Package,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Download,
  Truck,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language-context";
import { useAdminStatus } from "@/lib/use-admin-status";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const COPY = {
  ar: {
    title: "حسابي",
    subtitle: "تابع طلباتك وتسجيلاتك من مكان واحد.",
    profileHeading: "بياناتي",
    name: "الاسم",
    email: "البريد الإلكتروني",
    editProfile: "تعديل البروفايل",
    academyHeading: "تسجيلاتي في الأكاديمية",
    serviceRequestsHeading: "طلبات الخدمات",
    empty: "لا توجد بيانات حتى الآن.",
    loading: "جارٍ التحميل...",
    date: "التاريخ",
    organization: "المؤسسة",
    serviceRequest: "تسجيل خدمة",
    rfp: "طلب خدمة (RFP)",
    book: "كتاب",
    course: "دورة",
    app: "تطبيق",
    diploma: "دبلوم",
    program: "برنامج",
    level: "مستوى",
    exec: "برنامج تنفيذي",
    path: "مسار",
    general: "تقديم عام",
    statusNew: "جديد",
    statusContacted: "تم التواصل",
    statusCompleted: "مكتمل",
    statusCancelled: "ملغي",
    statusPending: "قيد الانتظار",
    statusConfirmed: "مؤكد",
    statusProcessing: "قيد التنفيذ",
    notSet: "—",
    backHome: "الصفحة الرئيسية",
    ordersHeading: "طلباتي",
    orderNumber: "رقم الطلب",
    orderItemsCount: "عدد العناصر",
    orderTotal: "الإجمالي",
    viewOrderDetails: "عرض التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    noOrders: "لا توجد طلبات بعد. ابدأ بالتسوق من المتجر.",
    browseStore: "تصفح المتجر",
    formatPaper: "ورقي",
    formatDigital: "رقمي PDF",
    readOnline: "قراءة أونلاين",
    downloadPdf: "تحميل PDF",
    digitalUnavailable: "الملف غير متاح حالياً. تواصل مع الدعم.",
    digitalCancelled: "تم إلغاء الطلب — لا يمكن الوصول للملف.",
    shippingLine: "الشحن",
    subtotalLine: "إجمالي العناصر",
    paymentLabel: "طريقة الدفع",
    methodPaypal: "PayPal",
    methodCard: "بطاقة ائتمان / مدى",
    methodWallet: "محفظة إلكترونية",
    methodCod: "الدفع عند الاستلام",
    payUnpaid: "غير مدفوع",
    payPending: "بانتظار الدفع",
    payPaid: "مدفوع",
    payFailed: "فشل الدفع",
    digitalUnpaid: "أكمل الدفع لفتح الكتاب الرقمي.",
    paymentRecovered:
      "تم تأكيد دفعتك تلقائياً بعد انقطاع الاتصال أثناء الدفع — طلبك مدفوع ومؤكد.",
    paymentFailedNote:
      "فشل تحصيل الدفع — تم إرجاع المبلغ إليك تلقائياً إن كان قد تم خصمه. يمكنك إلغاء هذا الطلب وإنشاء طلب جديد.",
    paymentDeclinedRetryNote:
      "تم رفض عملية الدفع ولم يتم خصم أي مبلغ. يمكنك إعادة محاولة الدفع أو إلغاء الطلب.",
    declineReason: "سبب الرفض",
    retryPayment: "إعادة محاولة الدفع",
    cancelOrder: "إلغاء الطلب",
    cancelling: "جارٍ الإلغاء...",
    cancelConfirm: "هل أنت متأكد من إلغاء هذا الطلب؟",
    cancelFailed: "تعذّر إلغاء الطلب. حدّث الصفحة وحاول مرة أخرى.",
  },
  en: {
    title: "My Account",
    subtitle: "Track your purchases and registrations in one place.",
    profileHeading: "My Profile",
    name: "Name",
    email: "Email",
    editProfile: "Edit Profile",
    academyHeading: "My Academy Registrations",
    serviceRequestsHeading: "Service Requests",
    empty: "Nothing here yet.",
    loading: "Loading...",
    date: "Date",
    organization: "Organization",
    serviceRequest: "Service Registration",
    rfp: "RFP",
    book: "Book",
    course: "Course",
    app: "App",
    diploma: "Diploma",
    program: "Program",
    level: "Level",
    exec: "Executive Program",
    path: "Career Path",
    general: "General",
    statusNew: "New",
    statusContacted: "Contacted",
    statusCompleted: "Completed",
    statusCancelled: "Cancelled",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusProcessing: "Processing",
    notSet: "—",
    backHome: "Home",
    ordersHeading: "My Orders",
    orderNumber: "Order #",
    orderItemsCount: "Items",
    orderTotal: "Total",
    viewOrderDetails: "View details",
    hideDetails: "Hide details",
    noOrders: "No orders yet. Start shopping in the store.",
    browseStore: "Browse the store",
    formatPaper: "Paper",
    formatDigital: "Digital PDF",
    readOnline: "Read online",
    downloadPdf: "Download PDF",
    digitalUnavailable: "File not available. Please contact support.",
    digitalCancelled: "Order cancelled — file access denied.",
    shippingLine: "Shipping",
    subtotalLine: "Items subtotal",
    paymentLabel: "Payment method",
    methodPaypal: "PayPal",
    methodCard: "Credit / Debit card",
    methodWallet: "Mobile wallet",
    methodCod: "Cash on delivery",
    payUnpaid: "Unpaid",
    payPending: "Awaiting payment",
    payPaid: "Paid",
    payFailed: "Payment failed",
    digitalUnpaid: "Complete payment to unlock the digital book.",
    paymentRecovered:
      "Your payment was confirmed automatically after the connection was interrupted during checkout — this order is paid and confirmed.",
    paymentFailedNote:
      "Payment collection failed — any charged amount was refunded to you automatically. You can cancel this order and place a new one.",
    paymentDeclinedRetryNote:
      "The payment was declined and nothing was charged. You can retry the payment or cancel the order.",
    declineReason: "Decline reason",
    retryPayment: "Retry payment",
    cancelOrder: "Cancel order",
    cancelling: "Cancelling...",
    cancelConfirm: "Are you sure you want to cancel this order?",
    cancelFailed: "Could not cancel the order. Refresh and try again.",
  },
} as const;

type Lang = "ar" | "en";

interface AcademyApplicationRow {
  id: number;
  applyType: string;
  contextLabelAr: string | null;
  contextLabelEn: string | null;
  organization: string | null;
  country: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}
interface AcademyRegistrationRow {
  id: number;
  courseId: number;
  courseTitleAr: string | null;
  courseTitleEn: string | null;
  organization: string | null;
  registeredAt: string;
}
interface OrderItemRow {
  id: number;
  orderId: number;
  productType: "book" | "course" | "app";
  productId: number;
  productTitle: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  currency: string;
  format: "paper" | "digital" | null;
  digitalFileUrlSnapshot: string | null;
  createdAt: string;
}
interface OrderRow {
  id: number;
  status: string;
  userId: string;
  userEmail: string;
  fullName: string;
  phone: string;
  address: string | null;
  city: string | null;
  notes: string | null;
  totalAmount: string;
  shippingTotal: string | null;
  shippingCity: string | null;
  currency: string;
  itemsCount: number;
  paymentMethod: "paypal" | "card" | "wallet" | "cash_on_delivery" | null;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | null;
  paymentFailureReason: string | null;
  paymentRecoveredAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRow[];
}
interface ServiceRequestRow {
  id: number;
  submissionType: string;
  organization: string;
  servicesOfInterest: string[];
  projectDescription: string;
  desiredStartDate: string | null;
  estimatedBudget: string | null;
  projectDuration: string | null;
  status: string;
  country: string | null;
  createdAt: string;
}

function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

// Failure reasons are stored like "PAYMOB_DECLINED: Do not honour (code 05)".
// Strip the machine prefix for display; hide purely internal machine codes.
const HIDDEN_FAILURE_CODES = new Set([
  "expired",
  "cancelled_by_customer",
  "superseded_by_new_order",
]);
function formatDeclineReason(reason: string | null | undefined): string | null {
  if (!reason || typeof reason !== "string") return null;
  if (HIDDEN_FAILURE_CODES.has(reason)) return null;
  const cleaned = reason.replace(/^PAYMOB_DECLINED:?\s*/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function StatusPill({ status, lang }: { status: string; lang: Lang }) {
  const t = COPY[lang];
  const map: Record<string, { label: string; color: string }> = {
    new: { label: t.statusNew, color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
    contacted: { label: t.statusContacted, color: "bg-secondary/15 text-secondary border-secondary/30" },
    completed: { label: t.statusCompleted, color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
    cancelled: { label: t.statusCancelled, color: "bg-red-500/15 text-red-700 border-red-500/30" },
    pending: { label: t.statusPending, color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
    confirmed: { label: t.statusConfirmed, color: "bg-secondary/15 text-secondary border-secondary/30" },
    processing: { label: t.statusProcessing, color: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30" },
  };
  const m = map[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold border ${m.color}`}>
      {m.label}
    </span>
  );
}

function PaymentPill({
  status,
  t,
}: {
  status: "unpaid" | "pending" | "paid" | "failed";
  t: (typeof COPY)[Lang];
}) {
  const map: Record<string, { label: string; color: string }> = {
    unpaid: { label: t.payUnpaid, color: "bg-muted text-muted-foreground border-border" },
    pending: { label: t.payPending, color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
    paid: { label: t.payPaid, color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
    failed: { label: t.payFailed, color: "bg-red-500/15 text-red-700 border-red-500/30" },
  };
  const m = map[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold border ${m.color}`}>
      {m.label}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  heading,
  children,
}: {
  icon: typeof ShoppingBag;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-secondary/20 shadow-[0_12px_40px_rgba(15,61,46,0.06)]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-secondary/15 bg-secondary/[0.04]">
        <div className="w-9 h-9 bg-secondary flex items-center justify-center text-primary">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-black text-primary">{heading}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function OrderRowItem({
  order,
  lang,
  t,
  productLabel,
}: {
  order: OrderRow;
  lang: Lang;
  t: (typeof COPY)[Lang];
  productLabel: (type: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/account/me/orders/${order.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("cancel failed");
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["account-orders"] });
    },
  });
  const itemCount =
    order.itemsCount ||
    order.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const totalNum = Number.parseFloat(order.totalAmount || "0") || 0;
  // A customer may clear their own order while it's still awaiting payment /
  // fulfillment start and not paid (mirrors the server-side rule).
  const canCancel = order.status === "pending" && order.paymentStatus !== "paid";
  // A declined card/wallet order can be retried — the pay pages ask the server
  // for a fresh payment URL, which reopens the failed order (failed → pending).
  // Cancelled and superseded orders must never offer retry (server rejects too).
  const canRetryPayment =
    order.paymentStatus === "failed" &&
    order.status !== "cancelled" &&
    order.paymentFailureReason !== "superseded_by_new_order" &&
    (order.paymentMethod === "card" || order.paymentMethod === "wallet");
  const retryHref =
    order.paymentMethod === "card"
      ? `/checkout/paymob/pay?orderId=${order.id}`
      : order.paymentMethod === "wallet"
        ? `/checkout/paymob/wallet?orderId=${order.id}`
        : null;
  const declineReasonText =
    order.paymentStatus === "failed" && order.status !== "cancelled"
      ? formatDeclineReason(order.paymentFailureReason)
      : null;
  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-primary">{t.orderNumber}{order.id}</span>
            <StatusPill status={order.status} lang={lang} />
          </div>
          <div className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(order.createdAt, lang)}
            </span>
            <span>•</span>
            <span>{t.orderItemsCount}: {itemCount}</span>
            {order.paymentMethod && (
              <>
                <span>•</span>
                <span>
                  {t.paymentLabel}:{" "}
                  {order.paymentMethod === "paypal"
                    ? t.methodPaypal
                    : order.paymentMethod === "card"
                      ? t.methodCard
                      : order.paymentMethod === "wallet"
                        ? t.methodWallet
                        : t.methodCod}
                </span>
              </>
            )}
            {order.paymentStatus && (
              <PaymentPill status={order.paymentStatus} t={t} />
            )}
          </div>
          {order.paymentRecoveredAt && order.paymentStatus === "paid" && (
            <p
              className="mt-2 inline-flex items-start gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1"
              data-testid={`note-payment-recovered-${order.id}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{t.paymentRecovered}</span>
            </p>
          )}
          {order.paymentStatus === "failed" && order.status !== "cancelled" && (
            <div className="mt-2 space-y-1.5">
              <p
                className="inline-flex items-start gap-1.5 text-xs font-bold text-red-700 bg-red-500/10 border border-red-500/25 px-2 py-1"
                data-testid={`note-payment-failed-${order.id}`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{canRetryPayment ? t.paymentDeclinedRetryNote : t.paymentFailedNote}</span>
              </p>
              {declineReasonText && (
                <p
                  className="text-xs text-red-700"
                  data-testid={`text-decline-reason-${order.id}`}
                >
                  <span className="font-bold">{t.declineReason}:</span>{" "}
                  {declineReasonText}
                </p>
              )}
              {canRetryPayment && retryHref && (
                <div>
                  <Link
                    href={retryHref}
                    onClick={() => {
                      // Drop any stale payment URL so the pay page asks the
                      // server for a fresh one (which reopens the failed order).
                      try {
                        sessionStorage.removeItem(`paymob-checkout-${order.id}`);
                        sessionStorage.removeItem(`paymob-wallet-${order.id}`);
                      } catch {
                        // ignore
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid={`btn-retry-payment-${order.id}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t.retryPayment}
                  </Link>
                </div>
              )}
            </div>
          )}
          {canCancel && (
            <div className="mt-2">
              <button
                onClick={() => {
                  if (window.confirm(t.cancelConfirm)) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold border border-red-500/40 text-red-700 hover:bg-red-500/10 disabled:opacity-50"
                data-testid={`btn-cancel-order-${order.id}`}
              >
                <XCircle className="w-3.5 h-3.5" />
                {cancelMutation.isPending ? t.cancelling : t.cancelOrder}
              </button>
              {cancelMutation.isError && (
                <p className="mt-1 text-xs text-red-600 font-bold">{t.cancelFailed}</p>
              )}
            </div>
          )}
        </div>
        <div className="text-end">
          <div className="text-xs text-muted-foreground">{t.orderTotal}</div>
          <div className="text-base font-black text-primary">
            {totalNum.toFixed(2)} <span className="text-xs font-bold text-muted-foreground">{order.currency}</span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            data-testid={`btn-toggle-order-${order.id}`}
          >
            {open ? (
              <>
                {t.hideDetails} <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                {t.viewOrderDetails} <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
          <ul className="space-y-2">
            {order.items.map((it) => {
              const unitNum = Number.parseFloat(it.unitPrice || "0") || 0;
              const lineNum = unitNum * (it.quantity || 1);
              const itemCurrency = it.currency || order.currency;
              const isDigital = it.format === "digital";
              const isPaper = it.format === "paper";
              const isCancelled = order.status === "cancelled";
              // Digital access is unlocked only once payment is captured
              // (COD never reaches paid). The server enforces this too; we
              // mirror it here so the UI doesn't offer a link that 403s.
              const isPaid = order.paymentStatus === "paid";
              // Show Read/Download only for paid digital items. The server-side
              // route enforces ownership, payment, and existence, so legacy
              // orders that predate `digitalFileUrlSnapshot` still get correct
              // access via the live book record fallback in /file.
              const fileAvailable = isDigital && isPaid;
              const fileBase = `/api/account/me/orders/${order.id}/items/${it.id}/file`;
              return (
                <li
                  key={it.id}
                  className="flex flex-col gap-2 border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-primary truncate">{it.productTitle}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{productLabel(it.productType)}</span>
                        {isPaper && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary/10 border border-secondary/20 text-secondary">
                            <Truck className="w-3 h-3" /> {t.formatPaper}
                          </span>
                        )}
                        {isDigital && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary/10 border border-secondary/20 text-secondary">
                            <FileText className="w-3 h-3" /> {t.formatDigital}
                          </span>
                        )}
                        <span>•</span>
                        <span>{unitNum.toFixed(2)} {itemCurrency} × {it.quantity}</span>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-primary whitespace-nowrap">
                      {lineNum.toFixed(2)} {itemCurrency}
                    </div>
                  </div>
                  {isDigital && (
                    <div>
                      {isCancelled ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-red-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> {t.digitalCancelled}
                        </p>
                      ) : !isPaid ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> {t.digitalUnpaid}
                        </p>
                      ) : fileAvailable ? (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/account/orders/${order.id}/items/${it.id}/read`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                            data-testid={`btn-read-${it.id}`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {t.readOnline}
                          </Link>
                          <a
                            href={`${fileBase}?download=1`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold border border-secondary/50 text-secondary hover:bg-secondary/10"
                            data-testid={`btn-download-${it.id}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t.downloadPdf}
                          </a>
                        </div>
                      ) : (
                        <p className="inline-flex items-center gap-1.5 text-xs text-secondary font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> {t.digitalUnavailable}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {(() => {
            const shipping = Number.parseFloat(order.shippingTotal || "0") || 0;
            if (shipping > 0) {
              const totalNumLocal = Number.parseFloat(order.totalAmount || "0") || 0;
              return (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>{t.subtotalLine}</span>
                    <span className="font-bold text-primary">
                      {(totalNumLocal - shipping).toFixed(2)} {order.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {t.shippingLine}
                      {order.shippingCity ? ` • ${order.shippingCity}` : ""}
                    </span>
                    <span className="font-bold text-primary">
                      {shipping.toFixed(2)} {order.currency}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          {(order.city || order.address || order.phone || order.notes) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              {order.phone && (
                <div><span className="font-bold text-primary">{lang === "ar" ? "الجوال" : "Phone"}:</span> {order.phone}</div>
              )}
              {order.city && (
                <div><span className="font-bold text-primary">{lang === "ar" ? "المدينة" : "City"}:</span> {order.city}</div>
              )}
              {order.address && (
                <div className="sm:col-span-2"><span className="font-bold text-primary">{lang === "ar" ? "العنوان" : "Address"}:</span> {order.address}</div>
              )}
              {order.notes && (
                <div className="sm:col-span-2"><span className="font-bold text-primary">{lang === "ar" ? "ملاحظات" : "Notes"}:</span> {order.notes}</div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default function AccountPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isLoaded = !isPending;
  const isSignedIn = !!user;
  const [profileOpen, setProfileOpen] = useState(false);

  const academyQuery = useQuery<{
    email: string | null;
    applications: AcademyApplicationRow[];
    registrations: AcademyRegistrationRow[];
  }>({
    queryKey: ["account-academy"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const res = await fetch("/api/account/me/academy-registrations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const ordersQuery = useQuery<{ orders: OrderRow[] }>({
    queryKey: ["account-orders"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const res = await fetch("/api/account/me/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const serviceQuery = useQuery<{ email: string | null; requests: ServiceRequestRow[] }>({
    queryKey: ["account-service-requests"],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const res = await fetch("/api/account/me/service-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    document.title = isAr ? "حسابي • دار نظم" : "My Account • DarNozom";
    return () => {
      document.title = isAr
        ? "دار نظم - لإنتاج وتطوير أنظمة الحوكمة والامتثال الشرعي والإدارية"
        : "DarNozom - Sharia Governance, Compliance & Management Systems";
    };
  }, [isAr]);

  const productLabel = (type: string) => {
    if (type === "book") return t.book;
    if (type === "course") return t.course;
    if (type === "app") return t.app;
    return type;
  };

  const applyTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      diploma: t.diploma,
      program: t.program,
      level: t.level,
      course: t.course,
      exec: t.exec,
      path: t.path,
      general: t.general,
    };
    return map[type] ?? type;
  };

  const submissionTypeLabel = (type: string) => {
    if (type === "service_registration") return t.serviceRequest;
    return t.rfp;
  };

  const email = user?.email || "";
  const name = useMemo(() => {
    return user?.name || email.split("@")[0] || "";
  }, [user, email]);

  if (!isLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  return (
    <div className="min-h-[100dvh] bg-background islamic-pattern flex flex-col" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <main className="flex-1 pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 space-y-6">
          {/* Header */}
          <header>
            <div className="flex items-center gap-2 text-xs font-bold text-secondary tracking-[0.2em] uppercase mb-2">
              <span className="h-px w-10 bg-secondary" />
              <span>{isAr ? "المنطقة الشخصية" : "Personal Area"}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-primary mb-1">{t.title}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t.subtitle}</p>
          </header>

          {/* Admin shortcut */}
          <AdminShortcutCard isAr={isAr} />

          {/* Profile */}
          <SectionCard icon={UserCircle2} heading={t.profileHeading}>
            <div className="flex items-center gap-4 flex-wrap">
              {user?.image ? (
                <img src={user.image} alt="" className="w-16 h-16 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary text-primary flex items-center justify-center">
                  <UserCircle2 className="w-8 h-8" />
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs text-muted-foreground">{t.name}</div>
                <div className="text-base font-bold text-primary">{name || "—"}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.email}</div>
                <div className="text-sm text-primary font-mono break-all">{email || "—"}</div>
              </div>
              <button
                onClick={() => setProfileOpen(true)}
                className="px-4 py-2 bg-secondary text-primary text-sm font-bold hover:bg-secondary/90 inline-flex items-center gap-2"
                data-testid="btn-edit-profile"
              >
                <Pencil className="w-4 h-4" />
                {t.editProfile}
              </button>
            </div>
          </SectionCard>

          {/* Orders (checkout-based) */}
          <SectionCard icon={Package} heading={t.ordersHeading}>
            {ordersQuery.isLoading ? (
              <div className="text-sm text-muted-foreground py-4">{t.loading}</div>
            ) : !ordersQuery.data?.orders.length ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">{t.noOrders}</p>
                <Link
                  href="/services/store"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-primary text-sm font-bold hover:bg-secondary/90"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t.browseStore}
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {ordersQuery.data.orders.map((o) => (
                  <OrderRowItem key={o.id} order={o} lang={language} t={t} productLabel={productLabel} />
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Academy */}
          <SectionCard icon={GraduationCap} heading={t.academyHeading}>
            {academyQuery.isLoading ? (
              <div className="text-sm text-muted-foreground py-4">{t.loading}</div>
            ) : (
              (() => {
                const apps = academyQuery.data?.applications ?? [];
                const regs = academyQuery.data?.registrations ?? [];
                if (!apps.length && !regs.length) return <EmptyState label={t.empty} />;
                return (
                  <div className="space-y-6">
                    {regs.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground font-bold uppercase mb-2">
                          {isAr ? "تسجيلات الدورات" : "Course Registrations"}
                        </div>
                        <ul className="divide-y divide-border/60">
                          {regs.map((r) => (
                            <li key={r.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="font-bold text-primary">
                                  {(isAr ? r.courseTitleAr : r.courseTitleEn) || r.courseTitleAr || r.courseTitleEn || `#${r.courseId}`}
                                </div>
                                {r.organization && (
                                  <div className="text-xs text-muted-foreground">{t.organization}: {r.organization}</div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(r.registeredAt, language)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {apps.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground font-bold uppercase mb-2">
                          {isAr ? "طلبات التقديم" : "Applications"}
                        </div>
                        <ul className="divide-y divide-border/60">
                          {apps.map((a) => (
                            <li key={a.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="font-bold text-primary">
                                  {(isAr ? a.contextLabelAr : a.contextLabelEn) || a.contextLabelAr || a.contextLabelEn || applyTypeLabel(a.applyType)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {applyTypeLabel(a.applyType)}
                                  {a.organization ? ` • ${a.organization}` : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <StatusPill status={a.status} lang={language} />
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(a.createdAt, language)}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </SectionCard>

          {/* Service requests */}
          <SectionCard icon={FileText} heading={t.serviceRequestsHeading}>
            {serviceQuery.isLoading ? (
              <div className="text-sm text-muted-foreground py-4">{t.loading}</div>
            ) : !serviceQuery.data?.requests.length ? (
              <EmptyState label={t.empty} />
            ) : (
              <ul className="divide-y divide-border/60">
                {serviceQuery.data.requests.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-bold text-primary">
                          {submissionTypeLabel(r.submissionType)}
                          {r.organization ? ` • ${r.organization}` : ""}
                        </div>
                        {r.servicesOfInterest && r.servicesOfInterest.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                            {r.servicesOfInterest.slice(0, 6).map((s) => (
                              <span key={s} className="px-1.5 py-0.5 border border-border bg-muted/40 font-mono">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {r.projectDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={r.status} lang={language} />
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(r.createdAt, language)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Footer link */}
          <div className="text-center pt-4">
            <a
              href={`${basePath}/`}
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-secondary"
            >
              {t.backHome}
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        language={language}
        currentName={name}
        email={email}
      />
    </div>
  );
}

function AdminShortcutCard({ isAr }: { isAr: boolean }) {
  const { status, loading, refetch } = useAdminStatus();
  const { data: session } = useSession();
  const user = session?.user;
  const [refreshing, setRefreshing] = useState(false);

  if (loading) return null;
  if (!status?.signedIn) return null;

  if (!status.isAdmin) {
    const email = status.email || user?.email || "";
    // Heuristic: only nudge users whose email looks like a darnozom team
    // address. Regular customers should not see an "admin" notice on their
    // account page at all.
    const looksLikeTeam = /@darnozom\./i.test(email);
    if (!looksLikeTeam) return null;

    const handleRefresh = async () => {
      setRefreshing(true);
      refetch();
      // Give the network call a moment to land before un-spinning the icon.
      setTimeout(() => setRefreshing(false), 1200);
    };

    return (
      <div
        className="block bg-gradient-to-bl from-secondary/15 via-secondary/5 to-transparent border-2 border-secondary/40/70 p-5"
        data-testid="account-admin-pending"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 bg-secondary/40 text-primary flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs font-bold text-secondary tracking-wider uppercase mb-0.5">
              {isAr ? "صلاحيات الإدارة" : "Admin Access"}
            </div>
            <div className="text-base md:text-lg font-black text-primary">
              {isAr
                ? "هذا الحساب غير مفعّل كمدير"
                : "This account is not activated as an admin"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isAr
                ? "إذا كان من المفترض أن تكون مديراً، تواصل مع المسؤول لإضافة بريدك إلى قائمة المشرفين، ثم اضغط إعادة فحص."
                : "If you should be an admin, ask the system owner to add your email to the admins list, then click recheck."}
            </div>
            {email && (
              <div className="text-xs font-mono text-muted-foreground mt-2 break-all">
                {email}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 inline-flex items-center gap-2 disabled:opacity-60"
            data-testid="account-admin-recheck"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {isAr ? "إعادة فحص الصلاحيات" : "Recheck access"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/admin"
      className="block bg-gradient-to-bl from-secondary/20 via-secondary/10 to-transparent border-2 border-secondary/40 p-5 hover:border-secondary transition-colors cursor-pointer group"
      data-testid="account-admin-shortcut"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-secondary text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-secondary tracking-wider uppercase mb-0.5">
            {isAr ? "صلاحيات الإدارة" : "Admin Access"}
          </div>
          <div className="text-base md:text-lg font-black text-primary">
            {isAr ? "الدخول إلى لوحة التحكم" : "Open Admin Dashboard"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {isAr
              ? "إدارة الطلبات، المتجر، الأكاديمية، الفعاليات والمستخدمين"
              : "Manage orders, store, academy, events and users"}
          </div>
        </div>
        <ArrowLeft
          className={`w-5 h-5 text-primary group-hover:text-secondary transition-colors ${isAr ? "" : "rotate-180"}`}
        />
      </div>
    </Link>
  );
}
