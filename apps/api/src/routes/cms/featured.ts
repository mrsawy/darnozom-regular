import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/adminAuth";
import { featuredSlideInput } from "../../lib/cms/schemas";
import { createSlide, deleteSlide, listSlidesAdmin, reorderSlides, updateSlide } from "../../lib/cms/repo";

const router = Router();
const orderBody = z.object({ ids: z.array(z.number().int().positive()).max(100) });

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/admin/cms/featured", requireAdmin, async (_req, res) => {
  try {
    return res.json(await listSlidesAdmin());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list slides" });
  }
});

router.post("/admin/cms/featured", requireAdmin, async (req, res) => {
  const parsed = featuredSlideInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid slide", issues: parsed.error.issues });
  try {
    return res.status(201).json(await createSlide(parsed.data));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create slide" });
  }
});

// Must be registered before "/:id" so "order" is not parsed as an id.
router.put("/admin/cms/featured/order", requireAdmin, async (req, res) => {
  const parsed = orderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order", issues: parsed.error.issues });
  try {
    await reorderSlides(parsed.data.ids);
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reorder slides" });
  }
});

router.put("/admin/cms/featured/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const parsed = featuredSlideInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid slide", issues: parsed.error.issues });
  const row = await updateSlide(id, parsed.data);
  return row ? res.json(row) : res.status(404).json({ error: "Not found" });
});

router.delete("/admin/cms/featured/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  return (await deleteSlide(id)) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

export default router;
