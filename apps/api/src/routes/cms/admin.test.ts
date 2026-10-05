import { afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));

const { default: router } = await import("./admin");
const app = express();
app.use(express.json());
app.use(router);
const admin = (r: request.Test) => r.set("x-test-admin", "1");

afterAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-%"));
});

describe("admin CMS items", () => {
  it("requires admin", async () => {
    expect((await request(app).get("/admin/cms/items?type=article")).status).toBe(403);
  });

  it("creates, reads, updates and deletes an article", async () => {
    const created = await admin(request(app).post("/admin/cms/items")).send({
      type: "article",
      slug: "test-cms-crud",
      titleAr: "مقال تجريبي",
      bodyAr: "<p>نص</p><script>x()</script>",
      status: "draft",
    });
    expect(created.status).toBe(201);
    expect(created.body.bodyAr).toBe("<p>نص</p>");
    expect(created.body.publishedAt).toBeNull();

    const id = created.body.id;
    const got = await admin(request(app).get(`/admin/cms/items/${id}`));
    expect(got.body.titleAr).toBe("مقال تجريبي");

    const updated = await admin(request(app).put(`/admin/cms/items/${id}`)).send({
      ...got.body,
      status: "published",
      publishedAt: null,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("published");
    expect(updated.body.publishedAt).not.toBeNull();

    const preview = await admin(request(app).get(`/admin/cms/preview/test-cms-crud`));
    expect(preview.status).toBe(200);
    expect(preview.body.item.id).toBe(id);

    expect((await admin(request(app).delete(`/admin/cms/items/${id}`))).status).toBe(204);
    expect((await admin(request(app).get(`/admin/cms/items/${id}`))).status).toBe(404);
  });

  it("creates with an Arabic-only title and generates a slug", async () => {
    const r = await admin(request(app).post("/admin/cms/items")).send({ type: "news", titleAr: "خبر فقط بالعربية" });
    expect(r.status).toBe(201);
    expect(r.body.slug).toMatch(/^news-[a-f0-9]{8}$/);
    await db.delete(contentItems).where(like(contentItems.slug, r.body.slug));
  });

  it("de-duplicates generated slugs and rejects an explicit duplicate with 409", async () => {
    const a = await admin(request(app).post("/admin/cms/items")).send({ type: "study", titleAr: "د", titleEn: "Test CMS Dup" });
    const b = await admin(request(app).post("/admin/cms/items")).send({ type: "news", titleAr: "د", titleEn: "Test CMS Dup" });
    expect(a.body.slug).toBe("test-cms-dup");
    expect(b.body.slug).toBe("test-cms-dup-2");
    const c = await admin(request(app).post("/admin/cms/items")).send({ type: "article", titleAr: "د", slug: "test-cms-dup" });
    expect(c.status).toBe(409);
  });

  it("returns 400 with issues for invalid details", async () => {
    const r = await admin(request(app).post("/admin/cms/items")).send({
      type: "publication",
      titleAr: "x",
      slug: "test-cms-bad",
      details: { kind: "magazine" },
    });
    expect(r.status).toBe(400);
    expect(r.body.issues[0].path).toEqual(["details", "kind"]);
  });

  it("refuses to change an item's type", async () => {
    const r = await admin(request(app).post("/admin/cms/items")).send({ type: "news", titleAr: "x", slug: "test-cms-type" });
    const u = await admin(request(app).put(`/admin/cms/items/${r.body.id}`)).send({ ...r.body, type: "article" });
    expect(u.status).toBe(400);
  });

  it("lists by type with status filter and search", async () => {
    await admin(request(app).post("/admin/cms/items")).send({ type: "observatory", titleAr: "رصد", titleEn: "Test CMS Needle", slug: "test-cms-list", details: { kind: "daily_brief" } });
    const r = await admin(request(app).get("/admin/cms/items?type=observatory&status=draft&q=Needle"));
    expect(r.status).toBe(200);
    expect(r.body.items.map((i: any) => i.slug)).toContain("test-cms-list");
    expect(r.body.total).toBeGreaterThanOrEqual(1);
  });
});
