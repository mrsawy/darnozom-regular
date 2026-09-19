import fs from "fs/promises";
import path from "path";
import type { MedusaContainer } from "@medusajs/framework/types";
import { migrateBooks, type BookMigrationResult } from "./migrate-books";

interface RunMigrateBooksArgs {
  migrateBooksFn?: typeof migrateBooks;
  booksDb: Parameters<typeof migrateBooks>[0]["booksDb"];
  medusaContainer: MedusaContainer;
  outputPath?: string;
}

export async function runMigrateBooks(args: RunMigrateBooksArgs): Promise<void> {
  const fn = args.migrateBooksFn ?? migrateBooks;
  const results = await fn({ booksDb: args.booksDb, medusaContainer: args.medusaContainer });

  const mapping: Record<string, Omit<BookMigrationResult, "bookId">> = {};
  for (const r of results) {
    mapping[String(r.bookId)] = {
      medusaProductId: r.medusaProductId,
      paperVariantId: r.paperVariantId,
      digitalVariantId: r.digitalVariantId,
    };
  }

  const outputPath =
    args.outputPath ?? path.join(__dirname, "migrate-books-mapping.json");
  await fs.writeFile(outputPath, JSON.stringify(mapping, null, 2), "utf-8");
  console.log(`Migrated ${results.length} books. Mapping written to ${outputPath}`);
}

// Medusa exec-script default export contract: receives { container }.
export default async function ({ container }: { container: MedusaContainer }) {
  const { db } = await import("@workspace/db");
  await runMigrateBooks({ booksDb: db, medusaContainer: container });
}
