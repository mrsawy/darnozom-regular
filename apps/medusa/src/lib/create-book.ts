import type { MedusaContainer } from "@medusajs/framework/types";
import type { CreateBookInput } from "./book-input";
import {
  createBookProduct,
  type CreateBookProductInput,
  type CreateBookProductResult,
} from "./create-book-product";
import { makeSaveProfileDeps, saveBookProfile, type SaveProfileDeps } from "./save-book-profile";
import {
  BOOK_CATALOG_MODULE,
  BookProfileConflictError,
  findProfileByIdentity,
  type BookProfileRepo,
  type BookProfileRow,
} from "../modules/book-catalog";

export type CreateBookDeps = {
  profileRepo: BookProfileRepo;
  createProduct(input: CreateBookProductInput): Promise<CreateBookProductResult>;
  saveProfile: SaveProfileDeps;
};

/** Creates a book product and its profile. Shared by Medusa Admin and the partner API. */
export async function createBook(
  deps: CreateBookDeps,
  input: CreateBookInput,
): Promise<{ product: { id: string }; paperVariantId: string | null; digitalVariantId: string | null; profile: BookProfileRow }> {
  // Check identity first so a duplicate never leaves an orphan product behind.
  const clash = await findProfileByIdentity(deps.profileRepo, {
    isbn: input.profile.isbn,
    external_id: input.profile.external_id,
  });
  if (clash) {
    throw new BookProfileConflictError(`this book already exists as product ${clash.product_id}`);
  }

  const categoryIds = [
    ...new Set([input.profile.primary_category_id, ...input.additional_category_ids].filter((x): x is string => !!x)),
  ];
  const created = await deps.createProduct({
    title: input.title,
    subtitle: input.subtitle,
    description: input.description ?? undefined,
    status: input.status,
    salesChannelId: input.sales_channel_id,
    thumbnailUrl: input.image_urls[0],
    imageUrls: input.image_urls,
    hasPaper: !!input.print,
    paperPrice: input.print?.price ?? Number.NaN,
    paperInventoryQty: input.print?.stock,
    hasDigital: !!input.digital,
    digitalPrice: input.digital?.price ?? Number.NaN,
    categoryIds,
    author: input.profile.authors.join("، "),
    language: input.profile.language,
  });
  const profile = await saveBookProfile(deps.saveProfile, created.product.id, input.profile);
  return {
    product: created.product,
    paperVariantId: created.paperVariantId,
    digitalVariantId: created.digitalVariantId,
    profile,
  };
}

export function makeCreateBookDeps(container: MedusaContainer): CreateBookDeps {
  return {
    profileRepo: container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo,
    createProduct: (input) => createBookProduct(container, input),
    saveProfile: makeSaveProfileDeps(container),
  };
}
