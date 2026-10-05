import { Router } from "express";
import { z } from "zod";
import { CONTENT_AREAS, CONTENT_TYPES } from "../../lib/cms/schemas";
import { getHome, getPublishedBySlug, getRelated, listPublished } from "../../lib/cms/repo";

const router = Router();

const listQuery = z.object({
  type: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.enum(CONTENT_TYPES)).min(1)),
  area: z.enum(CONTENT_AREAS).optional(),
  kind: z.string().max(40).optional(),
  region: z.string().max(40).optional(),
  when: z.enum(["upcoming", "past"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

router.get("/cms/items", async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
  const { type, ...rest } = parsed.data;
  try {
    return res.json(await listPublished({ types: type, ...rest }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list content" });
  }
});

router.get("/cms/items/by-slug/:slug", async (req, res) => {
  try {
    const item = await getPublishedBySlug(String(req.params.slug));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json({ item, related: await getRelated(item) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load content" });
  }
});

router.get("/cms/home", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json(await getHome());
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load home content" });
  }
});

export default router;
