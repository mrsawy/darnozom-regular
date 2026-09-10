import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import {
  CreateDocumentBody,
  UpdateDocumentBody,
  GetDocumentParams,
  UpdateDocumentParams,
  DeleteDocumentParams,
  ListDocumentsQueryParams,
} from "@workspace/api-zod";
import type { AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

function tenantFilter(req: AuthRequest) {
  if (req.isSuperAdmin && !req.userTenantId) return null;
  return req.userTenantId ?? null;
}

router.get("/documents", async (req: AuthRequest, res) => {
  try {
    const query = ListDocumentsQueryParams.safeParse(req.query);
    const tid = tenantFilter(req);
    const where = tid != null ? eq(documentsTable.tenantId, tid) : isNull(documentsTable.tenantId);
    const docs = await db.select().from(documentsTable).where(where).orderBy(documentsTable.createdAt);
    let result = docs;
    if (query.success) {
      if (query.data.category) result = result.filter(d => d.category === query.data.category);
      if (query.data.type) result = result.filter(d => d.type === query.data.type);
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ error: "Failed to list documents" });
  }
});

router.post("/documents", async (req: AuthRequest, res) => {
  try {
    const parsed = CreateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document data" });
      return;
    }
    const tid = tenantFilter(req);
    const [doc] = await db
      .insert(documentsTable)
      .values({
        ...parsed.data,
        tenantId: tid ?? undefined,
        tags: parsed.data.tags ?? "",
        updatedAt: new Date(),
      })
      .returning();
    res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.get("/documents/stats", async (req: AuthRequest, res) => {
  try {
    const tid = tenantFilter(req);
    const where = tid != null ? eq(documentsTable.tenantId, tid) : isNull(documentsTable.tenantId);
    const docs = await db.select().from(documentsTable).where(where);
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const doc of docs) {
      byCategory[doc.category] = (byCategory[doc.category] ?? 0) + 1;
      byType[doc.type] = (byType[doc.type] ?? 0) + 1;
    }
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyAdded = docs.filter(d => d.createdAt >= weekAgo).length;
    res.json({ total: docs.length, byCategory, byType, recentlyAdded });
  } catch (err) {
    req.log.error({ err }, "Failed to get document stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/documents/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = GetDocumentParams.parse({ id: Number(req.params.id) });
    const tid = tenantFilter(req);
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    if (tid != null && doc.tenantId !== tid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    return res.status(500).json({ error: "Failed to get document" });
  }
});

router.patch("/documents/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = UpdateDocumentParams.parse({ id: Number(req.params.id) });
    const tid = tenantFilter(req);
    const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (tid != null && existing.tenantId !== tid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const parsed = UpdateDocumentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [doc] = await db
      .update(documentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(documentsTable.id, id))
      .returning();
    if (!doc) { res.status(404).json({ error: "Not found" }); return; }
    return res.json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to update document");
    return res.status(500).json({ error: "Failed to update document" });
  }
});

router.delete("/documents/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = DeleteDocumentParams.parse({ id: Number(req.params.id) });
    const tid = tenantFilter(req);
    const [existing] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (tid != null && existing.tenantId !== tid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.delete(documentsTable).where(eq(documentsTable.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    return res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
