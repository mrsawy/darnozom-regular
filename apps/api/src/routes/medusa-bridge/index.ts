import { Router, type Response } from "express";
import { createHmac } from "crypto";
import { requireAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import { logger } from "../../lib/logger";

export const medusaBridgeRouter = Router();

function signAssertion(payload: { betterAuthUserId: string; email: string; name: string }): string {
  const secret = process.env.BETTER_AUTH_BRIDGE_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_BRIDGE_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + 60;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

async function findOrCreateMedusaCustomer(userId: string, email: string, name: string): Promise<string> {
  const backendUrl = process.env.MEDUSA_BACKEND_URL;
  const adminKey = process.env.MEDUSA_ADMIN_API_KEY;
  if (!backendUrl || !adminKey) throw new Error("Medusa backend not configured");

  const headers = { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" };

  const searchRes = await fetch(`${backendUrl}/admin/customers?q=${encodeURIComponent(email)}`, { headers });
  const searchBody = (await searchRes.json()) as { customers: Array<{ id: string; metadata?: Record<string, unknown> }> };
  const existing = searchBody.customers.find((c) => c.metadata?.betterAuthUserId === userId);
  if (existing) return existing.id;

  const createRes = await fetch(`${backendUrl}/admin/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, first_name: name, metadata: { betterAuthUserId: userId } }),
  });
  if (!createRes.ok) throw new Error(`Failed to create Medusa customer (${createRes.status})`);
  const createBody = (await createRes.json()) as { customer: { id: string } };
  return createBody.customer.id;
}

medusaBridgeRouter.post("/medusa-token", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const email = req.userEmail!;
    const name = email; // SessionUser carries `name` too — pass req's actual name field if available

    await findOrCreateMedusaCustomer(userId, email, name);

    const assertion = signAssertion({ betterAuthUserId: userId, email, name });
    const backendUrl = process.env.MEDUSA_BACKEND_URL;
    const authRes = await fetch(`${backendUrl}/auth/customer/better-auth-bridge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assertion }),
    });
    if (!authRes.ok) {
      const text = await authRes.text().catch(() => "");
      logger.error({ status: authRes.status, text }, "medusa-bridge: token mint failed");
      return res.status(502).json({ error: "Failed to mint Medusa token" });
    }
    const authBody = (await authRes.json()) as { token: string };
    return res.status(200).json({ token: authBody.token });
  } catch (err) {
    logger.error({ err }, "medusa-bridge: unexpected error");
    return res.status(500).json({ error: "Internal error" });
  }
});
