import type { BookProfileInput } from "../../lib/book-input";

export type BookProfileRow = BookProfileInput & { id: string; product_id: string };

export interface BookProfileRepo {
  listBookProfiles(filters: Record<string, unknown>): Promise<BookProfileRow[]>;
  createBookProfiles(data: Record<string, unknown>): Promise<BookProfileRow>;
  updateBookProfiles(data: Record<string, unknown>): Promise<BookProfileRow>;
}

export class BookProfileConflictError extends Error {}

async function assertUnique(
  repo: BookProfileRepo,
  field: "isbn" | "external_id",
  value: string | null,
  productId: string,
) {
  if (!value) return;
  const [other] = await repo.listBookProfiles({ [field]: value });
  if (other && other.product_id !== productId) {
    throw new BookProfileConflictError(
      `${field} ${value} already belongs to product ${other.product_id}`,
    );
  }
}

export async function upsertBookProfile(
  repo: BookProfileRepo,
  productId: string,
  input: BookProfileInput,
): Promise<BookProfileRow> {
  await assertUnique(repo, "isbn", input.isbn, productId);
  await assertUnique(repo, "external_id", input.external_id, productId);
  const [existing] = await repo.listBookProfiles({ product_id: productId });
  if (existing) return repo.updateBookProfiles({ id: existing.id, ...input });
  return repo.createBookProfiles({ product_id: productId, ...input });
}

export async function findProfileByIdentity(
  repo: BookProfileRepo,
  id: { isbn?: string | null; external_id?: string | null },
): Promise<BookProfileRow | null> {
  if (id.isbn) {
    const [row] = await repo.listBookProfiles({ isbn: id.isbn });
    if (row) return row;
  }
  if (id.external_id) {
    const [row] = await repo.listBookProfiles({ external_id: id.external_id });
    if (row) return row;
  }
  return null;
}
