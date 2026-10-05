import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";
import { createItem } from "../../lib/cms/repo";
import { parseContentItem } from "../../lib/cms/schemas";

const { default: router } = await import("./public");
const app = express();
app.use(router);

async function seed(body: Record<string, unknown>) {
  const p = parseContentItem(body);
  if (!p.ok) throw new Error(JSON.stringify(p.issues));
  return createItem(p.value);
}

beforeAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-pub-%"));
  await seed({ type: "article", slug: "test-cms-pub-a1", titleAr: "أ", status: "published", area: "sharia_policy", publishedAt: "2026-01-02T00:00:00Z" });
  await seed({ type: "article", slug: "test-cms-pub-a2", titleAr: "ب", status: "published", area: "sharia_policy", publishedAt: "2026-01-03T00:00:00Z" });
  await seed({ type: "article", slug: "test-cms-pub-draft", titleAr: "مسودة", status: "draft" });
  await seed({ type: "event", slug: "test-cms-pub-future", titleAr: "قادمة", status: "published", details: { kind: "seminar", startsAt: "2099-01-01T10:00:00+02:00" } });
  await seed({ type: "event", slug: "test-cms-pub-past", titleAr: "سابقة", status: "published", details: { kind: "workshop", startsAt: "2001-01-01T10:00:00+02:00" } });
  await seed({ type: "event", slug: "test-cms-pub-tba", titleAr: "بلا موعد", status: "published", details: { kind: "workshop" } });
});

afterAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-pub-%"));
});

const slugs = (body: any) => body.items.map((i: any) => i.slug);

describe("public CMS API", () => {
  it("lists only published items, newest first", async () => {
    const r = await request(app).get("/cms/items?type=article&area=sharia_policy&pageSize=48");
    expect(r.status).toBe(200);
    const s = slugs(r.body);
    expect(s).not.toContain("test-cms-pub-draft");
    expect(s.indexOf("test-cms-pub-a2")).toBeLessThan(s.indexOf("test-cms-pub-a1"));
  });

  it("filters events by upcoming (incl. no date) and past", async () => {
    const up = slugs((await request(app).get("/cms/items?type=event&when=upcoming&pageSize=48")).body);
    expect(up).toContain("test-cms-pub-future");
    expect(up).toContain("test-cms-pub-tba");
    expect(up).not.toContain("test-cms-pub-past");
    const past = slugs((await request(app).get("/cms/items?type=event&when=past&pageSize=48")).body);
    expect(past).toContain("test-cms-pub-past");
  });

  it("filters by kind", async () => {
    const r = slugs((await request(app).get("/cms/items?type=event&kind=seminar&pageSize=48")).body);
    expect(r).toContain("test-cms-pub-future");
    expect(r).not.toContain("test-cms-pub-past");
  });

  it("rejects an unknown type with 400", async () => {
    expect((await request(app).get("/cms/items?type=book")).status).toBe(400);
  });

  it("returns a published item with related items, and 404 for drafts", async () => {
    const r = await request(app).get("/cms/items/by-slug/test-cms-pub-a1");
    expect(r.status).toBe(200);
    expect(r.body.item.slug).toBe("test-cms-pub-a1");
    expect(r.body.related.map((i: any) => i.slug)).toContain("test-cms-pub-a2");
    expect((await request(app).get("/cms/items/by-slug/test-cms-pub-draft")).status).toBe(404);
  });

  it("serves the home payload without drafts", async () => {
    const r = await request(app).get("/cms/home");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.articles)).toBe(true);
    expect(r.body.articles.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(r.body)).not.toContain("test-cms-pub-draft");
    expect(r.body.observatory).toHaveProperty("lead");
  });
});
