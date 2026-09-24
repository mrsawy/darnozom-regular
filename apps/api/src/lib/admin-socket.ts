import type { Request } from "express";
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { getSessionUser, isAdminRole } from "../middlewares/authMiddleware";
import { auth } from "./auth";
import { verifyAdminSocketToken } from "./admin-socket-token";
import { logger } from "./logger";

/** Event name clients listen for. Payload is a compact order summary. */
export const ORDER_NEW_EVENT = "order:new" as const;
/** An existing order's payment or status changed (e.g. payment confirmed). */
export const ORDER_UPDATED_EVENT = "order:updated" as const;

/**
 * Under /api/ so the production nginx `location /api/` (which already passes
 * WebSocket upgrades) reaches it on the storefront domain too.
 */
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

export type OrderUpdatedPayload = {
  id: number | string;
  medusaOrderId?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
};

const ADMIN_ROOM = "admins";

let io: Server | null = null;

/** Pages allowed to use the admin session cookie (Better Auth's trusted origins). */
function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const trusted = (auth.options.trustedOrigins ?? []) as unknown;
  return Array.isArray(trusted) && trusted.includes(origin);
}

/**
 * Only admins may listen — events carry customer names, emails and totals.
 * Storefront admins are recognised by their session cookie; the Medusa Admin
 * bell (another origin) sends a token Medusa signed with the bridge secret.
 *
 * Browsers attach cookies to a WebSocket handshake from any page (CORS does
 * not apply), so the cookie only counts when the page's Origin is ours —
 * otherwise a hostile site could listen with a logged-in admin's session.
 * The token is never sent automatically, so it is accepted from any origin.
 */
async function isAuthorized(socket: Socket): Promise<boolean> {
  const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
  if (token !== undefined) {
    return verifyAdminSocketToken(token, process.env.BETTER_AUTH_BRIDGE_SECRET?.trim());
  }
  if (!isTrustedOrigin(socket.handshake.headers.origin)) return false;
  const user = await getSessionUser(socket.request as unknown as Request);
  return !!user && isAdminRole(user.role);
}

export function attachAdminSocket(httpServer: HttpServer): Server {
  if (io) return io;

  io = new Server(httpServer, {
    path: ADMIN_SOCKET_PATH,
    cors: {
      origin: true,
      credentials: true,
    },
    // Admin dashboards only; keep the connection light.
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    isAuthorized(socket)
      .then((ok) => next(ok ? undefined : new Error("unauthorized")))
      .catch((err) => {
        logger.warn({ err }, "admin socket auth failed");
        next(new Error("unauthorized"));
      });
  });

  io.on("connection", (socket: Socket) => {
    socket.join(ADMIN_ROOM);
  });

  logger.info(`Admin Socket.IO attached at ${ADMIN_SOCKET_PATH}`);
  return io;
}

function emitToAdmins(event: string, payload: { id: number | string }): void {
  if (!io) {
    logger.warn({ orderId: payload.id, event }, "admin socket event dropped — Socket.IO not attached yet");
    return;
  }
  io.to(ADMIN_ROOM).emit(event, payload);
}

export function emitOrderNew(payload: OrderNewPayload): void {
  emitToAdmins(ORDER_NEW_EVENT, payload);
}

export function emitOrderUpdated(payload: OrderUpdatedPayload): void {
  emitToAdmins(ORDER_UPDATED_EVENT, payload);
}
