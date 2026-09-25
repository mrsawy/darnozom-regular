import type { MedusaContainer } from "@medusajs/framework/types";
import { createProductVariantsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";
import { BOOK_CATALOG_MODULE, type BookProfileRepo } from "../modules/book-catalog";
import { setPaperInventory } from "./create-book-product";

type Kind = "paper" | "digital";
const VALUE: Record<Kind, string> = { paper: "Paper", digital: "Digital" };

export type EditionProduct = {
  id: string;
  options: { title: string; values: { value: string }[] }[];
  variants: {
    id: string;
    title: string;
    metadata: Record<string, unknown> | null;
    manage_inventory: boolean;
    prices: { amount: number; currency_code: string }[];
  }[];
};

export type Edition = {
  variant_id: string;
  kind: Kind;
  title: string;
  price: number | null;
  sale_enabled: boolean;
  manage_inventory: boolean;
};

export type EditionDeps = {
  getProduct(id: string): Promise<EditionProduct | null>;
  getProfile(productId: string): Promise<{ digital_rights: boolean } | null>;
  createVariant(input: Record<string, unknown>): Promise<{ id: string }>;
  setStock(variantId: string, qty: number): Promise<void>;
  updateVariantMetadata(variantId: string, metadata: Record<string, unknown>): Promise<void>;
};

export class EditionError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message);
  }
}

function kindOf(v: EditionProduct["variants"][number]): Kind | null {
  const k = v.metadata?.kind;
  return k === "paper" || k === "digital" ? k : null;
}

export function listEditions(product: EditionProduct): Edition[] {
  return product.variants.flatMap((v) => {
    const kind = kindOf(v);
    if (!kind) return [];
    const egp = v.prices.find((p) => p.currency_code.toLowerCase() === "egp");
    return [{
      variant_id: v.id,
      kind,
      title: v.title,
      price: egp ? egp.amount : null,
      sale_enabled: v.metadata?.sale_enabled !== false,
      manage_inventory: v.manage_inventory,
    }];
  });
}

async function loadProduct(deps: EditionDeps, productId: string): Promise<EditionProduct> {
  const product = await deps.getProduct(productId);
  if (!product) throw new EditionError(404, "Book not found");
  return product;
}

export async function addEdition(
  deps: EditionDeps,
  productId: string,
  input: { kind: Kind; price: number; stock?: number },
): Promise<{ variant_id: string }> {
  if (!(input.price > 0)) throw new EditionError(400, "price must be a positive number");
  const product = await loadProduct(deps, productId);
  if (product.variants.some((v) => kindOf(v) === input.kind)) {
    throw new EditionError(409, `This book already has a ${input.kind} edition`);
  }
  if (input.kind === "digital") {
    const profile = await deps.getProfile(productId);
    if (!profile?.digital_rights) {
      throw new EditionError(409, "Turn on 'Digital distribution rights' in Book details before adding a digital edition");
    }
  }
  const format = product.options.find(
    (o) => o.title.trim().toLowerCase() === "format" && o.values.some((v) => v.value === VALUE[input.kind]),
  );
  if (!format) {
    throw new EditionError(409, `This product has no "Format" option with the value "${VALUE[input.kind]}" — add it in the product's Options first`);
  }
  // Every other option needs a value too (e.g. Medusa's "Default option").
  const otherOptions = Object.fromEntries(
    product.options.filter((o) => o !== format && o.values[0]).map((o) => [o.title, o.values[0].value]),
  );
  const variant = await deps.createVariant({
    product_id: productId,
    title: VALUE[input.kind],
    sku: `${productId}-${input.kind}`,
    options: { ...otherOptions, [format.title]: VALUE[input.kind] },
    prices: [{ amount: input.price, currency_code: "egp" }],
    manage_inventory: input.kind === "paper",
    allow_backorder: input.kind === "digital",
    metadata: { kind: input.kind },
  });
  if (input.kind === "paper" && typeof input.stock === "number" && input.stock >= 0) {
    await deps.setStock(variant.id, input.stock);
  }
  return { variant_id: variant.id };
}

export async function setEditionSaleEnabled(
  deps: EditionDeps,
  productId: string,
  variantId: string,
  saleEnabled: boolean,
): Promise<void> {
  const product = await loadProduct(deps, productId);
  const variant = product.variants.find((v) => v.id === variantId && kindOf(v));
  if (!variant) throw new EditionError(404, "Edition not found on this book");
  await deps.updateVariantMetadata(variantId, { ...(variant.metadata ?? {}), sale_enabled: saleEnabled });
}

export function makeEditionDeps(container: MedusaContainer): EditionDeps {
  const query = container.resolve("query");
  const profiles = container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo;
  return {
    async getProduct(id) {
      const { data } = await query.graph({
        entity: "product",
        fields: [
          "id", "options.title", "options.values.value",
          "variants.id", "variants.title", "variants.metadata", "variants.manage_inventory",
          "variants.prices.amount", "variants.prices.currency_code",
        ],
        filters: { id },
      });
      return (data[0] as unknown as EditionProduct) ?? null;
    },
    async getProfile(productId) {
      const [row] = await profiles.listBookProfiles({ product_id: productId });
      return row ?? null;
    },
    async createVariant(input) {
      const { result } = await createProductVariantsWorkflow(container).run({
        input: { product_variants: [input as never] },
      });
      return { id: (result[0] as { id: string }).id };
    },
    async setStock(variantId, qty) {
      await setPaperInventory(container, query as never, variantId, qty, {} as never);
    },
    async updateVariantMetadata(variantId, metadata) {
      await updateProductVariantsWorkflow(container).run({
        input: { selector: { id: variantId }, update: { metadata } },
      });
    },
  };
}
