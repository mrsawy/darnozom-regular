import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/adminAuth";
import {
  AreaConflictError,
  AreaInUseError,
  createArea,
  deleteArea,
  listAreas,
  reorderAreas,
  updateArea,
} from "../../lib/cms/areas";

const router = Router();

const base = {
  labelAr: z.string().trim().min(1, "Arabic label is required").max(200),
  labelEn: z.string().trim().max(200).optional().default(""),
  isActive: z.boolean().optional().default(true),
};
const createInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+([_-][a-z0-9]+)*$/, "Slug may contain only a-z, 0-9, _ and -"),
  ...base,
});
const updateInput = z.object(base);
const orderInput = z.object({ ids: z.array(z.number().int().positive()).max(200) });
const parseId = (raw: unknown) => (Number.isInteger(Number(raw)) && Number(raw) > 0 ? Number(raw) : null);

// Public: every area incl. inactive (so existing items still resolve their label);
// clients filter on isActive for pickers and filters.
router.get("/cms/areas", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json(await listAreas());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load areas" });
  }
});

router.get("/admin/cms/areas", requireAdmin, async (_req, res) => {
  try {
    return res.json(await listAreas());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load areas" });
  }
});

router.post("/admin/cms/areas", requireAdmin, async (req, res) => {
  const p = createInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid area", issues: p.error.issues });
  try {
    return res.status(201).json(await createArea(p.data));
  } catch (err) {
    if (err instanceof AreaConflictError) return res.status(409).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Failed to create area" });
  }
});

router.put("/admin/cms/areas/order", requireAdmin, async (req, res) => {
  const p = orderInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid order" });
  await reorderAreas(p.data.ids);
  return res.status(204).end();
});

router.put("/admin/cms/areas/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const p = updateInput.safeParse(req.body);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  if (!p.success) return res.status(400).json({ error: "Invalid area", issues: p.error.issues });
  const row = await updateArea(id, p.data);
  return row ? res.json(row) : res.status(404).json({ error: "Not found" });
});

router.delete("/admin/cms/areas/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    return (await deleteArea(id)) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
  } catch (err) {
    if (err instanceof AreaInUseError) return res.status(409).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: "Failed to delete area" });
  }
});

export default router;
