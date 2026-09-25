import type { MedusaContainer } from "@medusajs/framework/types";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

export const FORMAT_OPTION_TITLE = "Format";
export const PAPER_VALUE = "Paper";
export const DIGITAL_VALUE = "Digital";

export type CreateBookProductInput = {
  title: string;
  description?: string;
  status?: "draft" | "published";
  salesChannelId: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  paperPrice: number;
  digitalPrice: number;
  /** false → paper-only book: no Digital variant (digitalPrice ignored). Default true. */
  hasDigital?: boolean;
  /** false → digital-only book: no Paper variant (paperPrice ignored). Default true. */
  hasPaper?: boolean;
  subtitle?: string | null;
  paperInventoryQty?: number;
  currencyCode?: string;
  /** Storefront filter metadata (synced to product.metadata). */
  author?: string | null;
  language?: "ar" | "en" | "both" | null;
  /** Medusa product category ids (`pcat_…`) — drives storefront category filters. */
  categoryIds?: string[] | null;
  /** @deprecated Prefer categoryIds (Medusa product categories). */
  category?:
    "shariah" | "management" | "digital_transformation" | "other" | null;
  /** Test seam — production callers omit these. */
  __testCreateProductsWorkflow?: (container: MedusaContainer) => {
    run: (args: any) => Promise<{ result: any[] }>;
  };
  __testCreateInventoryLevelsWorkflow?: (container: MedusaContainer) => {
    run: (args: any) => Promise<{ result: any[] }>;
  };
  __testQuery?: {
    graph: (args: any) => Promise<{ data: any[] }>;
  };
};

export type CreateBookProductResult = {
  product: any;
  paperVariantId: string | null;
  digitalVariantId: string | null;
};

function requireBookTypeId(): string {
  const bookTypeId = process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID?.trim();
  if (!bookTypeId) {
    throw new Error(
      "MEDUSA_BOOK_PRODUCT_TYPE_ID is not configured. Set it to your Book product type id (ptyp_...).",
    );
  }
  return bookTypeId;
}

function slugSku(title: string, kind: "paper" | "digital"): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const stamp = Date.now().toString(36);
  return `book-${base || "item"}-${kind}-${stamp}`;
}

/**
 * Creates a Book-type Medusa product with an exclusive Format option and
 * Paper + Digital variants (metadata.kind set). Used by POST /admin/books
 * and kept in sync with the storefront's book-variants matching rules.
 */
