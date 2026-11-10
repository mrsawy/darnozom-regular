import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middlewares/adminAuth";
import {
  clientLogoInput,
  createClientLogo,
  deleteClientLogo,
  getPublicClientLogo,
  listClientLogosAdmin,
  listPublicClientLogos,
  reorderClientLogos,
  updateClientLogo,
} from "../../lib/clientLogos/repo";

const router = Router();
const orderBody = z.object({ ids: z.array(z.number().int().positive()).max(200) });

function parseId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/cms/client-logos", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json(await listPublicClientLogos());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load client logos" });
  }
});

router.get("/cms/client-logos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const row = await getPublicClientLogo(id);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.set("Cache-Control", "public, max-age=60");
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load client" });
  }
});

router.get("/admin/cms/client-logos", requireAdmin, async (_req, res) => {
  try {
    return res.json(await listClientLogosAdmin());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list client logos" });
  }
});

router.post("/admin/cms/client-logos", requireAdmin, async (req, res) => {
  const parsed = clientLogoInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid logo", issues: parsed.error.issues });
  try {
    return res.status(201).json(await createClientLogo(parsed.data));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create logo" });
  }
});

// Registered before "/:id" so "order" is not parsed as an id.
router.put("/admin/cms/client-logos/order", requireAdmin, async (req, res) => {
  const parsed = orderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid order", issues: parsed.error.issues });
  try {
    await reorderClientLogos(parsed.data.ids);
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reorder logos" });
  }
});

router.put("/admin/cms/client-logos/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const parsed = clientLogoInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid logo", issues: parsed.error.issues });
  try {
    const row = await updateClientLogo(id, parsed.data);
    return row ? res.json(row) : res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update logo" });
  }
});

router.delete("/admin/cms/client-logos/:id", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    return (await deleteClientLogo(id)) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete logo" });
  }
});

export default router;
