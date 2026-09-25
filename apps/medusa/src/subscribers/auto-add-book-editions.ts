import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import {
  createAndLinkProductOptionsToProductWorkflow,
  createProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Any product assigned the "Book" product type automatically gets a
 * "Format" option (values "Paper" and "Digital") and a Paper variant. A
 * digital edition is never created automatically — staff add it from the
 * product's Editions panel, and only when the book has digital rights.
 *
 * The product type to watch for is configured via MEDUSA_BOOK_PRODUCT_TYPE_ID
 * (a "ptyp_..." id from Admin > Settings > Product Types) rather than
 * hardcoded here or matched by the type's title, which could be renamed.
 *
 * Fires on product.created only, deliberately not product.updated. The
 * option/variant creation this subscriber does itself goes through
 * createAndLinkProductOptionsToProductWorkflow, which emits its own
 * product.updated when it finishes — if this subscriber also listened for
 * product.updated, that self-triggered event races the original
 * invocation: read-your-own-writes isn't guaranteed between concurrent
 * query.graph calls, so the second invocation can see the product as not
 * having a "Format" option yet (the first invocation's write hasn't landed
 * from its point of view) and attempt to create a second one, which fails
 * with "Product option with title: Format, already exists." — reproduced
 * directly via src/scripts/debug-book-subscriber.ts during development.
 * product.created-only avoids the self-trigger entirely. The tradeoff: a
 * product whose type is set to Book *after* creation (rather than at
 * creation time) won't get auto-added editions — re-saving the product
 * with a trivial edit re-fires product.updated, which isn't handled, so
 * for now that case needs the admin to add paper/digital variants by hand,
 * same as before this subscriber existed.
 *
 * Idempotent: does nothing if the product already has any variant carrying
 * metadata.kind "paper" or "digital" — covers a genuinely duplicate
 * product.created delivery, and a book variant an admin already added by
 * hand before the type was assigned.
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
          // is_exclusive: true is required here. Unlike options created as
          // part of product creation itself (where Medusa's product module
          // defaults is_exclusive to true), this workflow's create-option
          // path leaves it unset, which the DB defaults to false — and a
          // non-exclusive option's title must be globally unique across
          // every product in the store (IDX_product_option_global_title_unique).
          // Without this, the first Book product to get a "Format" option
          // succeeds and silently becomes a shared, non-exclusive option;
          // every subsequent Book product then fails with "Product option
          // with title: Format, already exists." Reproduced directly via
          // src/scripts/debug-book-subscriber.ts during development.
          add: [{ title: FORMAT_OPTION_TITLE, values: [PAPER_VALUE, DIGITAL_VALUE], is_exclusive: true }],
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

    // A variant must specify a value for every option on the product, not
    // just the one this subscriber added — e.g. Admin's "Create Product"
    // form, when you don't touch Options at all, gives the product a
    // "Default option"/"Default option value" pair by default, and Medusa
    // rejects a variant that only names "Format" with "Product has N option
    // values but there were 1 provided ... for the variant" (reproduced via
    // src/scripts/debug-book-subscriber.ts). Carry every other option's
    // first value through unchanged.
    const otherOptionValues = Object.fromEntries(
      (product.options ?? [])
        .filter((o) => o.title.trim().toLowerCase() !== FORMAT_OPTION_TITLE.toLowerCase())
        .map((o) => [o.title, o.values?.[0]?.value])
        .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );

    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            product_id: product.id,
            title: "Paper",
            sku: `${product.id}-paper`,
            options: { ...otherOptionValues, [FORMAT_OPTION_TITLE]: PAPER_VALUE },
            metadata: { kind: "paper" },
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
        err instanceof Error ? err.stack || err.message : JSON.stringify(err)
      }`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "product.created",
};
