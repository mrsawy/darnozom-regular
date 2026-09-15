import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product";

interface DigitalProductServiceLike {
  grantEntitlement(input: {
    customerId: string;
    variantId: string;
    orderId: string;
  }): Promise<{ id: string }>;
}

interface OrderItemLike {
  variant_id: string;
  product?: {
    metadata?: {
      kind?: string;
    } | null;
  } | null;
}

export default async function orderPaymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
  const query = container.resolve("query");
  const digitalProductService = container.resolve<DigitalProductServiceLike>(
    DIGITAL_PRODUCT_MODULE,
  );

  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "items.variant_id", "items.product.metadata"],
    filters: { id: event.data.order_id },
  });

  const order = data[0];
  if (!order) return;

  const digitalItems = (order.items as OrderItemLike[]).filter(
    (item) => item.product?.metadata?.kind === "digital",
  );

  for (const item of digitalItems) {
    await digitalProductService.grantEntitlement({
      customerId: order.customer_id,
      variantId: item.variant_id,
      orderId: order.id,
    });
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
};
