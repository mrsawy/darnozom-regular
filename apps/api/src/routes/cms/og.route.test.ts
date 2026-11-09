import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { resolve } from "node:path";
import { db, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";
import { createItem } from "../../lib/cms/repo";
import { parseContentItem } from "../../lib/cms/schemas";

process.env.SPA_INDEX_PATH = resolve(__dirname, "../../../../client/index.html");
const { default: router } = await import("./public");
const app = express();
app.use(router);

beforeAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-og-%"));
  for (const [slug, status] of [["test-og-pub", "published"], ["test-og-draft", "draft"]] as const) {
    const p = parseContentItem({ type: "article", slug, status, titleAr: "عنوان المقال", summaryAr: "ملخص المقال", coverImageUrl: "https://cdn.test/c.jpg" });
    if (!p.ok) throw new Error("bad seed");
    await createItem(p.value);
  }
});
afterAll(async () => { await db.delete(contentItems).where(like(contentItems.slug, "test-og-%")); });

describe("GET /cms/og/:slug", () => {
  it("serves the SPA shell with the item's Open Graph tags", async () => {
    const r = await request(app).get("/cms/og/test-og-pub");
    expect(r.status).toBe(200);
    expect(r.text).toContain('og:title" content="عنوان المقال"');
    expect(r.text).toContain('og:url" content="https://darnozom.com/articles/test-og-pub"');
    expect(r.text).toContain('og:image" content="https://cdn.test/c.jpg"');
    expect(r.text).toContain('id="root"');
    expect(r.text.match(/og:title/g)).toHaveLength(1);
  });
  it("404s for drafts and unknown slugs so nginx falls back to the plain shell", async () => {
    expect((await request(app).get("/cms/og/test-og-draft")).status).toBe(404);
    expect((await request(app).get("/cms/og/nope-nope")).status).toBe(404);
  });
});
