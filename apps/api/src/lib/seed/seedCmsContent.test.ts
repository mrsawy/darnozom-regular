import { describe, expect, it } from "vitest";
import { featuredSlideInput, parseContentItem } from "../cms/schemas";
import { SEED_ITEMS, SEED_SLIDES } from "./cmsSeedData";

describe("CMS seed data", () => {
  it("every item passes validation and is published", () => {
    for (const item of SEED_ITEMS) {
      const r = parseContentItem(item);
      expect(r.ok, JSON.stringify(item).slice(0, 80)).toBe(true);
      if (r.ok) expect(r.value.status).toBe("published");
    }
  });
  it("has unique slugs and covers every home section", () => {
    const slugs = SEED_ITEMS.map((i: any) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const types = new Set(SEED_ITEMS.map((i: any) => i.type));
    for (const t of ["observatory", "article", "study", "publication", "news", "event"]) expect(types.has(t)).toBe(true);
  });
  it("seeded events have no invented dates", () => {
    for (const i of SEED_ITEMS as any[]) if (i.type === "event") expect(i.details.startsAt).toBeUndefined();
  });
  it("slides are valid custom cards", () => {
    expect(SEED_SLIDES).toHaveLength(4);
    for (const s of SEED_SLIDES) expect(featuredSlideInput.safeParse(s).success).toBe(true);
  });
});
