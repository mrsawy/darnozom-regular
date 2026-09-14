import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-api";
import {
  Loader2,
  Package,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Phone,
  MapPin,
  Mail,
  StickyNote,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";

const API_BASE = "/api";

interface OrderItem {
  id: number;
  orderId: number;
  productType: "book" | "course" | "app";
  productId: number;
  productTitle: string;
  imageUrl: string | null;
  unitPrice: string;
  quantity: number;
  currency: string;
  createdAt: string;
}

interface Order {
  id: number;
  userId: string;
  userEmail: string;
  fullName: string;
  phone: string;
  address: string | null;
  city: string | null;
  notes: string | null;
  totalAmount: string;
  currency: string;
  itemsCount: number;
  status: "pending" | "confirmed" | "processing" | "completed" | "cancelled";
  paymentMethod: "paypal" | "card" | "wallet" | "cash_on_delivery" | null;
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | null;
  paymentFailureReason: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  usdAmount: string | null;
  exchangeRate: string | null;
  paidAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
}

const TYPE_AR: Record<string, string> = {
  book: "كتاب",
  course: "دورة",
  app: "تطبيق",
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

const PAYMENT_STATUS_AR: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "بانتظار الدفع",
  paid: "مدفوع",
  failed: "فشل الدفع",
};

// Human labels for the machine reasons stored in paymentFailureReason.
// PayPal issue codes (e.g. COMPLIANCE_VIOLATION) fall through and display raw.
const FAILURE_REASON_AR: Record<string, string> = {
  expired: "انتهت صلاحية الطلب (لم يُدفع)",
  cancelled_by_customer: "ألغاه العميل",
  superseded_by_new_order: "استُبدل بطلب أحدث",
  COMPLIANCE_VIOLATION: "رفض PayPal (COMPLIANCE_VIOLATION) — المبلغ يُعاد تلقائياً",
};

function paymentClasses(status: string) {
  switch (status) {
    case "paid":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    case "pending":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700";
    case "failed":
      return "border-red-500/40 bg-red-500/10 text-red-700";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "pending":
      return "border-blue-500/40 bg-blue-500/10 text-blue-700";
    case "confirmed":
      return "border-secondary/40 bg-secondary/10 text-secondary";
    case "processing":
      return "border-indigo-500/40 bg-indigo-500/10 text-indigo-700";
    case "completed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
    case "cancelled":
      return "border-red-500/40 bg-red-500/10 text-red-700";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function fmtMoney(n: string | number, currency: string) {
  const num = typeof n === "number" ? n : Number.parseFloat(n || "0") || 0;
  return `${num.toFixed(2)} ${currency}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<number, OrderWithItems | "loading">>({});
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/orders`, { credentials: "include" });
      if (r.ok) {
        const data = (await r.json()) as Order[];
        setOrders(data);
      } else {
        show("تعذر تحميل الطلبات", "error");
      }
    } catch {
      show("خطأ في الشبكة", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadDetails(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const r = await adminFetch(`${API_BASE}/admin/orders/${id}`, { credentials: "include" });
      if (r.ok) {
        const data = (await r.json()) as OrderWithItems;
        setExpanded((prev) => ({ ...prev, [id]: data }));
      } else {
        show("تعذر تحميل التفاصيل", "error");
        setExpanded((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch {
      show("خطأ في الشبكة", "error");
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function toggle(id: number) {
    if (expanded[id]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      void loadDetails(id);
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const r = await adminFetch(`${API_BASE}/admin/orders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const updated = (await r.json()) as Order;
        show("تم تحديث الحالة");
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
        if (expanded[id] && expanded[id] !== "loading") {
          void loadDetails(id);
        }
      } else {
        show("فشل التحديث", "error");
      }
    } catch {
      show("خطأ في الشبكة", "error");
    }
  }

  async function saveAdminNote(id: number, adminNote: string) {
    try {
      const r = await adminFetch(`${API_BASE}/admin/orders/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote }),
      });
      if (r.ok) {
        const updated = (await r.json()) as Order;
        show("تم حفظ الملاحظة");
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
        if (expanded[id] && expanded[id] !== "loading") {
          void loadDetails(id);
        }
      } else {
        show("تعذر حفظ الملاحظة", "error");
      }
    } catch {
      show("خطأ في الشبكة", "error");
    }
  }

  const [cleaning, setCleaning] = useState(false);
  // One-click "clean up stuck orders": rescues actually-paid pending orders
  // (PayPal + Paymob reconcile), then cancels stale abandoned online-payment
  // orders (>1h old, COD untouched).
  async function cleanupStuck() {
    if (!window.confirm("تنظيف الطلبات العالقة؟ سيتم أولاً التحقق من المدفوعات ثم إلغاء الطلبات غير المدفوعة المهجورة (أقدم من ساعة).")) {
      return;
    }
    setCleaning(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/orders/cleanup-stuck`, {
        method: "POST",
        credentials: "include",
      });
      if (r.ok) {
        const data = (await r.json()) as {
          expired?: { expired: number };
          paypal?: { recovered?: number };
        };
        const expiredCount = data.expired?.expired ?? 0;
        show(
          expiredCount > 0
            ? `تم التنظيف: أُلغي ${expiredCount} طلب عالق`
            : "تم التنظيف: لا توجد طلبات عالقة",
        );
        await load();
      } else {
        show("فشل تنظيف الطلبات العالقة", "error");
      }
    } catch {
      show("خطأ في الشبكة", "error");
    } finally {
      setCleaning(false);
    }
  }

  function exportCsv() {
    const rows = [
      [
        "#",
        "الاسم",
        "البريد",
        "الهاتف",
        "المدينة",
        "العنوان",
        "عدد العناصر",
        "الإجمالي",
        "العملة",
        "الحالة",
        "ملاحظات العميل",
        "ملاحظات المسؤول",
        "التاريخ",
      ],
      ...filtered.map((o) => [
        o.id,
        o.fullName,
        o.userEmail,
        o.phone,
        o.city || "",
        (o.address || "").replace(/\n/g, " "),
        o.itemsCount,
        o.totalAmount,
        o.currency,
        STATUS_AR[o.status] || o.status,
        (o.notes || "").replace(/\n/g, " "),
        (o.adminNote || "").replace(/\n/g, " "),
        new Date(o.createdAt).toLocaleString("ar-SA"),
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    show("تم تصدير الملف");
  }

  const filtered = orders.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [
        String(o.id),
        o.fullName,
        o.userEmail,
        o.phone,
        o.city || "",
        o.address || "",
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalRevenueByCurrency = filtered.reduce<Record<string, number>>((acc, o) => {
    if (o.status === "cancelled") return acc;
    const cur = (o.currency || "EGP").toUpperCase();
    const n = Number.parseFloat(o.totalAmount || "0") || 0;
    acc[cur] = (acc[cur] || 0) + n;
    return acc;
  }, {});

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="طلبات المتجر"
        description={`${filtered.length} من ${orders.length} طلب${
          Object.keys(totalRevenueByCurrency).length
            ? " · إجمالي المعروض: " +
              Object.entries(totalRevenueByCurrency)
                .map(([c, v]) => `${v.toFixed(2)} ${c}`)
                .join(" · ")
            : ""
        }`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={cleanupStuck}
              disabled={cleaning}
              variant="outline"
              className="gap-2 rounded-none font-bold"
              data-testid="btn-cleanup-stuck"
            >
              {cleaning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              تنظيف الطلبات العالقة
            </Button>
            <Button onClick={exportCsv} variant="outline" className="gap-2 rounded-none font-bold">
              <Download size={16} /> تصدير CSV
            </Button>
          </div>
        }
      />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الإيميل، الجوال، رقم الطلب..."
            className="rounded-none pr-8"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-input bg-background px-3 py-2 text-sm rounded-none"
          data-testid="select-filter-status"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS_AR).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="bg-background border border-border divide-y divide-border">
          {filtered.map((o) => {
            const detail = expanded[o.id];
            const isOpen = !!detail;
            const isLoadingDetail = detail === "loading";
            const detailObj = detail && detail !== "loading" ? detail : null;
            return (
              <div key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-1.5 py-0.5 bg-muted/50 border border-border font-mono">
                        #{o.id}
                      </span>
                      <span className="font-bold text-primary">{o.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        ({o.itemsCount} عنصر)
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {o.userEmail}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {o.phone}
                      </span>
                      {o.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {o.city}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1 inline-flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(o.createdAt).toLocaleString("ar-SA")}
                      </span>
                      {o.paymentMethod && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border bg-muted/40 font-bold">
                          {o.paymentMethod === "paypal"
                            ? "PayPal"
                            : o.paymentMethod === "card"
                              ? "بطاقة ائتمان / خصم"
                              : o.paymentMethod === "wallet"
                                ? "محفظة إلكترونية"
                                : "الدفع عند الاستلام"}
                        </span>
                      )}
                      {o.paymentStatus && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 border font-bold ${paymentClasses(
                            o.paymentStatus,
                          )}`}
                        >
                          {PAYMENT_STATUS_AR[o.paymentStatus] || o.paymentStatus}
                        </span>
                      )}
                      {o.paymentFailureReason && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-red-500/40 bg-red-500/10 text-red-700 font-bold"
                          title="سبب فشل/إلغاء الدفع"
                          data-testid={`text-failure-reason-${o.id}`}
                        >
                          {FAILURE_REASON_AR[o.paymentFailureReason] || o.paymentFailureReason}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-lg font-black text-primary">
                      {fmtMoney(o.totalAmount, o.currency)}
                    </div>
                    {(o.paymentMethod === "paypal" || o.paymentMethod === "card") && o.usdAmount && (
                      <div className="text-[11px] text-muted-foreground">
                        ${o.usdAmount} USD
                        {o.exchangeRate ? ` @ ${o.exchangeRate}` : ""}
                      </div>
                    )}
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className={`border px-3 py-1.5 text-sm rounded-none font-bold ${statusClasses(
                        o.status,
                      )}`}
                      data-testid={`select-status-${o.id}`}
                    >
                      {Object.entries(STATUS_AR).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => toggle(o.id)}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                      data-testid={`btn-toggle-order-${o.id}`}
                    >
                      {isOpen ? (
                        <>
                          إخفاء التفاصيل <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          عرض التفاصيل <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    {isLoadingDetail ? (
                      <div className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> جارٍ تحميل التفاصيل...
                      </div>
                    ) : detailObj ? (
                      <OrderDetailBlock order={detailObj} onSaveNote={saveAdminNote} />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderDetailBlock({
  order,
  onSaveNote,
}: {
  order: OrderWithItems;
  onSaveNote: (id: number, note: string) => void;
}) {
  const [note, setNote] = useState(order.adminNote || "");
  useEffect(() => {
    setNote(order.adminNote || "");
  }, [order.id, order.adminNote]);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-bold text-muted-foreground mb-2">العناصر</div>
        <div className="border border-border divide-y divide-border">
          {order.items.map((it) => {
            const unit = Number.parseFloat(it.unitPrice || "0") || 0;
            const line = unit * (it.quantity || 1);
            return (
              <div
                key={it.id}
                className="p-2.5 flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-primary truncate">{it.productTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.5 bg-muted/50 border border-border me-1">
                      {TYPE_AR[it.productType] || it.productType}
                    </span>
                    {fmtMoney(unit, it.currency)} × {it.quantity}
                  </div>
                </div>
                <div className="font-bold text-primary whitespace-nowrap">
                  {fmtMoney(line, it.currency)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(order.address || order.notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {order.address && (
            <div className="border border-border p-3">
              <div className="text-xs font-bold text-muted-foreground mb-1 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> العنوان
              </div>
              <div className="text-primary whitespace-pre-wrap">{order.address}</div>
            </div>
          )}
          {order.notes && (
            <div className="border border-border p-3">
              <div className="text-xs font-bold text-muted-foreground mb-1 inline-flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> ملاحظات العميل
              </div>
              <div className="text-primary whitespace-pre-wrap">{order.notes}</div>
            </div>
          )}
        </div>
      )}

      <div className="border border-border p-3">
        <div className="text-xs font-bold text-muted-foreground mb-2">
          ملاحظات المسؤول (داخلية)
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full border border-input bg-background p-2 text-sm rounded-none"
          placeholder="ملاحظة داخلية لفريقك..."
          data-testid={`textarea-admin-note-${order.id}`}
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => onSaveNote(order.id, note.trim())}
            className="rounded-none font-bold"
            data-testid={`btn-save-admin-note-${order.id}`}
          >
            حفظ الملاحظة
          </Button>
        </div>
      </div>
    </div>
  );
}