export async function createBookProduct(
  container: MedusaContainer,
  input: CreateBookProductInput,
): Promise<CreateBookProductResult> {
  const bookTypeId = requireBookTypeId();
  const currency = (input.currencyCode || "egp").toLowerCase();
  const status = input.status === "published" ? "published" : "draft";

  if (!input.title?.trim()) {
    throw new Error("title is required");
  }
  if (!input.salesChannelId?.trim()) {
    throw new Error("salesChannelId is required");
  }
  const hasDigital = input.hasDigital !== false;
  const hasPaper = input.hasPaper !== false;
  if (!hasPaper && !hasDigital) {
    throw new Error("a book needs at least one edition (paper or digital)");
  }
  if (hasPaper && !(input.paperPrice > 0)) {
    throw new Error("paperPrice must be a positive number");
  }
  if (hasDigital && !(input.digitalPrice > 0)) {
    throw new Error(
      hasPaper
        ? "paperPrice and digitalPrice must be positive numbers"
        : "digitalPrice must be a positive number",
    );
  }

  const query = input.__testQuery ?? container.resolve("query");
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfileId = shippingProfiles[0]?.id as string | undefined;

  const images = [
    ...(input.thumbnailUrl ? [{ url: input.thumbnailUrl }] : []),
    ...(input.imageUrls ?? []).map((url) => ({ url })),
  ].filter((img, i, arr) => arr.findIndex((x) => x.url === img.url) === i);

  const metadata: Record<string, unknown> = {};
  if (input.author?.trim()) metadata.author = input.author.trim();
  if (input.language) metadata.language = input.language;
  // Keep legacy metadata.category for older products / admin list views.
  if (input.category) metadata.category = input.category;

  const categoryIds = (input.categoryIds ?? []).filter(Boolean);

  const createProducts =
    input.__testCreateProductsWorkflow ?? createProductsWorkflow;

  const { result } = await createProducts(container).run({
    input: {
      products: [
        {
          title: input.title.trim(),
          subtitle: input.subtitle?.trim() || undefined,
          description: input.description?.trim() || undefined,
          status,
          type_id: bookTypeId,
          thumbnail: input.thumbnailUrl || undefined,
          images: images.length ? images : undefined,
          shipping_profile_id: shippingProfileId,
          sales_channels: [{ id: input.salesChannelId }],
          ...(categoryIds.length ? { category_ids: categoryIds } : {}),
          ...(Object.keys(metadata).length ? { metadata } : {}),
          // Both values always exist so staff can add the other edition later
          // (Editions widget) without editing the option.
          options: [
            {
              title: FORMAT_OPTION_TITLE,
              values: [PAPER_VALUE, DIGITAL_VALUE],
              is_exclusive: true,
            },
          ],
          variants: [
            ...(hasPaper
              ? [
                  {
                    title: PAPER_VALUE,
                    sku: slugSku(input.title, "paper"),
                    options: { [FORMAT_OPTION_TITLE]: PAPER_VALUE },
                    prices: [{ amount: input.paperPrice, currency_code: currency }],
                    metadata: { kind: "paper" },
                    manage_inventory: true,
                    allow_backorder: false,
                  },
                ]
              : []),
            ...(hasDigital
              ? [
                  {
                    title: DIGITAL_VALUE,
                    sku: slugSku(input.title, "digital"),
                    options: { [FORMAT_OPTION_TITLE]: DIGITAL_VALUE },
                    prices: [
                      { amount: input.digitalPrice, currency_code: currency },
                    ],
                    metadata: { kind: "digital" },
                    manage_inventory: false,
                    allow_backorder: true,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  });

  const product = result[0];
  const paperVariant =
    product.variants?.find(
      (v: any) => v.metadata?.kind === "paper" || v.title === PAPER_VALUE,
    ) ?? null;
  const digitalVariant =
    product.variants?.find(
      (v: any) => v.metadata?.kind === "digital" || v.title === DIGITAL_VALUE,
    ) ?? null;

  const qty = input.paperInventoryQty;
  if (
    paperVariant?.id &&
    typeof qty === "number" &&
    Number.isFinite(qty) &&
    qty >= 0
  ) {
    try {
      await setPaperInventory(container, query, paperVariant.id, qty, input);
    } catch {
      // Product creation succeeded; inventory is best-effort. Admin can set
      // stock on the product page if the level write fails (e.g. no location).
    }
  }

  return {
    product,
    paperVariantId: paperVariant?.id ?? null,
    digitalVariantId: digitalVariant?.id ?? null,
  };
}

export async function setPaperInventory(
  container: MedusaContainer,
  query: { graph: (args: any) => Promise<{ data: any[] }> },
  paperVariantId: string,
  stockedQuantity: number,
  input: CreateBookProductInput,
) {
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "inventory_items.inventory_item_id"],
    filters: { id: paperVariantId },
  });
  const inventoryItemId =
    variants[0]?.inventory_items?.[0]?.inventory_item_id ??
    variants[0]?.inventory_items?.[0]?.id;
  if (!inventoryItemId) return;

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });
  const locationId = locations[0]?.id;
  if (!locationId) return;

  const createLevels =
    input.__testCreateInventoryLevelsWorkflow ?? createInventoryLevelsWorkflow;
  await createLevels(container).run({
    input: {
      inventory_levels: [
        {
          inventory_item_id: inventoryItemId,
          location_id: locationId,
          stocked_quantity: stockedQuantity,
        },
      ],
    },
  });
}
