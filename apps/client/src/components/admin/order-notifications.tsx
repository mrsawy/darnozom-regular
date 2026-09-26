import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck, ExternalLink, Loader2, Package } from "lucide-react";
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
const DISMISSED_KEYS = "darnozom.admin.orders.dismissedKeys";
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
    // private mode
  }
}

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEYS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissed(keys: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEYS, JSON.stringify([...keys]));
  } catch {
    // private mode
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

function isUnread(
  order: OrderNotification,
  lastSeen: number,
  dismissed: Set<string>,
): boolean {
  if (order.status === "cancelled" || order.status === "canceled") return false;
  if (new Date(order.createdAt).getTime() > lastSeen) return true;
  return order.needsPaymentReview && !dismissed.has(order.key);
}

function nextLastSeen(fromList: OrderNotification[]): number {
  let ts = Date.now();
  for (const o of fromList) {
    const t = new Date(o.createdAt).getTime();
    if (Number.isFinite(t) && t >= ts) ts = t + 1;
  }
  return ts;
}

export function OrderNotificationsBell() {
  const [, navigate] = useLocation();
  const [orders, setOrders] = useState<OrderNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(() => readLastSeen());
  const [dismissed, setDismissed] = useState(() => readDismissed());
  const [menuOpen, setMenuOpen] = useState(false);
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

  useOrderNewSocket(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Drop dismissed keys once payment is confirmed (or the order left the feed).
  useEffect(() => {
    if (dismissed.size === 0) return;
    const stillRelevant = new Set(
      orders.filter((o) => o.needsPaymentReview).map((o) => o.key),
    );
    let changed = false;
    const next = new Set<string>();
    for (const key of dismissed) {
      if (stillRelevant.has(key)) next.add(key);
      else changed = true;
    }
    if (changed) {
      writeDismissed(next);
      setDismissed(next);
    }
  }, [orders, dismissed]);

  const newOrders = useMemo(() => {
    return orders.filter((o) => isUnread(o, lastSeen, dismissed)).slice(0, 12);
  }, [orders, lastSeen, dismissed]);

  const listOrders = openSnapshot ?? newOrders;
  // Hide the badge while the panel is open; opening marks items read so it
  // stays cleared after close.
  const badge = menuOpen ? 0 : newOrders.length;

  function markAllRead(fromList: OrderNotification[]) {
    const ts = nextLastSeen(fromList);
    writeLastSeen(ts);
    setLastSeen(ts);
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const o of fromList) {
        if (o.needsPaymentReview) next.add(o.key);
      }
      writeDismissed(next);
      return next;
    });
  }

  function openOrder(order: OrderNotification) {
    markAllRead([order]);
    setOpenSnapshot(null);
    if (order.source === "storefront") {
      navigate("/admin/orders");
    } else {
      window.open(`${medusaAdminBase()}/orders/${order.medusaOrderId}`, "_blank", "noopener,noreferrer");
    }
  }

  function openMedusa() {
    markAllRead(listOrders);
    setOpenSnapshot(null);
    window.open(`${medusaAdminBase()}/orders`, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu
      onOpenChange={(next) => {
        setMenuOpen(next);
        if (next) {
          const snapshot = newOrders;
          setOpenSnapshot(snapshot);
          // Opening marks everything currently shown as read so the badge drops
          // (including pending VC/InstaPay rows).
          markAllRead(snapshot);
        } else {
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
            <span
              data-testid="admin-order-notifications-badge"
              className="absolute -top-0.5 -left-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-secondary text-primary text-[10px] font-black leading-[1.1rem] text-center"
            >
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
          {listOrders.length > 0 && (
            <>
              <DropdownMenuItem
                className="rounded-none px-3 py-2 cursor-pointer font-bold text-secondary focus:bg-muted/50 justify-between"
                data-testid="admin-order-notifications-mark-all"
                onSelect={(e) => {
                  e.preventDefault();
                  markAllRead(listOrders);
                  setOpenSnapshot([]);
                }}
              >
                <span>تعيين الكل كمقروء</span>
                <CheckCheck className="w-3.5 h-3.5" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="m-0" />
            </>
          )}
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
