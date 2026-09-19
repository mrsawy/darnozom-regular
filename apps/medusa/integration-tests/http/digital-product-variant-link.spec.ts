import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";
import { DIGITAL_PRODUCT_MODULE } from "../../src/modules/digital-product";

// medusaIntegrationTestRunner spins up a full Medusa app (all core module
// migrations) in its beforeAll hook, which exceeds Jest's default 5000ms
// hook timeout on this machine. Raise it for this suite only.
jest.setTimeout(120000);

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("digital-product-variant link", () => {
      it("links a DigitalProductFile to a ProductVariant and resolves via Query", async () => {
        const container = getContainer();
        const productModule = container.resolve(Modules.PRODUCT);
        const digitalProductModule = container.resolve(DIGITAL_PRODUCT_MODULE);
        const remoteLink = container.resolve("remoteLink");
        const query = container.resolve("query");

        const product = await productModule.createProducts({
          title: "Test Book",
          status: "published" as any,
          options: [
            {
              title: "Format",
              values: ["Digital"],
            },
          ],
        });

        const variant = await productModule.createProductVariants({
          product_id: product.id,
          title: "Digital",
          options: {
            Format: "Digital",
          },
        });

        const file = await digitalProductModule.createFile({
          relativeKey: "books/digital/test.pdf",
        });

        await remoteLink.create({
          [Modules.PRODUCT]: { product_variant_id: variant.id },
          [DIGITAL_PRODUCT_MODULE]: { digital_product_file_id: file.id },
        });

        const { data } = await query.graph({
          entity: "product_variant",
          fields: ["id", "digital_product_file.*"],
          filters: { id: variant.id },
        });

        expect(data[0].digital_product_file.id).toBe(file.id);
      });
    });
  },
});
