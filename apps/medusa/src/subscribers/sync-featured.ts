import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import {
  computeFeaturedSyncPatch,
  FEATURED_TAG_VALUE,
} from "../lib/featured-sync";

type ProductModuleLike = {
  listProductTags: (filters: { value?: string }, config?: { take?: number }) => Promise<
    Array<{ id: string; value: string }>
  >;
  createProductTags: (data: Array<{ value: string }>) => Promise<Array<{ id: string; value: string }>>;
  updateProducts: (
    id: string,
    data: { metadata?: Record<string, unknown>; tag_ids?: string[] },
  ) => Promise<unknown>;
};

async function ensureFeaturedTagId(product: ProductModuleLike): Promise<string> {
  const existing = await product.listProductTags(
    { value: FEATURED_TAG_VALUE },
    { take: 1 },
  );
  if (existing[0]?.id) return existing[0].id;
  // Medusa tag values are typically matched case-insensitively in Admin UI,
  // but list filters are exact — also try capitalized.
  const capitalized = await product.listProductTags({ value: "Featured" }, { take: 1 });
  if (capitalized[0]?.id) return capitalized[0].id;
  const created = await product.createProductTags([{ value: FEATURED_TAG_VALUE }]);
  return created[0].id;
}

export default async function syncFeaturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger");
  const query = container.resolve("query");
  const product = container.resolve(Modules.PRODUCT) as ProductModuleLike;

  try {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "metadata", "tags.id", "tags.value"],
      filters: { id: event.data.id },
    });
    const row = data[0] as
      | {
          id: string;
          metadata?: Record<string, unknown> | null;
          tags?: Array<{ id: string; value?: string | null }> | null;
        }
      | undefined;
    if (!row) return;

    const featuredTagId = await ensureFeaturedTagId(product);
    const patch = computeFeaturedSyncPatch({
      tags: row.tags ?? [],
      metadata: row.metadata,
      featuredTagId,
    });
    if (!patch) return;

    await product.updateProducts(row.id, {
      metadata: patch.metadata,
      tag_ids: patch.tag_ids,
    });
  } catch (err) {
    logger.error(`featured sync failed for product ${event.data.id}`, err);
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
