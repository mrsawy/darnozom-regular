import { describe, it, expect, vi } from "vitest";
import { BookNotFoundError, saveBookProfile, type SaveProfileDeps } from "./save-book-profile";
import type { BookProfileInput } from "./book-input";

const input: BookProfileInput = {
  authors: ["أحمد يوسف", "Omar Ali"], editors: [], translators: [], publisher: "دار نظم",
  isbn: null, external_id: null, publication_year: 2024, edition_number: 1, pages: 300,
  volumes: 1, language: "ar", primary_category_id: "pcat_fiqh", keywords: [], target_audience: null,
  table_of_contents: null, digital_rights: false,
};

function deps(product: { id: string; metadata: Record<string, unknown> | null; category_ids: string[] } | null) {
  const d: SaveProfileDeps = {
    repo: {
      listBookProfiles: vi.fn(async () => []),
      createBookProfiles: vi.fn(async (x) => ({ id: "bp_1", ...x }) as never),
      updateBookProfiles: vi.fn(),
    },
    getProduct: vi.fn(async () => product),
    updateProduct: vi.fn(async () => undefined),
  };
  return d;
}

describe("saveBookProfile", () => {
  it("stores the profile, mirrors authors into metadata.author and adds the primary category", async () => {
    const d = deps({ id: "prod_1", metadata: { isFeatured: true }, category_ids: ["pcat_extra"] });
    const row = await saveBookProfile(d, "prod_1", input);
    expect(row.product_id).toBe("prod_1");
    expect(d.updateProduct).toHaveBeenCalledWith("prod_1", {
      metadata: { isFeatured: true, author: "أحمد يوسف، Omar Ali" },
      category_ids: ["pcat_extra", "pcat_fiqh"],
    });
  });

  it("does not touch categories when the primary one is already assigned", async () => {
    const d = deps({ id: "prod_1", metadata: null, category_ids: ["pcat_fiqh"] });
    await saveBookProfile(d, "prod_1", input);
    expect(d.updateProduct).toHaveBeenCalledWith("prod_1", {
      metadata: { author: "أحمد يوسف، Omar Ali" },
    });
  });

  it("throws BookNotFoundError for an unknown product", async () => {
    await expect(saveBookProfile(deps(null), "prod_x", input)).rejects.toBeInstanceOf(BookNotFoundError);
  });
});
