import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import {
  createAndLinkProductOptionsToProductWorkflow,
  createProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Any product assigned the "Book" product type automatically gets a
 * "Format" option with "Paper" and "Digital" values, and one variant per
 * value — so an admin never has to hand-build the option/variant structure
 * the storefront expects (see apps/client/src/lib/book-variants.ts).
 *
 * The product type to watch for is configured via MEDUSA_BOOK_PRODUCT_TYPE_ID
 * (a "ptyp_..." id from Admin > Settings > Product Types) rather than
 * hardcoded here or matched by the type's title, which could be renamed.
 *
 * Fires on both product.created and product.updated — a product's type can
 * be set after creation, and the type itself could be assigned later too.
 * Idempotent: does nothing if the product already has any variant carrying
 * metadata.kind "paper" or "digital" (covers both a rerun of this
 * subscriber's own work — it creates variants with that metadata, and its
 * own edit goes through createAndLinkProductOptionsToProductWorkflow, which
 * re-emits product.updated, so without this guard it would loop — and a
 * book variant an admin already added by hand).
 */

interface ProductVariantLike {
  metadata?: { kind?: string } | null;
}

interface ProductOptionLike {
  id: string;
  title: string;
  values?: Array<{ value: string }> | null;
}

interface ProductLike {
  id: string;
  type_id: string | null;
  options?: ProductOptionLike[] | null;
  variants?: ProductVariantLike[] | null;
}

const FORMAT_OPTION_TITLE = "Format";
const PAPER_VALUE = "Paper";
const DIGITAL_VALUE = "Digital";

export default async function autoAddBookEditionsHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const bookTypeId = process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID;
  if (!bookTypeId) return; // Not configured — feature is off by default.

  const logger = container.resolve("logger");

  try {
    const query = container.resolve("query");
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "type_id", "options.id", "options.title", "options.values.value", "variants.metadata"],
      filters: { id: event.data.id },
    });
    const product = data[0] as ProductLike | undefined;
    if (!product || product.type_id !== bookTypeId) return;

    const alreadyHasEdition = (product.variants ?? []).some(
      (v) => v.metadata?.kind === "paper" || v.metadata?.kind === "digital",
    );
    if (alreadyHasEdition) return;

    const existingFormatOption = (product.options ?? []).find(
      (o) => o.title.trim().toLowerCase() === FORMAT_OPTION_TITLE.toLowerCase(),
    );
    const existingValues = new Set(
      (existingFormatOption?.values ?? []).map((v) => v.value.trim().toLowerCase()),
    );
    const needsPaperValue = !existingValues.has(PAPER_VALUE.toLowerCase());
    const needsDigitalValue = !existingValues.has(DIGITAL_VALUE.toLowerCase());

    if (!existingFormatOption) {
      await createAndLinkProductOptionsToProductWorkflow(container).run({
        input: {
          product_id: product.id,
          add: [{ title: FORMAT_OPTION_TITLE, values: [PAPER_VALUE, DIGITAL_VALUE] }],
        },
      });
    } else if (needsPaperValue || needsDigitalValue) {
      // A "Format" option already exists (e.g. an admin started building
      // paper/digital by hand) but is missing one of the two values needed.
      const missingValues = [
        ...(needsPaperValue ? [PAPER_VALUE] : []),
        ...(needsDigitalValue ? [DIGITAL_VALUE] : []),
      ];
      await createAndLinkProductOptionsToProductWorkflow(container).run({
        input: {
          product_id: product.id,
          update: [
            {
              product_option_id: existingFormatOption.id,
              add: missingValues.map((value) => ({ value })),
            },
          ],
        },
      });
    }

    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            product_id: product.id,
            title: "Paper",
            sku: `${product.id}-paper`,
            options: { [FORMAT_OPTION_TITLE]: PAPER_VALUE },
            metadata: { kind: "paper" },
          },
          {
            product_id: product.id,
            title: "Digital",
            sku: `${product.id}-digital`,
            options: { [FORMAT_OPTION_TITLE]: DIGITAL_VALUE },
            metadata: { kind: "digital" },
          },
        ],
      },
    });
  } catch (err) {
    // Best-effort automation: a failure here (e.g. a SKU collision with a
    // variant an admin already hand-created) must never break whatever
    // create/update the product was going through. The admin can always
    // add paper/digital variants manually if this doesn't fire.
    logger.error(
      `auto-add-book-editions: failed for product ${event.data.id}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
