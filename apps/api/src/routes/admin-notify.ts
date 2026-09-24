import { Router, type Request, type Response } from "express";
import {
  emitOrderNew,
  type OrderNewPayload,
} from "../lib/admin-socket";

const router = Router();

/**
 * Medusa (and other backends) POST here so the Express Socket.IO hub can
 * fan out `order:new` to storefront admin + Medusa admin clients.
 * Auth: Authorization: Bearer <BETTER_AUTH_BRIDGE_SECRET>
 */
router.post("/internal/admin-notify/order-new", (req: Request, res: Response) => {
  const secret =
    process.env.BETTER_AUTH_BRIDGE_SECRET?.trim() ||
    process.env.ADMIN_SOCKET_NOTIFY_SECRET?.trim();
  const auth = req.headers.authorization?.trim() ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!secret || !token || token !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = (req.body ?? {}) as Partial<OrderNewPayload>;
  if (body.id == null || !body.createdAt) {
    return res.status(400).json({ error: "id and createdAt are required" });
  }

  emitOrderNew({
    id: body.id,
    source: body.source === "express" ? "express" : "medusa",
    fullName: body.fullName ?? null,
    email: body.email ?? null,
    totalAmount: body.totalAmount ?? null,
    currency: body.currency ?? null,
    createdAt: String(body.createdAt),
    medusaOrderId: body.medusaOrderId ?? (typeof body.id === "string" ? body.id : null),
  });

  return res.json({ ok: true });
});

export default router;
