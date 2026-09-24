import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import {
  ADMIN_SOCKET_PATH,
  ORDER_NEW_EVENT,
  ORDER_UPDATED_EVENT,
  type OrderNewPayload,
} from "./order-socket-events";

export type { OrderNewPayload };
export { ORDER_NEW_EVENT };

function socketUrl(): string {
  // Same-origin in dev (Vite proxies /socket.io → API). Production usually
  // serves API under the same host; override with VITE_SOCKET_URL if not.
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return window.location.origin;
}

/**
 * Subscribe to live order events (`order:new`, and `order:updated` when a
 * payment or status changes). Admins only — the API checks the session
 * cookie. Polling remains as a fallback; this only triggers an immediate
 * refresh when the socket fires.
 */
export function useOrderNewSocket(onOrderEvent: (payload: OrderNewPayload) => void) {
  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;

    try {
      socket = io(socketUrl(), {
        path: ADMIN_SOCKET_PATH,
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
      });
    } catch {
      return;
    }

    const handler = (payload: OrderNewPayload) => {
      if (!cancelled) onOrderEvent(payload);
    };

    socket.on(ORDER_NEW_EVENT, handler);
    socket.on(ORDER_UPDATED_EVENT, handler);

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [onOrderEvent]);
}
