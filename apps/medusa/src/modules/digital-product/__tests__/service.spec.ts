import { moduleIntegrationTestRunner } from "@medusajs/test-utils";
import { DIGITAL_PRODUCT_MODULE } from "../index";
import DigitalProductModuleService from "../service";

moduleIntegrationTestRunner<DigitalProductModuleService>({
  moduleName: DIGITAL_PRODUCT_MODULE,
  resolve: "./src/modules/digital-product",
  testSuite: ({ service }) => {
    describe("DigitalProductModuleService", () => {
      it("hasEntitlement returns false when no entitlement exists", async () => {
        const result = await service.hasEntitlement({
          customerId: "cus_nonexistent",
          variantId: "variant_nonexistent",
        });
        expect(result).toBe(false);
      });

      it("hasEntitlement returns true after grantEntitlement", async () => {
        await service.grantEntitlement({
          customerId: "cus_1",
          variantId: "variant_1",
          orderId: "order_1",
        });

        const result = await service.hasEntitlement({
          customerId: "cus_1",
          variantId: "variant_1",
        });
        expect(result).toBe(true);
      });
    });
  },
});
