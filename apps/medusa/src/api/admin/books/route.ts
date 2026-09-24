import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { createBookProduct } from "../../../lib/create-book-product";

type CreateBookBody = {
  title?: string;
  description?: string;
  status?: "draft" | "published";
  salesChannelId?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
  paperPrice?: number;
  digitalPrice?: number;
  hasDigital?: boolean;
  paperInventoryQty?: number;
  currencyCode?: string;
  author?: string;
  categoryIds?: string[];
  category?: "shariah" | "management" | "digital_transformation" | "other";
  language?: "ar" | "en" | "both";
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CreateBookBody;

  try {
    const result = await createBookProduct(req.scope, {
      title: body.title ?? "",
      description: body.description,
      status: body.status,
      salesChannelId: body.salesChannelId ?? "",
      thumbnailUrl: body.thumbnailUrl,
      imageUrls: body.imageUrls,
      paperPrice: Number(body.paperPrice),
      digitalPrice: Number(body.digitalPrice),
      hasDigital: body.hasDigital !== false,
      paperInventoryQty:
        body.paperInventoryQty === undefined || body.paperInventoryQty === null
          ? undefined
          : Number(body.paperInventoryQty),
      currencyCode: body.currencyCode,
      author: body.author,
      categoryIds: body.categoryIds,
      category: body.category,
      language: body.language,
    });

    res.status(201).json({
      product: result.product,
      paperVariantId: result.paperVariantId,
      digitalVariantId: result.digitalVariantId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      /required|must be positive|MEDUSA_BOOK_PRODUCT_TYPE_ID/i.test(message)
        ? 400
        : 500;
    res.status(status).json({ message });
  }
}
