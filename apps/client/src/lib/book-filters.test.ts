import { describe, it, expect } from "vitest";
import { bookFiltersToQuery, EMPTY_BOOK_FILTERS, readBookFilters } from "./book-filters";

describe("book filters in the URL", () => {
  it("reads all filters and maps legacy format names", () => {
    expect(readBookFilters("?q=فقه&category=pcat_1&author=ابن%20عاشور&publisher=دار&language=en&format=online")).toEqual({
      q: "فقه", category: "pcat_1", author: "ابن عاشور", publisher: "دار", language: "en", format: "digital",
    });
    expect(readBookFilters("")).toEqual(EMPTY_BOOK_FILTERS);
    expect(readBookFilters("?language=fr&format=weird").language).toBe("");
  });

  it("writes only non-default filters", () => {
    expect(bookFiltersToQuery({ ...EMPTY_BOOK_FILTERS, q: " فقه ", format: "paper" })).toBe("q=%D9%81%D9%82%D9%87&format=paper");
    expect(bookFiltersToQuery(EMPTY_BOOK_FILTERS)).toBe("");
  });
});
