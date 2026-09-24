import { describe, it, expect } from "vitest";
import { parseBookProfile, parseCreateBook } from "./book-input";

const profile = { authors: ["  د. أحمد يوسف "], language: "ar" };

describe("parseBookProfile", () => {
  it("fills defaults and trims", () => {
    const r = parseBookProfile(profile);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      authors: ["د. أحمد يوسف"],
      editors: [],
      translators: [],
      publisher: null,
      isbn: null,
      external_id: null,
      publication_year: null,
      edition_number: null,
      pages: null,
      volumes: 1,
      language: "ar",
      primary_category_id: null,
      keywords: [],
      target_audience: null,
      table_of_contents: null,
      digital_rights: false,
    });
  });

  it("requires at least one author and a known language", () => {
    const r = parseBookProfile({ authors: [], language: "fr" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join("\n")).toMatch(/authors/);
    expect(r.errors.join("\n")).toMatch(/language/);
  });

  it("normalizes a valid ISBN and rejects a bad checksum", () => {
    const good = parseBookProfile({ ...profile, isbn: "978-0-306-40615-7" });
    expect(good.ok && good.value.isbn).toBe("9780306406157");
    const bad = parseBookProfile({ ...profile, isbn: "978-0-306-40615-8" });
    expect(bad.ok).toBe(false);
  });

  it("dedupes keywords case-insensitively and bounds numbers", () => {
    const r = parseBookProfile({ ...profile, keywords: ["Waqf", "waqf", " الوقف "], pages: 320 });
    expect(r.ok && r.value.keywords).toEqual(["Waqf", "الوقف"]);
    expect(parseBookProfile({ ...profile, pages: 0 }).ok).toBe(false);
    expect(parseBookProfile({ ...profile, publication_year: 3000 }).ok).toBe(false);
  });
});

describe("parseCreateBook", () => {
  const base = {
    title: "السياسة الشرعية",
    sales_channel_id: "sc_1",
    profile,
  };

  it("accepts a print-only book", () => {
    const r = parseCreateBook({ ...base, print: { price: 120, stock: 5 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.print).toEqual({ price: 120, stock: 5 });
    expect(r.value.digital).toBeNull();
    expect(r.value.status).toBe("draft");
  });

  it("rejects a book with no edition", () => {
    const r = parseCreateBook(base);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join()).toMatch(/print edition, a digital edition, or both/);
  });

  it("rejects a digital edition without digital distribution rights", () => {
    const r = parseCreateBook({ ...base, digital: { price: 40 } });
    expect(r.ok).toBe(false);
    const ok = parseCreateBook({
      ...base,
      digital: { price: 40 },
      profile: { ...profile, digital_rights: true },
    });
    expect(ok.ok).toBe(true);
  });
});
