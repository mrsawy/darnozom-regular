import { describe, expect, it } from "vitest";
import { mergePublications } from "./darnozom-books";

const pub = (slug: string, date: string, kind = "report") =>
  ({ id: slug, type: "publication", slug, titleAr: slug, titleEn: "", summaryAr: "", summaryEn: "", coverImageUrl: "", publishedAt: date, details: { kind } }) as any;
const book = (id: string, date: string) => ({ id, title: id, imageUrl: "", href: `/services/store/books/${id}`, createdAt: date });

describe("mergePublications", () => {
  it("interleaves books and admin publications newest first and caps the count", () => {
    const out = mergePublications(
      [pub("r1", "2026-01-05"), pub("p1", "2026-01-01", "periodical")],
      [book("b1", "2026-01-03"), book("b2", "2026-01-06")],
      3,
    );
    expect(out.map((o) => o.key)).toEqual(["book:b2", "pub:r1", "book:b1"]);
    expect(out[0].kind).toBe("book");
    expect(out[1].href).toBe("/publications/r1");
  });
  it("works with no books (Medusa down)", () => {
    expect(mergePublications([pub("r1", "2026-01-05")], [], 4)).toHaveLength(1);
  });
});
