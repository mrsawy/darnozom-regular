import { z } from "zod";
import { isValidIsbn, normalizeIsbn } from "./book-text";

const personName = z.string().trim().min(1).max(200);
const people = z.array(personName).max(20);
const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullish().transform((v) => v ?? null);
const maxYear = new Date().getFullYear() + 1;

export const bookProfileSchema = z.object({
  authors: people.min(1, "at least one author is required"),
  editors: people.default([]),
  translators: people.default([]),
  publisher: optionalText(200),
  isbn: z
    .string()
    .nullish()
    .transform((v) => normalizeIsbn(v))
    .refine((v) => v === null || isValidIsbn(v), "isbn is not a valid ISBN-10 or ISBN-13"),
  external_id: optionalText(100),
  publication_year: optionalInt(1000, maxYear),
  edition_number: optionalInt(1, 200),
  pages: optionalInt(1, 100_000),
  volumes: z.number().int().min(1).max(500).default(1),
  language: z.enum(["ar", "en", "both"]),
  primary_category_id: optionalText(100),
  keywords: z
    .array(z.string().trim().min(1).max(60))
    .max(30)
    .default([])
    // Case-insensitive dedupe that keeps the first spelling ("Waqf", not "waqf").
    .transform((ks) => ks.filter((k, i) => ks.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i)),
  target_audience: optionalText(500),
  table_of_contents: optionalText(20_000),
  digital_rights: z.boolean().default(false),
});
export type BookProfileInput = z.output<typeof bookProfileSchema>;

const price = z.number().positive().max(1_000_000);

export const createBookSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    subtitle: optionalText(300),
    description: optionalText(20_000),
    status: z.enum(["draft", "published"]).default("draft"),
    sales_channel_id: z.string().trim().min(1),
    image_urls: z.array(z.string().url()).max(20).default([]),
    additional_category_ids: z.array(z.string().trim().min(1)).max(20).default([]),
    print: z
      .object({ price, stock: z.number().int().min(0).max(1_000_000).default(0) })
      .nullable()
      .default(null),
    digital: z.object({ price }).nullable().default(null),
    profile: bookProfileSchema,
  })
  .superRefine((v, ctx) => {
    if (!v.print && !v.digital) {
      ctx.addIssue({
        code: "custom",
        path: ["print"],
        message: "a book needs a print edition, a digital edition, or both",
      });
    }
    if (v.digital && !v.profile.digital_rights) {
      ctx.addIssue({
        code: "custom",
        path: ["digital"],
        message: "a digital edition needs digital distribution rights (profile.digital_rights)",
      });
    }
  });
export type CreateBookInput = z.output<typeof createBookSchema>;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function toResult<T>(r: { success: true; data: T } | { success: false; error: z.ZodError }): ParseResult<T> {
  if (r.success) return { ok: true, value: r.data };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
  };
}

export function parseBookProfile(raw: unknown): ParseResult<BookProfileInput> {
  return toResult(bookProfileSchema.safeParse(raw));
}

export function parseCreateBook(raw: unknown): ParseResult<CreateBookInput> {
  return toResult(createBookSchema.safeParse(raw));
}
