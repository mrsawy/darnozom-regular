import { afterAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems, featuredSlides } from "@workspace/db";
import { inArray, like } from "drizzle-orm";
import { createItem, resolveFeatured, updateItem } from "../../lib/cms/repo";
import { parseContentItem } from "../../lib/cms/schemas";

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));
const { default: router } = await import("./featured");
const app = express();
app.use(express.json());
app.use(router);
const admin = (r: request.Test) => r.set("x-test-admin", "1");
const created: number[] = [];

afterAll(async () => {
  if (created.length) await db.delete(featuredSlides).where(inArray(featuredSlides.id, created));
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-feat-%"));
});

describe("featured slides", () => {
  it("creates a custom slide and resolves it", async () => {
    const r = await admin(request(app).post("/admin/cms/featured")).send({
      sourceKind: "custom",
      titleAr: "test-cms-feat-custom",
      href: "/academy",
      imageUrl: "/seed/academy.webp",
    });
    expect(r.status).toBe(201);
    created.push(r.body.id);
    const cards = await resolveFeatured(50);
    expect(cards.find((c) => c.id === r.body.id)?.href).toBe("/academy");
  });

  it("fills linked content fields and drops the slide when the item is unpublished", async () => {
    const p = parseContentItem({ type: "study", slug: "test-cms-feat-study", titleAr: "دراسة مرتبطة", status: "published", coverImageUrl: "/seed/studySharia.webp" });
    if (!p.ok) throw new Error("bad seed");
    const item = await createItem(p.value);
    const r = await admin(request(app).post("/admin/cms/featured")).send({ sourceKind: "content", contentItemId: item.id, badgeAr: "دراسة" });
    created.push(r.body.id);

    let card = (await resolveFeatured(50)).find((c) => c.id === r.body.id);
    expect(card?.titleAr).toBe("دراسة مرتبطة");
    expect(card?.href).toBe("/studies/test-cms-feat-study");
    expect(card?.imageUrl).toBe("/seed/studySharia.webp");

    const draft = parseContentItem({ ...p.value, status: "draft" });
    if (!draft.ok) throw new Error("bad");
    await updateItem(item.id, draft.value);
    card = (await resolveFeatured(50)).find((c) => c.id === r.body.id);
    expect(card).toBeUndefined();
  });

  it("rejects invalid slides with 400", async () => {
    const r = await admin(request(app).post("/admin/cms/featured")).send({ sourceKind: "custom", titleAr: "x" });
    expect(r.status).toBe(400);
  });

  it("reorders slides", async () => {
    const [a, b] = created;
    expect((await admin(request(app).put("/admin/cms/featured/order")).send({ ids: [b, a] })).status).toBe(204);
    const list = (await admin(request(app).get("/admin/cms/featured"))).body as any[];
    const posA = list.find((s) => s.id === a).position;
    const posB = list.find((s) => s.id === b).position;
    expect(posB).toBeLessThan(posA);
  });

  it("toggles active and deletes", async () => {
    const id = created[0];
    const current = (await admin(request(app).get("/admin/cms/featured"))).body.find((s: any) => s.id === id);
    const u = await admin(request(app).put(`/admin/cms/featured/${id}`)).send({ ...current, isActive: false });
    expect(u.status).toBe(200);
    expect((await resolveFeatured(50)).some((c) => c.id === id)).toBe(false);
    expect((await admin(request(app).delete(`/admin/cms/featured/${id}`))).status).toBe(204);
  });
});
