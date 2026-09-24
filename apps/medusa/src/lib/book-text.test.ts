import { describe, it, expect } from "vitest";
import { isValidIsbn, normalizeIsbn, normalizeSearchText, searchTokens } from "./book-text";

describe("normalizeSearchText", () => {
  it("treats common Arabic spelling variants as the same text", () => {
    const forms = ["أصول الفقه", "اصول الفقة", "أُصُولُ الفِقْهِ", "إصول  الفقــه"];
    const normalized = forms.map(normalizeSearchText);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe("اصول الفقه");
  });

  it("folds alef maqsura, hamza carriers and case; drops punctuation", () => {
    expect(normalizeSearchText("مُصطفى")).toBe("مصطفي");
    expect(normalizeSearchText("مسؤولية")).toBe(normalizeSearchText("مسوولية"));
    expect(normalizeSearchText("Public-Policy, 2nd ed.")).toBe("public policy 2nd ed");
  });

  it("returns an empty string for missing input", () => {
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
  });
});

describe("searchTokens", () => {
  it("splits a normalized query into words", () => {
    expect(searchTokens("  الإدارة   العامة ")).toEqual(["الاداره", "العامه"]);
    expect(searchTokens("")).toEqual([]);
  });
});

describe("ISBN", () => {
  it("normalizes hyphens, spaces and a lowercase x", () => {
    expect(normalizeIsbn("978-0-306-40615-7")).toBe("9780306406157");
    expect(normalizeIsbn(" 0 8044 2957 x ")).toBe("080442957X");
    expect(normalizeIsbn("")).toBeNull();
    expect(normalizeIsbn(null)).toBeNull();
  });

  it("validates ISBN-13 and ISBN-10 checksums", () => {
    expect(isValidIsbn("978-0-306-40615-7")).toBe(true);
    expect(isValidIsbn("0-306-40615-2")).toBe(true);
    expect(isValidIsbn("0-8044-2957-X")).toBe(true);
    expect(isValidIsbn("978-0-306-40615-8")).toBe(false);
    expect(isValidIsbn("12345")).toBe(false);
    expect(isValidIsbn(null)).toBe(false);
  });
});
