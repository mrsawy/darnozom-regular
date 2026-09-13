import { Router } from "express";
import { db } from "@workspace/db";
import { tenants, clients, assessments, users } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import type { AuthRequest } from "../../middlewares/authMiddleware";
import { requireSuperAdmin } from "../../middlewares/authMiddleware";

const router = Router();

router.get("/tenants", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const allTenants = await db.select().from(tenants).orderBy(tenants.createdAt);

    const tenantsWithStats = await Promise.all(
      allTenants.map(async (tenant) => {
        const [clientCount] = await db
          .select({ count: count() })
          .from(clients)
          .where(eq(clients.tenantId, tenant.id));
        const [assessmentCount] = await db
          .select({ count: count() })
          .from(assessments)
          .where(eq(assessments.tenantId, tenant.id));
        const [userCount] = await db
          .select({ count: count() })
          .from(users)
          .where(eq(users.tenantId, tenant.id));
        return {
          ...tenant,
          clientCount: clientCount?.count ?? 0,
          assessmentCount: assessmentCount?.count ?? 0,
          userCount: userCount?.count ?? 0,
        };
      })
    );

    return res.json(tenantsWithStats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list tenants" });
  }
});

router.post("/tenants", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const { name, slug, logoUrl, primaryColor, secondaryColor, accentColor, adminEmail } = body as Record<string, string>;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!slug || !slug.trim()) {
      return res.status(400).json({ error: "slug is required" });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens only" });
    }

    const [existing] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    if (existing) {
      return res.status(409).json({ error: "A tenant with this slug already exists" });
    }

    const [tenant] = await db.insert(tenants).values({
      name: name.trim(),
      slug: slug.trim(),
      logoUrl: logoUrl || null,
      primaryColor: primaryColor || "#1e40af",
      secondaryColor: secondaryColor || "#1e3a5f",
      accentColor: accentColor || "#3b82f6",
      adminEmail: adminEmail || null,
      isActive: true,
    }).returning();

    return res.status(201).json(tenant);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.get("/tenants/:id", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const [clientCount] = await db.select({ count: count() }).from(clients).where(eq(clients.tenantId, id));
    const [assessmentCount] = await db.select({ count: count() }).from(assessments).where(eq(assessments.tenantId, id));
    const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, id));

    return res.json({
      ...tenant,
      clientCount: clientCount?.count ?? 0,
      assessmentCount: assessmentCount?.count ?? 0,
      userCount: userCount?.count ?? 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get tenant" });
  }
});

router.patch("/tenants/:id", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl || null;
    if (body.primaryColor !== undefined) updates.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined) updates.secondaryColor = body.secondaryColor;
    if (body.accentColor !== undefined) updates.accentColor = body.accentColor;
    if (body.adminEmail !== undefined) updates.adminEmail = body.adminEmail || null;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (body.slug !== undefined) {
      const newSlug = String(body.slug);
      if (!/^[a-z0-9-]+$/.test(newSlug)) {
        return res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens only" });
      }
      const [conflict] = await db.select().from(tenants).where(and(eq(tenants.slug, newSlug))).limit(1);
      if (conflict && conflict.id !== id) {
        return res.status(409).json({ error: "A tenant with this slug already exists" });
      }
      updates.slug = newSlug;
    }

    const [tenant] = await db.update(tenants).set(updates).where(eq(tenants.id, id)).returning();
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    return res.json(tenant);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update tenant" });
  }
});

router.delete("/tenants/:id", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(tenants).where(eq(tenants.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

router.post("/tenants/:id/invite", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    const inviteLink = `/t/${tenant.slug}/sign-up`;
    return res.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      slug: tenant.slug,
      inviteLink,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate invite link" });
  }
});

router.post("/tenants/:id/assign-user", requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const tenantId = parseInt(String(req.params.id));
    // Was `clerkId`; the body field is now the local user id. `userId` is also
    // still accepted under the old name so an in-flight admin tab does not 400.
    const body = req.body as { userId?: string; clerkId?: string };
    const userId = body.userId ?? body.clerkId;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [updated] = await db.update(users)
      .set({ tenantId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to assign user to tenant" });
  }
});

export default router;
