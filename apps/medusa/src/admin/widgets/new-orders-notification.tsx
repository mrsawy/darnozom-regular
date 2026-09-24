import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, IconButton, Popover, Text, clx } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { io, type Socket } from "socket.io-client"

const LAST_SEEN_KEY = "darnozom.medusa.orders.lastSeenAt"
const POLL_MS = 30_000
const ORDER_NEW_EVENT = "order:new"
const ORDER_UPDATED_EVENT = "order:updated"
const MANUAL_METHODS = ["vodafone_cash", "instapay"]

type AdminOrder = {
  id: string
  display_id?: number
  email?: string | null
  status?: string
  payment_status?: string
  created_at?: string
  currency_code?: string
  total?: number
  metadata?: Record<string, unknown> | null
}

type SocketConfig = { socketUrl: string; socketPath: string; token: string | null }

function readLastSeen(): number {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY)
    const n = raw ? Number(raw) : NaN
    if (Number.isFinite(n)) return n
    const now = Date.now()
    localStorage.setItem(LAST_SEEN_KEY, String(now))
    return now
  } catch {
    return Date.now()
  }
}

function writeLastSeen(ts: number) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(ts))
  } catch {
    // ignore quota / private mode
  }
}

function formatMoney(order: AdminOrder): string {
  // Medusa v2 amounts are in major units (66 = 66.00 EGP), not cents.
  if (typeof order.total !== "number") return ""
  return `${order.total.toFixed(2)} ${(order.currency_code || "").toUpperCase()}`
}

/** A Vodafone Cash / InstaPay order whose transfer staff still have to verify. */
function needsPaymentReview(order: AdminOrder): boolean {
  const method = order.metadata?.payment_method
  return (
    typeof method === "string" &&
    MANUAL_METHODS.includes(method) &&
    order.payment_status !== "captured" &&
    order.status !== "canceled"
  )
}

function formatWhen(iso?: string): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

const NewOrdersNotification = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSeen, setLastSeen] = useState(() => readLastSeen())
  const [open, setOpen] = useState(false)
  const [openSnapshot, setOpenSnapshot] = useState<AdminOrder[] | null>(null)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: "20",
        order: "-created_at",
        fields: "id,display_id,email,status,payment_status,created_at,currency_code,total,metadata",
      })
      const res = await fetch(`/admin/orders?${params}`, {
        credentials: "include",
      })
      if (!res.ok) return
      const body = (await res.json()) as { orders?: AdminOrder[] }
      setOrders(Array.isArray(body.orders) ? body.orders : [])
    } catch {
      // keep previous
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  // Live push from the storefront API's socket (polling stays as fallback).
  // The address and an admin token come from this Medusa server, so the same
  // build works in every environment.
  useEffect(() => {
    let socket: Socket | null = null
    let cancelled = false
    const refresh = () => void load()

    ;(async () => {
      try {
        const res = await fetch("/admin/darnozom/notifications-config", { credentials: "include" })
        if (!res.ok || cancelled) return
        const cfg = (await res.json()) as SocketConfig
        if (!cfg.token || cancelled) return
        socket = io(cfg.socketUrl, {
          path: cfg.socketPath,
          transports: ["websocket", "polling"],
          auth: { token: cfg.token },
          reconnection: true,
          reconnectionDelay: 2000,
        })
        socket.on(ORDER_NEW_EVENT, refresh)
        socket.on(ORDER_UPDATED_EVENT, refresh)
      } catch {
        // polling covers it
      }
    })()

    return () => {
      cancelled = true
      socket?.disconnect()
    }
  }, [load])

  const newOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "canceled" || o.status === "cancelled") return false
      const created = o.created_at ? new Date(o.created_at).getTime() : 0
      return created > lastSeen || needsPaymentReview(o)
    })
  }, [orders, lastSeen])

  const listOrders = openSnapshot ?? newOrders
  const badge = newOrders.length

  function markSeen() {
    const now = Date.now()
    writeLastSeen(now)
    setLastSeen(now)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setOpenSnapshot(newOrders)
        } else {
          markSeen()
          setOpenSnapshot(null)
        }
      }}
    >
      <Popover.Trigger asChild>
        <IconButton
          variant="transparent"
          size="small"
          className="relative"
          aria-label="New order notifications"
          data-testid="medusa-order-notifications"
        >
          <BellIcon />
          {badge > 0 && (
            <span
              className={clx(
                "absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1",
                "rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text",
                "text-[10px] font-bold leading-4 text-center"
              )}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </IconButton>
      </Popover.Trigger>
      <Popover.Content align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-ui-border-base px-3 py-2">
          <Text size="small" weight="plus">
            New orders
          </Text>
          {loading && (
            <Text size="xsmall" className="text-ui-fg-subtle">
              …
            </Text>
          )}
        </div>
        {listOrders.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Text size="small" className="text-ui-fg-subtle">
              No new orders since you last checked
            </Text>
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto divide-y divide-ui-border-base">
            {listOrders.map((order) => (
              <li key={order.id}>
                <Link
                  to={`/orders/${order.id}`}
                  onClick={() => {
                    markSeen()
                    setOpen(false)
                  }}
                  className="block px-3 py-2.5 hover:bg-ui-bg-base-hover transition-colors"
                >
                  <Text size="small" weight="plus" className="truncate block">
                    #{order.display_id ?? order.id}{" "}
                    {order.email ? `— ${order.email}` : ""}
                  </Text>
                  <Text size="xsmall" className="text-ui-fg-subtle mt-0.5 block">
                    {[formatMoney(order), formatWhen(order.created_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {needsPaymentReview(order) && (
                    <Badge size="2xsmall" color="orange" className="mt-1">
                      Verify {order.metadata?.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"} payment
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-ui-border-base px-3 py-2">
          <Link
            to="/orders"
            onClick={() => {
              markSeen()
              setOpen(false)
            }}
            className="text-ui-fg-interactive text-sm font-medium hover:underline"
          >
            View all orders
          </Link>
        </div>
      </Popover.Content>
    </Popover>
  )
}

export const config = defineWidgetConfig({
  zone: "topbar",
  id: "darnozom:new-orders-notification",
})

export default NewOrdersNotification
