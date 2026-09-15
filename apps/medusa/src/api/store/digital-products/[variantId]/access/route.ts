// apps/medusa/src/api/store/digital-products/[variantId]/access/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DIGITAL_PRODUCT_MODULE } from "../../../../../modules/digital-product";
import { createSignedObjectUrl } from "../../../../../lib/signed-object-url";

interface DigitalProductServiceLike {
  hasEntitlement(input: { customerId: string; variantId: string }): Promise<boolean>;
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id;
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { variantId } = req.params;
  const digitalProductService = req.scope.resolve<DigitalProductServiceLike>(
    DIGITAL_PRODUCT_MODULE,
  );

  const entitled = await digitalProductService.hasEntitlement({ customerId, variantId });
  if (!entitled) {
    return res.status(403).json({ error: "No access to this digital product" });
  }

  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "digital_product_file.relative_key"],
    filters: { id: variantId },
  });

  const relativeKey = data[0]?.digital_product_file?.relative_key;
  if (!relativeKey) {
    return res.status(404).json({ error: "No digital file for this variant" });
  }

  const { token, expiresAt } = createSignedObjectUrl({ relativeKey, ttlSeconds: 300 });
  return res.status(200).json({
    url: `/store/digital-products/download?token=${encodeURIComponent(token)}`,
    expiresAt,
  });
}
