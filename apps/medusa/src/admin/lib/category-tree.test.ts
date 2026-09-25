import { describe, it, expect } from "vitest";
import { buildCategorySections } from "./category-tree";

describe("buildCategorySections", () => {
  it("groups book subcategories under their sections, labelled Arabic / English", () => {
    const sections = buildCategorySections([
      { id: "s1", name: "Islamic Sciences", handle: "islamic-sciences", parent_category_id: null, metadata: { darnozom: "book", name_ar: "العلوم الإسلامية" } },
      { id: "c1", name: "Hadith", handle: "hadith", parent_category_id: "s1", metadata: { darnozom: "book", name_ar: "الحديث" } },
      { id: "x1", name: "Shirts", handle: "shirts", parent_category_id: null, metadata: null },
    ]);
    expect(sections).toEqual([
      { id: "s1", label: "العلوم الإسلامية / Islamic Sciences", children: [{ id: "c1", label: "الحديث / Hadith" }] },
    ]);
  });
});
