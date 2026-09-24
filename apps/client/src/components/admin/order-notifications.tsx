import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bell, ExternalLink, Loader2, Package } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useOrderNewSocket } from "@/lib/use-order-new-socket";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LAST_SEEN_KEY = "darnozom.admin.orders.lastSeenAt";
const POLL_MS = 30_000;

/** One row of GET /api/admin/order-notifications (storefront + Medusa orders). */
interface OrderNotification {
  key: string;
  source: "storefront" | "medusa";
  ref: string;
  customer: string | null;
  email: string | null;
  total: string;
  currency: string;
  createdAt: string;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  needsPaymentReview: boolean;
  medusaOrderId: string | null;
}

function medusaAdminBase(): string {
  const explicit = import.meta.env.VITE_MEDUSA_ADMIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const backend = (
    import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9010"
  ).replace(/\/$/, "");
  return `${backend}/app`;
}

function readLastSeen(): number {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) return n;
    // First visit: seed "now" so historical orders don't all count as new.
    const now = Date.now();
    localStorage.setItem(LAST_SEEN_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function writeLastSeen(ts: number) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(ts));
  } catch {
    // private mode — the badge just won't remember
  }
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function OrderNotificationsBell() {
  const [, navigate] = useLocation();
  const [orders, setOrders] = useState<OrderNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(() => readLastSeen());
  const [open, setOpen] = useState(false);
  const [openSnapshot, setOpenSnapshot] = useState<OrderNotification[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminFetch("/api/admin/order-notifications");
      if (!r.ok) return;
      const data = (await r.json()) as { orders?: OrderNotification[] };
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      // Keep previous list on transient failures.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Live push (new orders and payment updates) — polling above stays as fallback.
  useOrderNewSocket(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // New since last look, plus manual transfers still waiting for staff to
  // verify — those stay until someone confirms the payment.
  const newOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (o.status === "cancelled" || o.status === "canceled") return false;
        return new Date(o.createdAt).getTime() > lastSeen || o.needsPaymentReview;
      })
      .slice(0, 12);
  }, [orders, lastSeen]);

  const listOrders = openSnapshot ?? newOrders;
  const badge = newOrders.length;

  function markSeen() {
    const now = Date.now();
    writeLastSeen(now);
    setLastSeen(now);
  }

  function openOrder(order: OrderNotification) {
    markSeen();
    setOpen(false);
    if (order.source === "storefront") {
      // Storefront orders are managed (and payments confirmed) here.
      navigate("/admin/orders");
    } else {
      window.open(`${medusaAdminBase()}/orders/${order.medusaOrderId}`, "_blank", "noopener,noreferrer");
    }
  }

  function openMedusa() {
    markSeen();
    setOpenSnapshot([]);
    window.open(`${medusaAdminBase()}/orders`, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setOpenSnapshot(newOrders);
        } else {
          markSeen();
          setOpenSnapshot(null);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center text-primary-foreground/85 hover:text-secondary transition-colors"
          aria-label="إشعارات الطلبات الجديدة"
          data-testid="admin-order-notifications"
        >
          <Bell className="w-5 h-5" />
          {badge > 0 && (
            <span className="absolute -top-0.5 -left-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-secondary text-primary text-[10px] font-black leading-[1.1rem] text-center">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 rounded-none border-border bg-background text-foreground p-0"
      >
        <div dir="rtl">
          <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-black">
            <span>طلبات جديدة</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="m-0" />
          {listOrders.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              لا توجد طلبات جديدة منذ آخر مشاهدة
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {listOrders.map((order) => (
                <DropdownMenuItem
                  key={order.key}
                  className="rounded-none px-3 py-2.5 cursor-pointer focus:bg-muted/50"
                  onSelect={(e) => {
                    e.preventDefault();
                    openOrder(order);
                  }}
                >
                  <div className="flex items-start gap-2 w-full">
                    <Package className="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-sm font-bold truncate">
                        {order.ref} — {order.customer || order.email || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {order.total} {order.currency} · {formatWhen(order.createdAt)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.source === "medusa" && (
                          <span className="text-[10px] px-1.5 py-0.5 border border-border text-muted-foreground">
                            ميدوسا
                          </span>
                        )}
                        {order.needsPaymentReview && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold">
                            بانتظار التحقق من الدفع
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem
            className="rounded-none px-3 py-2.5 cursor-pointer font-bold text-secondary focus:bg-muted/50"
            onSelect={(e) => {
              e.preventDefault();
              openMedusa();
            }}
          >
            <ExternalLink className="w-4 h-4" />
            فتح لوحة ميدوسا للطلبات
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
