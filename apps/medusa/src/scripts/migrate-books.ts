import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";

export interface BookRow {
  id: number;
  title: string;
  titleEn: string | null;
  author: string | null;
  description: string | null;
  descriptionEn: string | null;
  coverImageUrl: string | null;
  category: "shariah" | "management" | "digital_transformation" | "other";
  format: "online" | "hardcopy" | "both";
  language: "ar" | "en" | "both";
  isbn: string | null;
  currency: string | null;
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
  digitalFileUrl: string | null;
  status: "available" | "coming_soon" | "out_of_stock";
  isFeatured: boolean;
  isNewRelease: boolean;
}

export interface BookMigrationResult {
  bookId: number;
  medusaProductId: string;
  paperVariantId: string | null;
  digitalVariantId: string | null;
}

interface MigrateBooksDeps {
  booksDb: { select: () => { from: () => Promise<BookRow[]> } };
  medusaContainer: MedusaContainer;
  // Test seam only — production callers omit this and get the real workflow.
  __testCreateProductsWorkflow?: (
    container: MedusaContainer,
  ) => { run: (args: any) => Promise<{ result: any[] }> };
}

function currencyCode(currency: string | null): string {
  return (currency || "EGP").toLowerCase();
}

function buildVariants(book: BookRow) {
  const variants: Array<{
    title: string;
    sku: string;
    prices: Array<{ amount: number; currency_code: string }>;
    metadata: { kind: "paper" | "digital" };
  }> = [];

  if (book.paperAvailable && book.paperPrice) {
    variants.push({
      title: "Paper",
      sku: `book-${book.id}-paper`,
      prices: [
        { amount: Math.round(Number(book.paperPrice) * 100), currency_code: currencyCode(book.currency) },
      ],
      metadata: { kind: "paper" },
    });
  }

  if (book.digitalAvailable && book.digitalPrice) {
    variants.push({
      title: "Digital",
      sku: `book-${book.id}-digital`,
      prices: [
        { amount: Math.round(Number(book.digitalPrice) * 100), currency_code: currencyCode(book.currency) },
      ],
      metadata: { kind: "digital" },
    });
  }

  return variants;
}

export async function migrateBooks(
  deps: MigrateBooksDeps,
): Promise<BookMigrationResult[]> {
  const books = await deps.booksDb.select().from();
  const results: BookMigrationResult[] = [];

  const workflowFactory = deps.__testCreateProductsWorkflow ?? createProductsWorkflow;
  const workflow = workflowFactory(deps.medusaContainer);

  for (const book of books) {
    const variants = buildVariants(book);
    if (variants.length === 0) continue; // book has neither price set — skip, log separately

    const { result } = await workflow.run({
      input: {
        products: [
          {
            title: book.titleEn || book.title,
            status: book.status === "available" ? "published" : "draft",
            description: book.descriptionEn || book.description || undefined,
            thumbnail: book.coverImageUrl || undefined,
            options: [{ title: "Format", values: variants.map((v) => v.title) }],
            variants: variants.map((v) => ({
              title: v.title,
              sku: v.sku,
              options: { Format: v.title },
              prices: v.prices,
              metadata: v.metadata,
            })),
            metadata: {
              legacyBookId: book.id,
              category: book.category,
              language: book.language,
              isbn: book.isbn,
              isFeatured: book.isFeatured,
              isNewRelease: book.isNewRelease,
            },
          },
        ],
      },
    });

    const product = result[0];
    const paperVariant = product.variants.find((v: any) => v.title === "Paper");
    const digitalVariant = product.variants.find((v: any) => v.title === "Digital");

    results.push({
      bookId: book.id,
      medusaProductId: product.id,
      paperVariantId: paperVariant?.id ?? null,
      digitalVariantId: digitalVariant?.id ?? null,
    });
  }

  return results;
}
