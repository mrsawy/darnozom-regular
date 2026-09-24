import type { MedusaContainer } from "@medusajs/framework/types";
import {
  createProductCategoriesWorkflow,
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { BOOK_CATALOG_MODULE, BookProfileConflictError, upsertBookProfile } from "../modules/book-catalog";
import type BookCatalogModuleService from "../modules/book-catalog/service";
import { seedBookCatalog, type CategoryRow } from "../lib/seed-book-catalog";

// Run: cd apps/medusa && npx medusa exec ./src/scripts/seed-book-catalog.ts
// Idempotent — safe to re-run (see seed-book-catalog.test.ts).
export default async function ({ container }: { container: MedusaContainer }) {
  const query = container.resolve("query");
  const profiles = container.resolve<BookCatalogModuleService>(BOOK_CATALOG_MODULE);
  const bookTypeId = process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim();

  const report = await seedBookCatalog({
    async listCategories() {
      const { data } = await query.graph({
        entity: "product_category",
        fields: ["id", "handle", "name", "parent_category_id", "metadata"],
      });
      return data as CategoryRow[];
    },
    async createCategory(input) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [{ ...input, is_active: true, is_internal: false }] },
      });
      return result[0] as unknown as CategoryRow;
    },
    async updateCategory(id, update) {
      await updateProductCategoriesWorkflow(container).run({ input: { selector: { id }, update } });
    },
    async deleteCategory(id) {
      await deleteProductCategoriesWorkflow(container).run({ input: [id] });
    },
    async listProductIdsInCategory(categoryId) {
      const { data } = await query.graph({
        entity: "product_category",
        fields: ["id", "products.id"],
        filters: { id: categoryId },
      });
      return ((data[0]?.products ?? []) as { id: string }[]).map((p) => p.id);
    },
    async getProductCategoryIds(productId) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "categories.id"],
        filters: { id: productId },
      });
      return ((data[0]?.categories ?? []) as { id: string }[]).map((c) => c.id);
    },
    async setProductCategoryIds(productId, ids) {
      await updateProductsWorkflow(container).run({
        input: { products: [{ id: productId, category_ids: ids }] },
      });
    },
    async listBookProducts() {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "metadata", "categories.id", "variants.metadata"],
        ...(bookTypeId ? { filters: { type_id: bookTypeId } } : {}),
      });
      return (data as Array<{
        id: string;
        metadata: Record<string, unknown> | null;
        categories?: { id: string }[];
        variants?: { metadata?: Record<string, unknown> | null }[];
      }>).map((p) => ({
        id: p.id,
        metadata: p.metadata,
        category_ids: (p.categories ?? []).map((c) => c.id),
        has_digital: (p.variants ?? []).some((v) => v.metadata?.kind === "digital"),
      }));
    },
    async hasProfile(productId) {
      const rows = await profiles.listBookProfiles({ product_id: productId });
      return rows.length > 0;
    },
    async upsertProfile(productId, input) {
      try {
        await upsertBookProfile(profiles as never, productId, input);
      } catch (err) {
        // Two legacy books with the same ISBN: keep the second without it.
        if (!(err instanceof BookProfileConflictError)) throw err;
        console.warn(`seed-book-catalog: ${productId}: ${err.message} — saved without ISBN`);
        await upsertBookProfile(profiles as never, productId, { ...input, isbn: null });
      }
    },
    log: (m) => console.log(m),
  });

  console.log("seed-book-catalog:", JSON.stringify(report));
}
