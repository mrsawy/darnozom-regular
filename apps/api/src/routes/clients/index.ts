import { Router } from "express";
import { db } from "@workspace/db";
import { clients, reports } from "@workspace/db";
import { eq, count, and, isNull } from "drizzle-orm";
import type { AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

function validateClient(body: Record<string, unknown>, partial = false) {
  const required = ["name", "organization", "industry", "challenges", "goals"];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string" || !(body[field] as string).trim()) {
        return { valid: false, error: `Field '${field}' is required` };
      }
    }
  }
  return { valid: true };
}

async function clientWithReportCount(client: typeof clients.$inferSelect) {
  const [row] = await db.select({ count: count() }).from(reports).where(eq(reports.clientId, client.id));
  return { ...client, reportCount: row?.count ?? 0 };
}

function tenantFilter(req: AuthRequest) {
  if (req.isSuperAdmin && !req.userTenantId) return null;
  return req.userTenantId ?? null;
}

router.get("/clients", async (req: AuthRequest, res) => {
  try {
    const tid = tenantFilter(req);
    if (req.userRole === "client") {
      if (!req.userClientId) {
        return res.json([]);
      }
      const where = tid != null
        ? and(eq(clients.id, req.userClientId), eq(clients.tenantId, tid))
        : eq(clients.id, req.userClientId);
      const [client] = await db.select().from(clients).where(where);
      if (!client) return res.json([]);
      return res.json([await clientWithReportCount(client)]);
    }
    const where = tid != null ? eq(clients.tenantId, tid) : isNull(clients.tenantId);
    const all = await db.select().from(clients).where(where).orderBy(clients.createdAt);
    const withCounts = await Promise.all(all.map(clientWithReportCount));
    return res.json(withCounts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list clients" });
  }
});

router.post("/clients", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const body = req.body as Record<string, string>;
    const check = validateClient(body);
    if (!check.valid) { res.status(400).json({ error: check.error }); return; }
    const { name, organization, industry, country, contactEmail, phoneNumber, challenges, goals, context } = body;
    const tid = tenantFilter(req);
    const [client] = await db.insert(clients).values({
      tenantId: tid ?? undefined,
      name, organization, industry,
      country: country || null,
      contactEmail: contactEmail || null,
      phoneNumber: phoneNumber || null,
      challenges, goals,
      context: context || null,
    }).returning();
    return res.status(201).json({ ...client, reportCount: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create client" });
  }
});

router.get("/clients/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    if (req.userRole === "client" && req.userClientId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const where = tid != null
      ? and(eq(clients.id, id), eq(clients.tenantId, tid))
      : eq(clients.id, id);
    const [client] = await db.select().from(clients).where(where);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
    return res.json(await clientWithReportCount(client));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get client" });
  }
});

router.patch("/clients/:id", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    const body = req.body as Record<string, string>;
    const check = validateClient(body, true);
    if (!check.valid) { res.status(400).json({ error: check.error }); return; }
    const { name, organization, industry, country, contactEmail, phoneNumber, challenges, goals, context } = body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (organization) updates.organization = organization;
    if (industry) updates.industry = industry;
    if (country !== undefined) updates.country = country || null;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail || null;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber || null;
    if (challenges) updates.challenges = challenges;
    if (goals) updates.goals = goals;
    if (context !== undefined) updates.context = context || null;
    const where = tid != null
      ? and(eq(clients.id, id), eq(clients.tenantId, tid))
      : eq(clients.id, id);
    const [client] = await db.update(clients)
      .set(updates)
      .where(where)
      .returning();
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
    return res.json(await clientWithReportCount(client));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update client" });
  }
});

router.delete("/clients/:id", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    const where = tid != null
      ? and(eq(clients.id, id), eq(clients.tenantId, tid))
      : eq(clients.id, id);
    await db.delete(clients).where(where);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete client" });
  }
});

router.get("/clients/:id/reports", async (req: AuthRequest, res) => {
  try {
    const clientId = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    if (req.userRole === "client" && req.userClientId !== clientId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const clientWhere = tid != null
      ? and(eq(clients.id, clientId), eq(clients.tenantId, tid))
      : eq(clients.id, clientId);
    const [client] = await db.select().from(clients).where(clientWhere);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
    const clientReports = await db.select().from(reports).where(eq(reports.clientId, clientId)).orderBy(reports.createdAt);
    return res.json(clientReports.map(r => ({
      ...r,
      clientName: client.name,
      clientOrganization: client.organization,
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list reports" });
  }
});

export default router;
