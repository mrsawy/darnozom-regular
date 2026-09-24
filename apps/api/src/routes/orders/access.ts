import type { Order } from "@workspace/db";
import type { AuthRequest } from "../../middlewares/authMiddleware";

export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

/** Registered order: session userId must match. Guest order: email must match. */
export function canAccessOrder(
  order: Pick<Order, "userId" | "userEmail">,
  req: AuthRequest,
  guestEmail?: string | null,
): boolean {
  if (order.userId) {
    return Boolean(req.userId) && order.userId === req.userId;
  }
  const email = normalizeEmail(guestEmail || req.userEmail);
  return Boolean(email) && email === order.userEmail.toLowerCase();
}
