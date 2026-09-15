import { describe, it, expect, vi } from "vitest";
import fs from "fs/promises";
import { runMigrateBooks } from "./run-migrate-books";

vi.mock("fs/promises", () => ({
  default: { writeFile: vi.fn().mockResolvedValue(undefined) },
}));

describe("runMigrateBooks", () => {
  it("writes the mapping file keyed by bookId", async () => {
    const migrateBooksFn = vi.fn().mockResolvedValue([
      { bookId: 1, medusaProductId: "prod_1", paperVariantId: "v_p1", digitalVariantId: null },
      { bookId: 2, medusaProductId: "prod_2", paperVariantId: null, digitalVariantId: "v_d2" },
    ]);

    await runMigrateBooks({
      migrateBooksFn,
      booksDb: {} as any,
      medusaContainer: {} as any,
      outputPath: "/tmp/mapping.json",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/tmp/mapping.json",
      JSON.stringify(
        {
          "1": { medusaProductId: "prod_1", paperVariantId: "v_p1", digitalVariantId: null },
          "2": { medusaProductId: "prod_2", paperVariantId: null, digitalVariantId: "v_d2" },
        },
        null,
        2,
      ),
      "utf-8",
    );
  });
});
