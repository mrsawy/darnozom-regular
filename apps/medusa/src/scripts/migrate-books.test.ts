import { describe, it, expect, vi } from "vitest";
import { migrateBooks } from "./migrate-books";

describe("migrateBooks", () => {
  it("creates a product with paper and digital variants from a book row", async () => {
    const fakeBook = {
      id: 42,
      title: "إدارة التحول الرقمي",
      titleEn: "Digital Transformation Management",
      author: "د. أحمد",
      description: "وصف",
      descriptionEn: "Description",
      coverImageUrl: "https://example.com/cover.jpg",
      category: "digital_transformation" as const,
      format: "both" as const,
      language: "ar" as const,
      pages: "240",
      isbn: "978-1-234567-89-0",
      price: null,
      currency: "EGP",
      paperAvailable: true,
      paperPrice: "350",
      digitalAvailable: true,
      digitalPrice: "150",
      digitalFileUrl: "books/digital/42.pdf",
      status: "available" as const,
      isFeatured: true,
      isNewRelease: false,
      externalUrl: null,
      buyLink: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booksDb = {
      select: () => ({
        from: () => Promise.resolve([fakeBook]),
      }),
    };

    const createProductsMock = vi.fn().mockResolvedValue({
      result: [
        {
          id: "prod_01",
          variants: [
            { id: "variant_paper_01", title: "Paper" },
            { id: "variant_digital_01", title: "Digital" },
          ],
        },
      ],
    });

    const medusaContainer = {
      resolve: () => ({}),
    };

    const result = await migrateBooks({
      booksDb: booksDb as any,
      medusaContainer: medusaContainer as any,
      __testCreateProductsWorkflow: () => ({ run: createProductsMock }),
    } as any);

    expect(result).toEqual([
      {
        bookId: 42,
        medusaProductId: "prod_01",
        paperVariantId: "variant_paper_01",
        digitalVariantId: "variant_digital_01",
      },
    ]);
    expect(createProductsMock).toHaveBeenCalledTimes(1);
    const callArg = createProductsMock.mock.calls[0][0];
    expect(callArg.input.products[0].title).toBe(
      "Digital Transformation Management",
    );
    expect(callArg.input.products[0].variants).toHaveLength(2);
  });

  it("creates a product with only a paper variant when digital is unavailable", async () => {
    const fakeBook = {
      id: 43,
      title: "كتاب ورقي فقط",
      titleEn: "Paper Only Book",
      author: "د. أحمد",
      description: "وصف",
      descriptionEn: "Description",
      coverImageUrl: "https://example.com/cover.jpg",
      category: "management" as const,
      format: "hardcopy" as const,
      language: "ar" as const,
      pages: "180",
      isbn: "978-1-234567-89-1",
      price: null,
      currency: "EGP",
      paperAvailable: true,
      paperPrice: "200",
      digitalAvailable: false,
      digitalPrice: null,
      digitalFileUrl: null,
      status: "available" as const,
      isFeatured: false,
      isNewRelease: false,
      externalUrl: null,
      buyLink: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booksDb = {
      select: () => ({
        from: () => Promise.resolve([fakeBook]),
      }),
    };

    const createProductsMock = vi.fn().mockResolvedValue({
      result: [
        {
          id: "prod_02",
          variants: [{ id: "variant_paper_02", title: "Paper" }],
        },
      ],
    });

    const medusaContainer = {
      resolve: () => ({}),
    };

    const result = await migrateBooks({
      booksDb: booksDb as any,
      medusaContainer: medusaContainer as any,
      __testCreateProductsWorkflow: () => ({ run: createProductsMock }),
    } as any);

    expect(result).toEqual([
      {
        bookId: 43,
        medusaProductId: "prod_02",
        paperVariantId: "variant_paper_02",
        digitalVariantId: null,
      },
    ]);
    expect(createProductsMock).toHaveBeenCalledTimes(1);
    const callArg = createProductsMock.mock.calls[0][0];
    expect(callArg.input.products[0].variants).toHaveLength(1);
  });

  it("excludes a book with neither paper nor digital price set", async () => {
    const fakeBook = {
      id: 44,
      title: "كتاب بدون سعر",
      titleEn: "No Price Book",
      author: "د. أحمد",
      description: "وصف",
      descriptionEn: "Description",
      coverImageUrl: null,
      category: "other" as const,
      format: "online" as const,
      language: "en" as const,
      pages: "100",
      isbn: null,
      price: null,
      currency: "EGP",
      paperAvailable: false,
      paperPrice: null,
      digitalAvailable: false,
      digitalPrice: null,
      digitalFileUrl: null,
      status: "coming_soon" as const,
      isFeatured: false,
      isNewRelease: false,
      externalUrl: null,
      buyLink: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booksDb = {
      select: () => ({
        from: () => Promise.resolve([fakeBook]),
      }),
    };

    const createProductsMock = vi.fn();

    const medusaContainer = {
      resolve: () => ({}),
    };

    const result = await migrateBooks({
      booksDb: booksDb as any,
      medusaContainer: medusaContainer as any,
      __testCreateProductsWorkflow: () => ({ run: createProductsMock }),
    } as any);

    expect(result).toEqual([]);
    expect(createProductsMock).not.toHaveBeenCalled();
  });
});
