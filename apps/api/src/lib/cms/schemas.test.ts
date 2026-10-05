import { describe, expect, it } from "vitest";
import { featuredSlideInput, parseContentItem } from "./schemas";

describe("parseContentItem", () => {
  it("accepts a minimal article and fills defaults", () => {
    const r = parseContentItem({ type: "article", titleAr: "مقال" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("draft");
      expect(r.value.slug).toBe("");
      expect(r.value.details).toEqual({ relatedLinks: [] });
    }
  });
  it("rejects a missing Arabic title", () => {
    const r = parseContentItem({ type: "article", titleAr: "  " });
    expect(r.ok).toBe(false);
  });
  it("rejects an unknown observatory kind with a details path", () => {
    const r = parseContentItem({ type: "observatory", titleAr: "x", details: { kind: "monthly" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].path).toEqual(["details", "kind"]);
  });
  it("requires publication kind", () => {
    expect(parseContentItem({ type: "publication", titleAr: "x", details: {} }).ok).toBe(false);
    expect(parseContentItem({ type: "publication", titleAr: "x", details: { kind: "report" } }).ok).toBe(true);
  });
  it("accepts an event without startsAt and rejects endsAt before startsAt", () => {
    expect(parseContentItem({ type: "event", titleAr: "x", details: { kind: "seminar" } }).ok).toBe(true);
    const bad = parseContentItem({
      type: "event",
      titleAr: "x",
      details: { kind: "seminar", startsAt: "2026-11-02T10:00:00+02:00", endsAt: "2026-11-01T10:00:00+02:00" },
    });
    expect(bad.ok).toBe(false);
  });
  it("rejects slugs with spaces or uppercase after trimming", () => {
    expect(parseContentItem({ type: "news", titleAr: "x", slug: "bad slug" }).ok).toBe(false);
    const ok = parseContentItem({ type: "news", titleAr: "x", slug: "Good-Slug" });
    expect(ok.ok && ok.value.slug).toBe("good-slug");
  });
  it("rejects non-http, non-path image URLs", () => {
    expect(parseContentItem({ type: "news", titleAr: "x", coverImageUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseContentItem({ type: "news", titleAr: "x", coverImageUrl: "/seed/news.webp" }).ok).toBe(true);
  });
});

describe("featuredSlideInput", () => {
  it("requires title, href and image for custom cards", () => {
    expect(featuredSlideInput.safeParse({ sourceKind: "custom", titleAr: "t" }).success).toBe(false);
    expect(
      featuredSlideInput.safeParse({ sourceKind: "custom", titleAr: "t", href: "/academy", imageUrl: "/seed/hero.webp" })
        .success,
    ).toBe(true);
  });
  it("requires a linked id for content and book slides", () => {
    expect(featuredSlideInput.safeParse({ sourceKind: "content" }).success).toBe(false);
    expect(featuredSlideInput.safeParse({ sourceKind: "book", medusaProductId: "prod_1" }).success).toBe(true);
  });
});
