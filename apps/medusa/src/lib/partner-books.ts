import type { MedusaContainer } from "@medusajs/framework/types";
import { updateProductsWorkflow, uploadFilesWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { bookProfileSchema, type CreateBookInput } from "./book-input";
import { createBook, makeCreateBookDeps } from "./create-book";
import { makeSaveProfileDeps, saveBookProfile } from "./save-book-profile";
import { fetchPublicImage } from "./safe-image-fetch";
import { BOOK_CATALOG_MODULE, findProfileByIdentity, type BookProfileRepo } from "../modules/book-catalog";

export class PartnerError extends Error {
  constructor(public status: 400 | 404 | 409 | 422, message: string, public errors?: string[]) {
    super(message);
  }
}

const price = z.number().positive().max(1_000_000);
export const partnerBookSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    subtitle: z.string().trim().max(300).nullish(),
    description: z.string().trim().min(80, "description must be a full professional text (at least 80 characters)").max(20_000),
    primary_category_handle: z.string().trim().min(1),
    additional_category_handles: z.array(z.string().trim().min(1)).max(20).default([]),
    print: z.object({ price, stock: z.number().int().min(0).max(1_000_000).default(0) }).nullish(),
    digital: z.object({ price }).nullish(),
    images: z.array(z.object({ url: z.string() })).max(10).default([]),
    openaiFileIdRefs: z
      .array(z.object({ name: z.string().optional(), mime_type: z.string().optional(), download_link: z.string() }))
      .max(10)
      .default([]),
    profile: bookProfileSchema.omit({ primary_category_id: true }),
  })
  .superRefine((v, ctx) => {
    if (!v.profile.isbn && !v.profile.external_id) {
      ctx.addIssue({ code: "custom", path: ["profile", "isbn"], message: "send an isbn, or an external_id if the book has no ISBN" });
    }
    if (!v.print && !v.digital) {
      ctx.addIssue({ code: "custom", path: ["print"], message: "a book needs a print edition, a digital edition, or both" });
    }
    if (v.digital && !v.profile.digital_rights) {
      ctx.addIssue({ code: "custom", path: ["digital"], message: "a digital edition needs digital distribution rights (profile.digital_rights: true)" });
    }
  });

export type PartnerDeps = {
  profileRepo: BookProfileRepo;
  categoryIdsByHandle(handles: string[]): Promise<Map<string, string>>;
  defaultSalesChannelId(): Promise<string>;
  productStatus(productId: string): Promise<string | null>;
  importImage(url: string): Promise<string>;
  createBook(input: CreateBookInput): Promise<{ product: { id: string } }>;
  updateBook(productId: string, input: CreateBookInput): Promise<void>;
};

export async function upsertPartnerBook(
  deps: PartnerDeps,
  raw: unknown,
): Promise<{ status: "created" | "updated"; product_id: string }> {
  const parsed = partnerBookSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
    throw new PartnerError(400, errors.join("; "), errors);
  }
  const b = parsed.data;

  const handles = [b.primary_category_handle, ...b.additional_category_handles];
  const ids = await deps.categoryIdsByHandle(handles);
  const unknown = handles.filter((h) => !ids.has(h));
  if (unknown.length) {
    throw new PartnerError(400, `Unknown category handle(s): ${unknown.join(", ")}. Use a handle from GET /partner/categories.`);
  }

  const existing = await findProfileByIdentity(deps.profileRepo, { isbn: b.profile.isbn, external_id: b.profile.external_id });
  if (existing) {
    const status = await deps.productStatus(existing.product_id);
    if (status !== "draft") {
      throw new PartnerError(409, `Book ${existing.product_id} is already ${status ?? "gone"}; published books are edited by staff in Medusa Admin.`);
    }
  }

  const imageUrls: string[] = [];
  for (const src of [...b.images.map((i) => i.url), ...b.openaiFileIdRefs.map((f) => f.download_link)]) {
    try {
      imageUrls.push(await deps.importImage(src));
    } catch (err) {
      throw new PartnerError(422, `Image could not be imported — ${(err as Error).message}`);
    }
  }

  const input: CreateBookInput = {
    title: b.title,
    subtitle: b.subtitle ?? null,
    description: b.description,
    status: "draft",
    sales_channel_id: await deps.defaultSalesChannelId(),
    image_urls: imageUrls,
    additional_category_ids: b.additional_category_handles.map((h) => ids.get(h)!),
    print: b.print ?? null,
    digital: b.digital ?? null,
    profile: { ...b.profile, primary_category_id: ids.get(b.primary_category_handle)! },
  };

  if (existing) {
    await deps.updateBook(existing.product_id, input);
    return { status: "updated", product_id: existing.product_id };
  }
  const created = await deps.createBook(input);
  return { status: "created", product_id: created.product.id };
}

export function makePartnerDeps(container: MedusaContainer): PartnerDeps {
  const query = container.resolve("query");
  const profileRepo = container.resolve(BOOK_CATALOG_MODULE) as unknown as BookProfileRepo;
  const createDeps = makeCreateBookDeps(container);
  return {
    profileRepo,
    async categoryIdsByHandle(handles) {
      const { data } = await query.graph({ entity: "product_category", fields: ["id", "handle"], filters: { handle: handles } });
      return new Map((data as { id: string; handle: string }[]).map((c) => [c.handle, c.id]));
    },
    async defaultSalesChannelId() {
      const { data } = await query.graph({ entity: "sales_channel", fields: ["id"] });
      const id = (data[0] as { id: string } | undefined)?.id;
      if (!id) throw new PartnerError(422, "The store has no sales channel");
      return id;
    },
    async productStatus(productId) {
      const { data } = await query.graph({ entity: "product", fields: ["id", "status"], filters: { id: productId } });
      return (data[0] as { status: string } | undefined)?.status ?? null;
    },
    async importImage(url) {
      const img = await fetchPublicImage(url);
      const { result } = await uploadFilesWorkflow(container).run({
        input: { files: [{ filename: img.filename, mimeType: img.mimeType, content: img.base64, access: "public" }] },
      });
      return (result[0] as { url: string }).url;
    },
    createBook: (input) => createBook(createDeps, input),
    async updateBook(productId, input) {
      // Drafts only (checked above). Prices/stock stay as staff or the first import set them.
      await updateProductsWorkflow(container).run({
        input: {
          products: [{
            id: productId,
            title: input.title,
            subtitle: input.subtitle ?? undefined,
            description: input.description ?? undefined,
            ...(input.image_urls.length ? { thumbnail: input.image_urls[0], images: input.image_urls.map((url) => ({ url })) } : {}),
            category_ids: [...new Set([input.profile.primary_category_id!, ...input.additional_category_ids])],
          }],
        },
      });
      await saveBookProfile(makeSaveProfileDeps(container), productId, input.profile);
    },
  };
}
