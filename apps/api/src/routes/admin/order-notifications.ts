import { Router } from "express";
import { db, orders } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";
import { medusaAdmin } from "../../lib/medusa-admin";
import { isManualPaymentMethod } from "../../lib/payments/manualPayments";

// Feed for the storefront admin's order bell. Storefront orders live here;
// Medusa also has orders created directly in Medusa Admin (not mirrored from
// the storefront). Both are listed so the bell matches Medusa's own bell.
const router = Router();

const LIMIT = 30;

export type OrderNotification = {
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
  /** Vodafone Cash / InstaPay order waiting for staff to verify the transfer. */
  needsPaymentReview: boolean;
  medusaOrderId: string | null;
};

type MedusaOrder = {
  id: string;
  display_id?: number;
  email?: string | null;
  status?: string;
  payment_status?: string;
  created_at?: string;
  currency_code?: string;
  total?: number;
  metadata?: Record<string, unknown> | null;
};

router.get("/admin/order-notifications", requireAdmin, async (req, res) => {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(LIMIT);
  const storefront: OrderNotification[] = rows.map((o) => ({
    key: `storefront:${o.id}`,
    source: "storefront",
    ref: `#${o.id}`,
    customer: o.fullName || null,
    email: o.userEmail || null,
    total: o.totalAmount,
    currency: o.currency,
    createdAt: new Date(o.createdAt).toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    needsPaymentReview:
      isManualPaymentMethod(o.paymentMethod) &&
      o.paymentStatus !== "paid" &&
      o.status !== "cancelled",
    medusaOrderId: o.medusaOrderId ?? null,
  }));

  let medusa: OrderNotification[] = [];
  let medusaUnavailable = false;
  try {
    const qs = new URLSearchParams({
      limit: String(LIMIT),
      order: "-created_at",
      fields: "id,display_id,email,status,payment_status,created_at,currency_code,total,metadata",
    });
    const body = await medusaAdmin<{ orders?: MedusaOrder[] }>(`/admin/orders?${qs}`);
    medusa = (body.orders ?? [])
      // Mirrors of storefront orders are already listed above.
      .filter((o) => o.metadata?.darnozom_order_id == null && o.metadata?.source !== "darnozom_storefront")
      .map((o) => ({
        key: `medusa:${o.id}`,
        source: "medusa",
        ref: `#${o.display_id ?? o.id}`,
        customer: null,
        email: o.email ?? null,
        // Medusa v2 amounts are in major units (66 = 66.00 EGP).
        total: typeof o.total === "number" ? o.total.toFixed(2) : "",
        currency: (o.currency_code ?? "").toUpperCase(),
        createdAt: o.created_at ?? new Date(0).toISOString(),
        status: o.status ?? "pending",
        paymentStatus: o.payment_status ?? null,
        paymentMethod: null,
        needsPaymentReview: false,
        medusaOrderId: o.id,
      }));
  } catch (err) {
    req.log?.warn({ err }, "order notifications: Medusa orders unavailable");
    medusaUnavailable = true;
  }

  const merged = [...storefront, ...medusa]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, LIMIT);
  return res.json({ orders: merged, ...(medusaUnavailable ? { medusaUnavailable } : {}) });
});

export default router;
