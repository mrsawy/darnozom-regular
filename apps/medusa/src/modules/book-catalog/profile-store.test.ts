import { describe, it, expect } from "vitest";
import {
  BookProfileConflictError,
  findProfileByIdentity,
  upsertBookProfile,
  type BookProfileRepo,
  type BookProfileRow,
} from "./profile-store";
import type { BookProfileInput } from "../../lib/book-input";

function fakeRepo(rows: BookProfileRow[] = []): BookProfileRepo & { rows: BookProfileRow[] } {
  return {
    rows,
    async listBookProfiles(filters) {
      return rows.filter((r) =>
        Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
      );
    },
    async createBookProfiles(data) {
      const row = { id: `bp_${rows.length + 1}`, ...data } as BookProfileRow;
      rows.push(row);
      return row;
    },
    async updateBookProfiles(data) {
      const i = rows.findIndex((r) => r.id === data.id);
      rows[i] = { ...rows[i], ...data } as BookProfileRow;
      return rows[i];
    },
  };
}

const input: BookProfileInput = {
  authors: ["A"], editors: [], translators: [], publisher: null, isbn: "9780306406157",
  external_id: null, publication_year: null, edition_number: null, pages: null, volumes: 1,
  language: "ar", primary_category_id: null, keywords: [], target_audience: null,
  table_of_contents: null, digital_rights: false,
};

describe("upsertBookProfile", () => {
  it("creates a profile for a product, then updates the same row", async () => {
    const repo = fakeRepo();
    const created = await upsertBookProfile(repo, "prod_1", input);
    expect(created.product_id).toBe("prod_1");
    const updated = await upsertBookProfile(repo, "prod_1", { ...input, pages: 200 });
    expect(updated.id).toBe(created.id);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].pages).toBe(200);
  });

  it("refuses an ISBN that already belongs to another product", async () => {
    const repo = fakeRepo();
    await upsertBookProfile(repo, "prod_1", input);
    await expect(upsertBookProfile(repo, "prod_2", input)).rejects.toBeInstanceOf(
      BookProfileConflictError,
    );
  });

  it("refuses an external_id that already belongs to another product", async () => {
    const repo = fakeRepo();
    await upsertBookProfile(repo, "prod_1", { ...input, isbn: null, external_id: "gpt-1" });
    await expect(
      upsertBookProfile(repo, "prod_2", { ...input, isbn: null, external_id: "gpt-1" }),
    ).rejects.toThrow(/external_id gpt-1/);
  });
});

describe("findProfileByIdentity", () => {
  it("finds by ISBN first, then external_id", async () => {
    const repo = fakeRepo();
    await upsertBookProfile(repo, "prod_1", { ...input, external_id: "gpt-1" });
    expect((await findProfileByIdentity(repo, { isbn: "9780306406157" }))?.product_id).toBe("prod_1");
    expect((await findProfileByIdentity(repo, { external_id: "gpt-1" }))?.product_id).toBe("prod_1");
    expect(await findProfileByIdentity(repo, {})).toBeNull();
  });
});
