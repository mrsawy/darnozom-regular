import { describe, it, expect } from "vitest";
import { descendantIds, relatedBooks, searchBooks, type BookSearchEntry, type CategoryNode } from "./book-search";

const categories: CategoryNode[] = [
  { id: "s_law", parent_category_id: null, name: "Islamic Law and Thought", name_ar: "الشريعة والفكر الإسلامي", handle: "islamic-law-thought" },
  { id: "c_fiqh", parent_category_id: "s_law", name: "Fiqh and Its Principles", name_ar: "الفقه وأصوله", handle: "fiqh-usul" },
  { id: "s_admin", parent_category_id: null, name: "Public Administration", name_ar: "الإدارة العامة", handle: "public-administration" },
];

function entry(id: string, over: Partial<BookSearchEntry> & { profile?: Partial<NonNullable<BookSearchEntry["profile"]>> }): BookSearchEntry {
  const { profile, ...rest } = over;
  return {
    product_id: id,
    title: id,
    subtitle: null,
    created_at: "2026-01-01T00:00:00Z",
    category_ids: [],
    formats: ["paper"],
    ...rest,
    profile: {
      id: `bp_${id}`, product_id: id, authors: [], editors: [], translators: [], publisher: null,
      isbn: null, external_id: null, publication_year: null, edition_number: null, pages: null,
      volumes: 1, language: "ar", primary_category_id: null, keywords: [], target_audience: null,
      table_of_contents: null, digital_rights: false, ...profile,
    },
  };
}

const books = [
  entry("usul", { title: "أصول الفقه الإسلامي", category_ids: ["c_fiqh"], created_at: "2026-03-01T00:00:00Z", profile: { authors: ["وهبة الزحيلي"], publisher: "دار الفكر", keywords: ["أصول", "اجتهاد"], isbn: "9780306406157" } }),
  entry("maqasid", { title: "مقاصد الشريعة", category_ids: ["s_law"], formats: ["paper", "digital"], created_at: "2026-02-01T00:00:00Z", profile: { authors: ["ابن عاشور"], publisher: "دار نظم", keywords: ["اجتهاد"], language: "both" } }),
  entry("gov", { title: "Public Governance", category_ids: ["s_admin"], formats: ["digital"], created_at: "2026-01-15T00:00:00Z", profile: { authors: ["John Smith"], publisher: "دار نظم", language: "en" } }),
];

describe("searchBooks", () => {
  const all = { limit: 24, offset: 0 };

  it("matches Arabic spelling variants in the title", () => {
    expect(searchBooks(books, categories, { ...all, q: "اصول الفقة" }).product_ids).toEqual(["usul"]);
  });

  it("finds books by author, publisher, keyword, ISBN and section name", () => {
    expect(searchBooks(books, categories, { ...all, q: "الزحيلي" }).product_ids).toEqual(["usul"]);
    expect(searchBooks(books, categories, { ...all, q: "دار نظم" }).product_ids).toEqual(["maqasid", "gov"]);
    expect(searchBooks(books, categories, { ...all, q: "اجتهاد" }).product_ids).toEqual(["usul", "maqasid"]);
    expect(searchBooks(books, categories, { ...all, q: "978-0-306-40615-7" }).product_ids).toEqual(["usul"]);
    expect(searchBooks(books, categories, { ...all, q: "الإدارة العامة" }).product_ids).toEqual(["gov"]);
  });

  it("filters a section including its subcategories", () => {
    expect(searchBooks(books, categories, { ...all, category_id: "s_law" }).product_ids).toEqual(["usul", "maqasid"]);
    expect(searchBooks(books, categories, { ...all, category_id: "c_fiqh" }).product_ids).toEqual(["usul"]);
  });

  it("filters by author, publisher, language and format", () => {
    expect(searchBooks(books, categories, { ...all, author: "ابن عاشور" }).product_ids).toEqual(["maqasid"]);
    expect(searchBooks(books, categories, { ...all, publisher: "دار نظم", format: "digital" }).product_ids).toEqual(["maqasid", "gov"]);
    expect(searchBooks(books, categories, { ...all, language: "en" }).product_ids).toEqual(["gov"]);
  });

  it("returns facets from the searched set, and paginates newest first", () => {
    const r = searchBooks(books, categories, { ...all, category_id: "s_law", limit: 1 });
    expect(r.count).toBe(2);
    expect(r.product_ids).toEqual(["usul"]);
    expect(r.facets.authors).toEqual([{ value: "ابن عاشور", count: 1 }, { value: "وهبة الزحيلي", count: 1 }]);
    expect(r.facets.publishers).toEqual([{ value: "دار الفكر", count: 1 }, { value: "دار نظم", count: 1 }]);
    const page2 = searchBooks(books, categories, { ...all, category_id: "s_law", limit: 1, offset: 1 });
    expect(page2.product_ids).toEqual(["maqasid"]);
  });

  it("ranks title matches above other matches", () => {
    const extra = entry("other", { title: "Something else", created_at: "2027-01-01T00:00:00Z", profile: { keywords: ["مقاصد"] } });
    expect(searchBooks([...books, extra], categories, { ...all, q: "مقاصد" }).product_ids).toEqual(["maqasid", "other"]);
  });
});

describe("descendantIds", () => {
  it("includes the root and all levels below it", () => {
    expect([...descendantIds(categories, "s_law")].sort()).toEqual(["c_fiqh", "s_law"]);
  });
});

describe("relatedBooks", () => {
  it("relates books by shared category, author or keyword — never the book itself, never by publisher alone", () => {
    expect(relatedBooks(books, "usul")).toEqual(["maqasid"]); // shared keyword "اجتهاد"
    expect(relatedBooks(books, "gov")).toEqual([]); // only the publisher in common
  });
});
