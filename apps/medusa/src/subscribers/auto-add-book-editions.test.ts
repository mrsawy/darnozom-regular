import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createOptionsRunMock, createVariantsRunMock } = vi.hoisted(() => ({
  createOptionsRunMock: vi.fn().mockResolvedValue({ result: undefined }),
  createVariantsRunMock: vi.fn().mockResolvedValue({ result: undefined }),
}));

vi.mock("@medusajs/medusa/core-flows", () => ({
  createAndLinkProductOptionsToProductWorkflow: () => ({ run: createOptionsRunMock }),
  createProductVariantsWorkflow: () => ({ run: createVariantsRunMock }),
}));

const { default: autoAddBookEditionsHandler } = await import("./auto-add-book-editions");

const BOOK_TYPE_ID = "ptyp_book_test";

function makeContainer(graphResult: unknown) {
  const graph = vi.fn().mockResolvedValue({ data: [graphResult].filter(Boolean) });
  const container = {
    resolve: (key: string) => {
      if (key === "query") return { graph };
      if (key === "logger") return { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
      throw new Error(`Unexpected resolve: ${key}`);
    },
  };
  return { container, graph };
}

describe("auto-add-book-editions subscriber", () => {
  const originalEnv = process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID;

  beforeEach(() => {
    process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID = BOOK_TYPE_ID;
    createOptionsRunMock.mockClear();
    createVariantsRunMock.mockClear();
  });

  afterEach(() => {
    process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID = originalEnv;
  });

  it("is a no-op when MEDUSA_BOOK_PRODUCT_TYPE_ID is not configured", async () => {
    delete process.env.MEDUSA_BOOK_PRODUCT_TYPE_ID;
    const { container, graph } = makeContainer({ id: "prod_1", type_id: BOOK_TYPE_ID, options: [], variants: [] });

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any });

    expect(graph).not.toHaveBeenCalled();
  });

  it("is a no-op for a product whose type doesn't match", async () => {
    const { container } = makeContainer({ id: "prod_1", type_id: "ptyp_other", options: [], variants: [] });

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any });

    expect(createOptionsRunMock).not.toHaveBeenCalled();
    expect(createVariantsRunMock).not.toHaveBeenCalled();
  });

  it("creates an exclusive Format option and paper/digital variants for a fresh Book-type product", async () => {
    const { container } = makeContainer({
      id: "prod_1",
      type_id: BOOK_TYPE_ID,
      options: [],
      variants: [],
    });

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any });

    // is_exclusive: true matters — without it the option defaults to
    // globally shared (is_exclusive: false in the DB), and the second Book
    // product ever created fails with "Product option with title: Format,
    // already exists." (IDX_product_option_global_title_unique). Reproduced
    // against a real local Medusa instance before this fix.
    expect(createOptionsRunMock).toHaveBeenCalledWith({
      input: {
        product_id: "prod_1",
        add: [{ title: "Format", values: ["Paper", "Digital"], is_exclusive: true }],
      },
    });
    expect(createVariantsRunMock).toHaveBeenCalledWith({
      input: {
        product_variants: [
          {
            product_id: "prod_1",
            title: "Paper",
            sku: "prod_1-paper",
            options: { Format: "Paper" },
            metadata: { kind: "paper" },
          },
        ],
      },
    });
  });

  it("carries every other existing option's value onto the new variants (e.g. Admin's default option)", async () => {
    const { container } = makeContainer({
      id: "prod_1",
      type_id: BOOK_TYPE_ID,
      // Admin's "Create Product" form gives every product this pair by
      // default when Options is left untouched — a variant that only names
      // "Format" and omits it is rejected with "Product has N option values
      // but there were 1 provided ... for the variant".
      options: [{ id: "opt_default", title: "Default option", values: [{ value: "Default option value" }] }],
      variants: [],
    });

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any });

    expect(createVariantsRunMock).toHaveBeenCalledWith({
      input: {
        product_variants: [
          expect.objectContaining({
            options: { "Default option": "Default option value", Format: "Paper" },
          }),
        ],
      },
    });
  });

  it("is idempotent — does nothing if the product already has a paper or digital variant", async () => {
    const { container } = makeContainer({
      id: "prod_1",
      type_id: BOOK_TYPE_ID,
      options: [{ id: "opt_1", title: "Format", values: [{ value: "Paper" }, { value: "Digital" }] }],
      variants: [{ metadata: { kind: "paper" } }],
    });

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any });

    expect(createOptionsRunMock).not.toHaveBeenCalled();
    expect(createVariantsRunMock).not.toHaveBeenCalled();
  });

  it("adds the missing value to an existing Format option instead of creating a new option", async () => {
    const { container } = makeContainer({
      id: "prod_1",
      type_id: BOOK_TYPE_ID,
      // An admin already started building this by hand: option exists with
      // only "Paper", no variants yet.
      options: [{ id: "opt_1", title: "Format", values: [{ value: "Paper" }] }],
      variants: [],
    });

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any });

    expect(createOptionsRunMock).toHaveBeenCalledWith({
      input: {
        product_id: "prod_1",
        update: [{ product_option_id: "opt_1", add: [{ value: "Digital" }] }],
      },
    });
    expect(createVariantsRunMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the product no longer exists", async () => {
    const { container } = makeContainer(undefined);

    await autoAddBookEditionsHandler({ event: { data: { id: "prod_missing" } }, container: container as any });

    expect(createOptionsRunMock).not.toHaveBeenCalled();
    expect(createVariantsRunMock).not.toHaveBeenCalled();
  });

  it("swallows a workflow failure (e.g. SKU collision) instead of throwing — never blocks the product save", async () => {
    createVariantsRunMock.mockRejectedValueOnce(new Error("duplicate sku"));
    const errorLog = vi.fn();
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "prod_1", type_id: BOOK_TYPE_ID, options: [], variants: [] }],
    });
    const container = {
      resolve: (key: string) => {
        if (key === "query") return { graph };
        if (key === "logger") return { error: errorLog, warn: vi.fn(), info: vi.fn() };
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await expect(
      autoAddBookEditionsHandler({ event: { data: { id: "prod_1" } }, container: container as any }),
    ).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining("duplicate sku"));
  });
});
