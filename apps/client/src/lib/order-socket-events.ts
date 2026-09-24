/** Shared with the API Socket.IO hub (`apps/api/src/lib/admin-socket.ts`). */
export const ORDER_NEW_EVENT = "order:new" as const;
/** An existing order's payment or status changed (e.g. payment confirmed). */
export const ORDER_UPDATED_EVENT = "order:updated" as const;
/** Socket.IO path on the API (under /api/ so production nginx proxies it). */
export const ADMIN_SOCKET_PATH = "/api/socket.io";

export type OrderNewPayload = {
  id: number | string;
  source: "express" | "medusa";
  fullName?: string | null;
  email?: string | null;
  totalAmount?: string | null;
  currency?: string | null;
  createdAt: string;
  medusaOrderId?: string | null;
};
