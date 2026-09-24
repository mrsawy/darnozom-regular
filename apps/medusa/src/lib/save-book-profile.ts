import type { MedusaContainer } from "@medusajs/framework/types";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";
import type { BookProfileInput } from "./book-input";
import {
  BOOK_CATALOG_MODULE,
  upsertBookProfile,
  type BookProfileRepo,
  type BookProfileRow,
} from "../modules/book-catalog";

export class BookNotFoundError extends Error {
  constructor(productId: string) {
    super(`Book ${productId} not found`);
  }
}

export type SaveProfileDeps = {
  repo: BookProfileRepo;
  getProduct(id: string): Promise<{ id: string; metadata: Record<string, unknown> | null; category_ids: string[] } | null>;
  updateProduct(id: string, update: { metadata?: Record<string, unknown>; category_ids?: string[] }): Promise<void>;
};

/**
 * Saves the profile and keeps two product fields in step with it:
 * `metadata.author` (read by product cards and the storefront admin list)
 * and the product's categories (the primary category is always assigned, so
 * category filters find the book).
 */
export async function saveBookProfile(
  deps: SaveProfileDeps,
  productId: string,
  input: BookProfileInput,
): Promise<BookProfileRow> {
  const product = await deps.getProduct(productId);
  if (!product) throw new BookNotFoundError(productId);
  const row = await upsertBookProfile(deps.repo, productId, input);

  const update: { metadata?: Record<string, unknown>; category_ids?: string[] } = {
    metadata: { ...(product.metadata ?? {}), author: input.authors.join("، ") },
  };
  if (input.primary_category_id && !product.category_ids.includes(input.primary_category_id)) {
    update.category_ids = [...product.category_ids, input.primary_category_id];
  }
  await deps.updateProduct(productId, update);
  return row;
}

export function makeSaveProfileDeps(container: MedusaContainer): SaveProfileDeps {
  const query = container.resolve("query");
  return {
    repo: container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo,
    async getProduct(id) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "metadata", "categories.id"],
        filters: { id },
      });
      const p = data[0] as { id: string; metadata: Record<string, unknown> | null; categories?: { id: string }[] } | undefined;
      return p ? { id: p.id, metadata: p.metadata, category_ids: (p.categories ?? []).map((c) => c.id) } : null;
    },
    async updateProduct(id, update) {
      await updateProductsWorkflow(container).run({ input: { products: [{ id, ...update }] } });
    },
  };
}
