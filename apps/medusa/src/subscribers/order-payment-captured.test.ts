import { describe, it, expect, vi } from "vitest";
import orderPaymentCapturedHandler from "./order-payment-captured";
import { DIGITAL_PRODUCT_MODULE } from "../modules/digital-product";
import { Modules } from "@medusajs/framework/utils";

describe("order-payment-captured subscriber", () => {
  it("grants entitlement for each digital line item on the paid order", async () => {
    const grantEntitlement = vi.fn().mockResolvedValue({ id: "ent_1" });

    const query = {
      graph: vi.fn().mockResolvedValue({
        data: [
          {
            id: "order_1",
            customer_id: "cus_1",
            items: [
              { variant_id: "variant_digital_1", product: { metadata: { kind: "digital" } } },
              { variant_id: "variant_paper_1", product: { metadata: { kind: "paper" } } },
            ],
          },
        ],
      }),
    };

    const container = {
      resolve: (key: string) => {
        if (key === DIGITAL_PRODUCT_MODULE) return { grantEntitlement };
        if (key === "query") return query;
        if (key === Modules.ORDER) {
          return { retrieveOrder: vi.fn().mockResolvedValue({ id: "order_1" }) };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await orderPaymentCapturedHandler({
      event: { data: { id: "payment_1", order_id: "order_1" } },
      container: container as any,
    });

    expect(grantEntitlement).toHaveBeenCalledTimes(1);
    expect(grantEntitlement).toHaveBeenCalledWith({
      customerId: "cus_1",
      variantId: "variant_digital_1",
      orderId: "order_1",
    });
  });
});
