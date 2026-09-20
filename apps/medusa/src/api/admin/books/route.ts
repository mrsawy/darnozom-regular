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
  paperInventoryQty?: number;
  currencyCode?: string;
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
      paperInventoryQty:
        body.paperInventoryQty === undefined || body.paperInventoryQty === null
          ? undefined
          : Number(body.paperInventoryQty),
      currencyCode: body.currencyCode,
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
