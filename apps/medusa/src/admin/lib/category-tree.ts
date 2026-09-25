export type AdminCategory = {
  id: string;
  name: string;
  handle: string;
  parent_category_id: string | null;
  metadata: Record<string, unknown> | null;
};
export type CategorySection = { id: string; label: string; children: { id: string; label: string }[] };

function label(c: AdminCategory): string {
  const ar = typeof c.metadata?.name_ar === "string" ? c.metadata.name_ar : "";
  return ar ? `${ar} / ${c.name}` : c.name;
}

/** Book sections (top-level categories marked darnozom=book) with their children. */
export function buildCategorySections(categories: AdminCategory[]): CategorySection[] {
  return categories
    .filter((c) => c.parent_category_id === null && c.metadata?.darnozom === "book")
    .map((s) => ({
      id: s.id,
      label: label(s),
      children: categories.filter((c) => c.parent_category_id === s.id).map((c) => ({ id: c.id, label: label(c) })),
    }));
}
