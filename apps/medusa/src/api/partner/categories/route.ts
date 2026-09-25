import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requirePartnerKey } from "../../../lib/partner-auth";

/** The live classification (staff may have renamed/added categories). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!requirePartnerKey(req, res)) return;
  const { data } = await req.scope.resolve("query").graph({
    entity: "product_category",
    fields: ["id", "handle", "name", "parent_category_id", "rank", "metadata"],
  });
  const cats = data as Array<{ id: string; handle: string; name: string; parent_category_id: string | null; rank: number | null; metadata: Record<string, unknown> | null }>;
  const view = (c: (typeof cats)[number]) => ({ handle: c.handle, name: c.name, name_ar: (c.metadata?.name_ar as string) ?? null });
  const byRank = (a: (typeof cats)[number], b: (typeof cats)[number]) => (a.rank ?? 0) - (b.rank ?? 0);
  const sections = cats
    .filter((c) => c.parent_category_id === null && c.metadata?.darnozom === "book")
    .sort(byRank)
    .map((s) => ({ ...view(s), subcategories: cats.filter((c) => c.parent_category_id === s.id).sort(byRank).map(view) }));
  return res.json({ sections });
}
