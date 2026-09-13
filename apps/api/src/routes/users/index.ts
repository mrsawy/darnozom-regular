import { Router } from "express";
import type { AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

/**
 * The signed-in user's identity and authorization context.
 *
 * `loadUserRole` has already resolved everything from the session cookie, so
 * this is a pure projection with no queries of its own.
 *
 * The companion `POST /users/sync` endpoint is gone: it existed only to copy a
 * Clerk identity into our `users` table after the fact. Better Auth writes that
 * row itself as part of sign-up, so there is nothing left to sync.
 */
router.get("/users/me", (req: AuthRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({
    id: req.userId,
    email: req.userEmail ?? null,
    role: req.userRole ?? "client",
    clientId: req.userClientId ?? null,
    tenantId: req.userTenantId ?? null,
    isAdmin: req.isAdmin ?? false,
    isSuperAdmin: req.isSuperAdmin ?? false,
  });
});

export default router;
