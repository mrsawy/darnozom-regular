import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { signAdminSocketToken } from "../../../../lib/admin-socket-token"

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000

/**
 * Where the order bell (src/admin/widgets/new-orders-notification.tsx) should
 * connect for live order events, plus a token proving the viewer is a Medusa
 * admin (this route requires an admin session). The socket lives on the
 * storefront API, set per environment with DARNOZOM_PUBLIC_API_URL.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const secret = process.env.BETTER_AUTH_BRIDGE_SECRET?.trim()
  const socketUrl = (process.env.DARNOZOM_PUBLIC_API_URL?.trim() || "http://localhost:8087").replace(
    /\/$/,
    ""
  )
  res.json({
    socketUrl,
    socketPath: "/api/socket.io",
    token: secret ? signAdminSocketToken(secret, Date.now(), TOKEN_TTL_MS) : null,
  })
}
