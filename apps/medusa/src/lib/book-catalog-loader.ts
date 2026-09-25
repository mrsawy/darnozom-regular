import type { MedusaContainer } from "@medusajs/framework/types";
import { BOOK_CATALOG_MODULE, type BookProfileRepo, type BookProfileRow } from "../modules/book-catalog";
import type { BookSearchEntry, CategoryNode } from "./book-search";

type Graph = (args: unknown) => Promise<{ data: unknown[] }>;
type RawVariant = { title?: string | null; metadata?: Record<string, unknown> | null };
type RawProduct = {
  id: string;
  title: string;
  subtitle: string | null;
  created_at: string | Date;
  sales_channels?: { id: string }[];
  categories?: { id: string }[];
  variants?: RawVariant[];
};

function editionOf(v: RawVariant): "paper" | "digital" | null {
  const k = v.metadata?.kind;
  if (k === "paper" || k === "digital") return k;
  const t = (v.title ?? "").trim().toLowerCase();
  if (["paper", "ورقي", "print"].includes(t)) return "paper";
  if (["digital", "رقمي", "الكتروني", "إلكتروني", "pdf"].includes(t)) return "digital";
  return null;
}

/** The published book catalog visible to one storefront (sales channel). */
export async function loadBookCatalog(
  deps: { graph: Graph; listProfiles(productIds: string[]): Promise<BookProfileRow[]> },
  opts: { salesChannelIds: string[]; bookTypeId?: string },
): Promise<{ entries: BookSearchEntry[]; categories: CategoryNode[] }> {
  const [{ data: products }, { data: cats }] = await Promise.all([
    deps.graph({
      entity: "product",
      fields: ["id", "title", "subtitle", "created_at", "sales_channels.id", "categories.id", "variants.title", "variants.metadata"],
      filters: { status: "published", ...(opts.bookTypeId ? { type_id: opts.bookTypeId } : {}) },
    }),
    deps.graph({ entity: "product_category", fields: ["id", "name", "handle", "parent_category_id", "metadata"] }),
  ]);

  const visible = (products as RawProduct[]).filter(
    (p) => !opts.salesChannelIds.length || (p.sales_channels ?? []).some((s) => opts.salesChannelIds.includes(s.id)),
  );
  const profiles = new Map((await deps.listProfiles(visible.map((p) => p.id))).map((r) => [r.product_id, r]));

  const entries: BookSearchEntry[] = visible.map((p) => ({
    product_id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    created_at: new Date(p.created_at).toISOString(),
    category_ids: (p.categories ?? []).map((c) => c.id),
    formats: [...new Set((p.variants ?? []).filter((v) => v.metadata?.sale_enabled !== false).map(editionOf).filter((k): k is "paper" | "digital" => !!k))],
    profile: profiles.get(p.id) ?? null,
  }));

  const categories: CategoryNode[] = (cats as Array<{ id: string; name: string; handle: string; parent_category_id: string | null; metadata: Record<string, unknown> | null }>).map((c) => ({
    id: c.id,
    name: c.name,
    name_ar: typeof c.metadata?.name_ar === "string" ? c.metadata.name_ar : null,
    handle: c.handle,
    parent_category_id: c.parent_category_id,
  }));

  return { entries, categories };
}

export function makeCatalogDeps(container: MedusaContainer) {
  const query = container.resolve("query");
  const repo = container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo;
  return {
    graph: (args: unknown) => query.graph(args as never) as Promise<{ data: unknown[] }>,
    listProfiles: (ids: string[]) => (ids.length ? repo.listBookProfiles({ product_id: ids }) : Promise.resolve([])),
  };
}
