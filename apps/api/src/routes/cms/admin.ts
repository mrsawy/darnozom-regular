import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/adminAuth";
import { CONTENT_STATUSES, CONTENT_TYPES, parseContentItem } from "../../lib/cms/schemas";
import {
  adminList,
  createItem,
  deleteItem,
  getItemById,
  SlugConflictError,
  TypeChangeError,
  updateItem,
} from "../../lib/cms/repo";

const router = Router();

const listQuery = z.object({
  type: z.enum(CONTENT_TYPES),
  status: z.enum(CONTENT_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/admin/cms/items", requireAdmin, async (req, res) => {
  const q = listQuery.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "Invalid query", issues: q.error.issues });
  try {
    return res.json(await adminList(q.data));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list content" });
  }
});

router.get("/admin/cms/items/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const item = await getItemById(id);
  return item ? res.json(item) : res.status(404).json({ error: "Not found" });
});

router.post("/admin/cms/items", requireAdmin, async (req, res) => {
  const parsed = parseContentItem(req.body);
  if (!parsed.ok) return res.status(400).json({ error: "Invalid content", issues: parsed.issues });
  try {
    return res.status(201).json(await createItem(parsed.value));
  } catch (err) {
    if (err instanceof SlugConflictError) return res.status(409).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Failed to create content" });
  }
});

router.put("/admin/cms/items/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const parsed = parseContentItem(req.body);
  if (!parsed.ok) return res.status(400).json({ error: "Invalid content", issues: parsed.issues });
  try {
    const item = await updateItem(id, parsed.value);
    return item ? res.json(item) : res.status(404).json({ error: "Not found" });
  } catch (err) {
    if (err instanceof SlugConflictError) return res.status(409).json({ error: err.message });
    if (err instanceof TypeChangeError) return res.status(400).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Failed to update content" });
  }
});

router.delete("/admin/cms/items/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  return (await deleteItem(id)) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

export default router;
