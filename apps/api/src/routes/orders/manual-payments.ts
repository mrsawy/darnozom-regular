import { Router, type Response } from "express";
import { db, orders } from "@workspace/db";
import { eq } from "drizzle-orm";
import { optionalAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/adminAuth";
import { isValidBridgeSecret } from "../../lib/bridge-secret";
import { isManualPaymentMethod, markOrderPaid } from "../../lib/payments/manualPayments";
import {
  ensureMedusaOrderPayable,
  findMedusaOrderIdByDarnozomId,
} from "../../lib/medusa-order-sync";
import { canAccessOrder } from "./access";

const router = Router();

function parseId(raw: unknown): number | null {
  const id = Number.parseInt(String(raw), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Buyer's instructions page: order total + method. Signed-in owner, or a
// guest who passes the order email (stashed at checkout / in the email link).
router.get(
  "/store/orders/:id/manual-payment",
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    const guestEmail = typeof req.query.email === "string" ? req.query.email : null;
    if (
      !order ||
      !isManualPaymentMethod(order.paymentMethod) ||
      !canAccessOrder(order, req, guestEmail)
    ) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({
      id: order.id,
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });
  },
);

// Medusa "Mark as paid" → manual-payment-captured subscriber → here.
router.post("/internal/orders/:id/mark-paid", async (req, res) => {
  if (!isValidBridgeSecret(req.headers.authorization)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid order id" });

  const medusaOrderId = (req.body as { medusaOrderId?: unknown } | undefined)?.medusaOrderId;
  if (typeof medusaOrderId === "string" && medusaOrderId) {
    await db.update(orders).set({ medusaOrderId }).where(eq(orders.id, id));
  }

  const result = await markOrderPaid(id, { source: "medusa" });
  switch (result.status) {
    case "paid":
      return res.json({ ok: true, alreadyPaid: false });
    case "already_paid":
      return res.json({ ok: true, alreadyPaid: true });
    case "not_found":
      return res.status(404).json({ error: "Order not found" });
    case "not_manual":
      return res.status(400).json({ error: "Not a manual payment order" });
    case "cancelled":
      return res.status(409).json({ error: "Order is cancelled" });
  }
});

// Storefront admin "Confirm payment". Medusa is the source of truth: mark it
// paid there first; only on success mark Express paid. The subscriber's
// callback that follows is then a no-op.
router.post("/admin/orders/:id/confirm-payment", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Not found" });
  if (!isManualPaymentMethod(order.paymentMethod)) {
    return res
      .status(400)
      .json({ error: "Only Vodafone Cash / InstaPay orders can be confirmed here" });
  }
  if (order.status === "cancelled") return res.status(409).json({ error: "Order is cancelled" });
  if (order.paymentStatus === "paid") return res.json(order);

  try {
    const medusaOrderId = order.medusaOrderId ?? (await findMedusaOrderIdByDarnozomId(order.id));
    if (!medusaOrderId) {
      return res.status(502).json({
        error:
          "The matching Medusa order was not found — confirm it from Medusa Admin or re-sync the order.",
      });
    }
    await ensureMedusaOrderPayable(medusaOrderId, Number.parseFloat(order.totalAmount), {
      markPaid: true,
      providerId: "pp_system_default",
    });
    if (!order.medusaOrderId) {
      await db.update(orders).set({ medusaOrderId }).where(eq(orders.id, order.id));
    }
  } catch (err) {
    req.log.error({ err, orderId: order.id }, "medusa mark-as-paid failed during manual confirm");
    return res
      .status(502)
      .json({ error: "Could not mark the order paid in Medusa. Nothing was changed." });
  }

  const result = await markOrderPaid(order.id, { source: "storefront_admin" });
  if (result.status === "paid" || result.status === "already_paid") {
    return res.json(result.order);
  }
  return res.status(409).json({ error: `Could not confirm payment (${result.status})` });
});

export default router;
