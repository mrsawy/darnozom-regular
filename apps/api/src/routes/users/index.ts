import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "../../middlewares/authMiddleware";
import { getRoleFromClerkMetadata, resolveRoleForNewUser, getClientIdFromClerkMetadata, checkIsAdmin, autoProvisionClientRecord } from "../../middlewares/authMiddleware";

const router = Router();

router.get("/users/me", async (req: AuthRequest, res) => {
  try {
    const clerkId = req.clerkUserId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    if (!user) {
      const role = await resolveRoleForNewUser(clerkId);
      const clientId = await getClientIdFromClerkMetadata(clerkId);
      const isAdmin = role === "consultant" ? await checkIsAdmin(clerkId) : false;
      res.json({ role, clientId: clientId ?? null, isAdmin, tenantId: null, isSuperAdmin: false });
      return;
    }
    const isAdmin = user.role === "consultant" ? (req.isAdmin ?? await checkIsAdmin(clerkId)) : false;
    res.json({
      id: user.id,
      role: user.role,
      clientId: user.clientId,
      email: user.email,
      isAdmin,
      tenantId: user.tenantId ?? null,
      isSuperAdmin: user.isSuperAdmin ?? false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.post("/users/sync", async (req: AuthRequest, res) => {
  try {
    const clerkId = req.clerkUserId;
    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { email } = req.body as { email?: string };

    let clientId = await getClientIdFromClerkMetadata(clerkId, email);

    const [existing] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
    if (existing) {
      const clerkRole = await getRoleFromClerkMetadata(clerkId);
      const role = clerkRole === "consultant" ? "consultant" : existing.role;

      if (role === "client" && !clientId && !existing.clientId) {
        clientId = await autoProvisionClientRecord(clerkId, email);
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        role,
        clientId: clientId ?? existing.clientId ?? null,
      };
      if (email) updates.email = email;
      const [updated] = await db.update(users).set(updates).where(eq(users.clerkId, clerkId)).returning();
      res.json(updated);
      return;
    }

    const role = await resolveRoleForNewUser(clerkId);

    if (role === "client" && !clientId) {
      clientId = await autoProvisionClientRecord(clerkId, email);
    }

    const [created] = await db.insert(users).values({
      clerkId,
      email: email ?? "",
      role,
      clientId: clientId ?? null,
    }).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

export default router;
