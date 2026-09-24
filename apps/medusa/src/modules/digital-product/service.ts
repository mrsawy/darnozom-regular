import { MedusaService } from "@medusajs/framework/utils";
import { DigitalProductFile } from "./models/digital-product-file";
import { Entitlement } from "./models/entitlement";
import { DigitalBookFile } from "./models/digital-book-file";

class DigitalProductModuleService extends MedusaService({
  DigitalProductFile,
  Entitlement,
  DigitalBookFile,
}) {
  /** Files of the given digital variants, in display order. */
  async listFilesForVariants(variantIds: string[]) {
    if (variantIds.length === 0) return [];
    return this.listDigitalBookFiles(
      { variant_id: variantIds },
      { order: { sort_order: "ASC", created_at: "ASC" } },
    );
  }

  async createFile(input: { relativeKey: string; checksum?: string }) {
    const file = await this.createDigitalProductFiles({
      relative_key: input.relativeKey,
      checksum: input.checksum ?? null,
    });
    return { id: file.id, relativeKey: file.relative_key, checksum: file.checksum };
  }

  async grantEntitlement(input: {
    customerId: string;
    variantId: string;
    orderId: string;
  }) {
    const existing = await this.listEntitlements({
      customer_id: input.customerId,
      variant_id: input.variantId,
    });
    if (existing.length > 0) return { id: existing[0].id };

    const entitlement = await this.createEntitlements({
      customer_id: input.customerId,
      variant_id: input.variantId,
      order_id: input.orderId,
    });
    return { id: entitlement.id };
  }

  async hasEntitlement(input: { customerId: string; variantId: string }): Promise<boolean> {
    const existing = await this.listEntitlements({
      customer_id: input.customerId,
      variant_id: input.variantId,
    });
    return existing.length > 0;
  }
}

export default DigitalProductModuleService;
