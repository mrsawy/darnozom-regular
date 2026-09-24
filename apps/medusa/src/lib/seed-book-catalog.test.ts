import { describe, it, expect } from "vitest";
import { seedBookCatalog, type CategoryRow, type SeedDeps } from "./seed-book-catalog";
import { BOOK_TAXONOMY } from "./book-taxonomy";

type Product = {
  id: string;
  metadata: Record<string, unknown> | null;
  category_ids: string[];
  has_digital: boolean;
};

function world(initialCategories: CategoryRow[], products: Product[]) {
  const categories = [...initialCategories];
  const profiles = new Map<string, Record<string, unknown>>();
  let seq = 0;
  const deps: SeedDeps = {
    async listCategories() {
      return categories.map((c) => ({ ...c }));
    },
    async createCategory(input) {
      const row = { id: `pcat_${++seq}`, ...input };
      categories.push(row);
      return row;
    },
    async updateCategory(id, update) {
      const c = categories.find((x) => x.id === id)!;
      Object.assign(c, update);
    },
    async deleteCategory(id) {
      categories.splice(categories.findIndex((c) => c.id === id), 1);
    },
    async listProductIdsInCategory(categoryId) {
      return products.filter((p) => p.category_ids.includes(categoryId)).map((p) => p.id);
    },
    async getProductCategoryIds(productId) {
      return products.find((p) => p.id === productId)!.category_ids;
    },
    async setProductCategoryIds(productId, ids) {
      products.find((p) => p.id === productId)!.category_ids = ids;
    },
    async listBookProducts() {
      return products.map((p) => ({ ...p }));
    },
    async hasProfile(productId) {
      return profiles.has(productId);
    },
    async upsertProfile(productId, input) {
      profiles.set(productId, input as unknown as Record<string, unknown>);
    },
    log() {},
  };
  return { deps, categories, products, profiles };
}

const legacy: CategoryRow[] = [
  { id: "pcat_shariah", handle: "shariah", name: "Shariah", parent_category_id: null, metadata: { darnozom: "book" } },
  { id: "pcat_mgmt", handle: "management", name: "Management", parent_category_id: null, metadata: { darnozom: "book" } },
  { id: "pcat_dt", handle: "digital-transformation", name: "Digital Transformation", parent_category_id: null, metadata: { darnozom: "book" } },
];

describe("seedBookCatalog", () => {
  it("creates 8 sections with their subcategories, marked as book categories", async () => {
    const w = world([], []);
    await seedBookCatalog(w.deps);
    const sections = w.categories.filter((c) => c.parent_category_id === null);
    expect(sections.map((s) => s.handle)).toEqual(BOOK_TAXONOMY.map((s) => s.handle));
    const law = sections.find((s) => s.handle === "islamic-law-thought")!;
    expect(law.metadata).toMatchObject({ darnozom: "book", name_ar: "الشريعة والفكر الإسلامي" });
    const lawChildren = w.categories.filter((c) => c.parent_category_id === law.id);
    expect(lawChildren.length).toBe(BOOK_TAXONOMY[0].children.length);
  });

  it("moves books from merged legacy categories and re-parents Digital Transformation", async () => {
    const w = world(legacy, [
      { id: "prod_1", metadata: { author: "أحمد" }, category_ids: ["pcat_shariah"], has_digital: false },
      { id: "prod_2", metadata: null, category_ids: ["pcat_mgmt", "pcat_dt"], has_digital: true },
    ]);
    const report = await seedBookCatalog(w.deps);
    const byHandle = (h: string) => w.categories.find((c) => c.handle === h);
    expect(byHandle("shariah")).toBeUndefined();
    expect(byHandle("management")).toBeUndefined();
    expect(w.products[0].category_ids).toEqual([byHandle("islamic-law-thought")!.id]);
    expect(w.products[1].category_ids.sort()).toEqual(
      ["pcat_dt", byHandle("management-leadership")!.id].sort(),
    );
    expect(byHandle("digital-transformation")!.parent_category_id).toBe(
      byHandle("public-administration")!.id,
    );
    expect(report).toMatchObject({ mergedCategories: 2, reparentedCategories: 1 });
  });

  it("is safe to run twice and keeps staff renames", async () => {
    const w = world([], []);
    await seedBookCatalog(w.deps);
    const count = w.categories.length;
    const law = w.categories.find((c) => c.handle === "islamic-law-thought")!;
    law.name = "Shariah & Islamic Thought"; // staff rename in Medusa Admin
    const second = await seedBookCatalog(w.deps);
    expect(w.categories.length).toBe(count);
    expect(second.createdCategories).toBe(0);
    expect(w.categories.find((c) => c.handle === "islamic-law-thought")!.name).toBe(
      "Shariah & Islamic Thought",
    );
  });

  it("backfills a profile from legacy metadata for books that have none", async () => {
    const w = world(legacy, [
      {
        id: "prod_1",
        metadata: { author: "أحمد يوسف، محمد علي", language: "en", pages: 210, isbn: "978-0-306-40615-7" },
        category_ids: ["pcat_shariah"],
        has_digital: true,
      },
    ]);
    const report = await seedBookCatalog(w.deps);
    expect(report.createdProfiles).toBe(1);
    expect(w.profiles.get("prod_1")).toMatchObject({
      authors: ["أحمد يوسف", "محمد علي"],
      language: "en",
      pages: 210,
      isbn: "9780306406157",
      digital_rights: true,
      primary_category_id: w.categories.find((c) => c.handle === "islamic-law-thought")!.id,
    });
    const again = await seedBookCatalog(w.deps);
    expect(again.createdProfiles).toBe(0);
  });
});
