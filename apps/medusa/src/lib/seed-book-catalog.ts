import { BOOK_TAXONOMY, LEGACY_CATEGORY_MOVES } from "./book-taxonomy";
import type { BookProfileInput } from "./book-input";
import { isValidIsbn, normalizeIsbn } from "./book-text";

export type CategoryRow = {
  id: string;
  handle: string;
  name: string;
  parent_category_id: string | null;
  metadata: Record<string, unknown> | null;
};

export interface SeedDeps {
  listCategories(): Promise<CategoryRow[]>;
  createCategory(input: Omit<CategoryRow, "id"> & { rank: number }): Promise<CategoryRow>;
  updateCategory(
    id: string,
    update: { parent_category_id?: string | null; metadata?: Record<string, unknown> },
  ): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  listProductIdsInCategory(categoryId: string): Promise<string[]>;
  getProductCategoryIds(productId: string): Promise<string[]>;
  setProductCategoryIds(productId: string, ids: string[]): Promise<void>;
  listBookProducts(): Promise<
    Array<{ id: string; metadata: Record<string, unknown> | null; category_ids: string[]; has_digital: boolean }>
  >;
  hasProfile(productId: string): Promise<boolean>;
  /** Writes the row as-is (legacy books may have no author yet). */
  upsertProfile(productId: string, input: BookProfileInput): Promise<void>;
  log(message: string): void;
}

export type SeedReport = {
  createdCategories: number;
  mergedCategories: number;
  reparentedCategories: number;
  createdProfiles: number;
};

function splitAuthors(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[،,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function seedBookCatalog(deps: SeedDeps): Promise<SeedReport> {
  const report: SeedReport = { createdCategories: 0, mergedCategories: 0, reparentedCategories: 0, createdProfiles: 0 };
  const byHandle = new Map((await deps.listCategories()).map((c) => [c.handle, c]));

  async function ensure(
    node: { handle: string; name: string; name_ar: string },
    parentId: string | null,
    rank: number,
  ): Promise<CategoryRow> {
    const existing = byHandle.get(node.handle);
    if (existing) return existing; // never rename/move what staff may have edited
    const created = await deps.createCategory({
      handle: node.handle,
      name: node.name,
      parent_category_id: parentId,
      rank,
      metadata: { darnozom: "book", name_ar: node.name_ar },
    });
    byHandle.set(created.handle, created);
    report.createdCategories++;
    return created;
  }

  // 1. Sections, then subcategories. A legacy category whose handle is also a
  //    taxonomy child (digital-transformation) is found, not duplicated.
  for (const [i, section] of BOOK_TAXONOMY.entries()) {
    const s = await ensure(section, null, i);
    for (const [j, child] of section.children.entries()) {
      await ensure(child, s.id, j);
    }
  }

  // 2. Legacy categories.
  for (const move of LEGACY_CATEGORY_MOVES) {
    const old = byHandle.get(move.handle);
    if (!old) continue;
    if (move.action === "merge") {
      const target = byHandle.get(move.into)!;
      if (old.id === target.id) continue;
      for (const productId of await deps.listProductIdsInCategory(old.id)) {
        const ids = await deps.getProductCategoryIds(productId);
        const next = [...new Set([...ids.filter((id) => id !== old.id), target.id])];
        await deps.setProductCategoryIds(productId, next);
      }
      await deps.deleteCategory(old.id);
      byHandle.delete(old.handle);
      report.mergedCategories++;
      deps.log(`merged category ${move.handle} into ${move.into}`);
    } else {
      const parent = byHandle.get(move.under)!;
      if (old.parent_category_id === parent.id) continue;
      const taxonomyNode = BOOK_TAXONOMY.flatMap((s) => s.children).find((c) => c.handle === move.handle);
      await deps.updateCategory(old.id, {
        parent_category_id: parent.id,
        metadata: {
          ...(old.metadata ?? {}),
          darnozom: "book",
          ...(taxonomyNode && !old.metadata?.name_ar ? { name_ar: taxonomyNode.name_ar } : {}),
        },
      });
      old.parent_category_id = parent.id;
      report.reparentedCategories++;
      deps.log(`moved category ${move.handle} under ${move.under}`);
    }
  }

  // 3. Profiles for books that don't have one yet, from legacy metadata.
  for (const product of await deps.listBookProducts()) {
    if (await deps.hasProfile(product.id)) continue;
    const meta = product.metadata ?? {};
    const isbn = typeof meta.isbn === "string" && isValidIsbn(meta.isbn) ? normalizeIsbn(meta.isbn) : null;
    const language = meta.language === "en" || meta.language === "both" ? meta.language : "ar";
    await deps.upsertProfile(product.id, {
      authors: splitAuthors(meta.author),
      editors: [],
      translators: [],
      publisher: null,
      isbn,
      external_id: null,
      publication_year: null,
      edition_number: null,
      pages: typeof meta.pages === "number" && meta.pages > 0 ? meta.pages : null,
      volumes: 1,
      language,
      primary_category_id: product.category_ids[0] ?? null,
      keywords: [],
      target_audience: null,
      table_of_contents: null,
      // An existing digital edition means the store already sells it digitally.
      digital_rights: product.has_digital,
    });
    report.createdProfiles++;
  }

  return report;
}
