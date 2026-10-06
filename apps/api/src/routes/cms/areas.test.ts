import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentAreas, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";
import { ensureContentAreas } from "../../lib/cms/areas";

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));
const { default: areasRouter } = await import("./areas");
const { default: adminRouter } = await import("./admin");
const app = express();
app.use(express.json());
app.use(areasRouter);
app.use(adminRouter);
const admin = (r: request.Test) => r.set("x-test-admin", "1");

beforeAll(async () => {
  await ensureContentAreas();
});
afterAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-cms-area-%"));
  await db.delete(contentAreas).where(like(contentAreas.slug, "test-area-%"));
});

describe("content areas", () => {
  it("seeds the default areas and serves them publicly", async () => {
    const r = await request(app).get("/cms/areas");
    expect(r.status).toBe(200);
    expect(r.body.map((a: any) => a.slug)).toEqual(expect.arrayContaining(["sharia_policy", "public_policy_admin", "leadership_governance"]));
  });

  it("requires admin to write", async () => {
    expect((await request(app).post("/admin/cms/areas").send({ slug: "test-area-x", labelAr: "س" })).status).toBe(403);
  });

  it("creates, updates, rejects duplicates and bad slugs", async () => {
    const c = await admin(request(app).post("/admin/cms/areas")).send({ slug: "test-area-a", labelAr: "مجال", labelEn: "Area" });
    expect(c.status).toBe(201);
    expect((await admin(request(app).post("/admin/cms/areas")).send({ slug: "test-area-a", labelAr: "x" })).status).toBe(409);
    expect((await admin(request(app).post("/admin/cms/areas")).send({ slug: "Bad Slug!", labelAr: "x" })).status).toBe(400);
    const u = await admin(request(app).put(`/admin/cms/areas/${c.body.id}`)).send({ labelAr: "جديد", labelEn: "New", isActive: false });
    expect(u.status).toBe(200);
    expect(u.body).toMatchObject({ slug: "test-area-a", labelAr: "جديد", isActive: false });
  });

  it("accepts content in a db area, rejects unknown areas, and blocks deleting an area in use", async () => {
    const a = await admin(request(app).post("/admin/cms/areas")).send({ slug: "test-area-b", labelAr: "ب" });
    const item = { type: "article", slug: "test-cms-area-1", titleAr: "مقال", area: "test-area-b" };
    expect((await admin(request(app).post("/admin/cms/items")).send({ ...item, area: "nope-area" })).status).toBe(400);
    expect((await admin(request(app).post("/admin/cms/items")).send(item)).status).toBe(201);
    const del = await admin(request(app).delete(`/admin/cms/areas/${a.body.id}`));
    expect(del.status).toBe(409);
  });

  it("deletes an unused area", async () => {
    const a = await admin(request(app).post("/admin/cms/areas")).send({ slug: "test-area-c", labelAr: "ج" });
    expect((await admin(request(app).delete(`/admin/cms/areas/${a.body.id}`))).status).toBe(204);
  });

  it("reorders areas", async () => {
    const list = (await admin(request(app).get("/admin/cms/areas"))).body as { id: number }[];
    const ids = list.map((x) => x.id).reverse();
    expect((await admin(request(app).put("/admin/cms/areas/order")).send({ ids })).status).toBe(204);
    const after = (await admin(request(app).get("/admin/cms/areas"))).body as { id: number }[];
    expect(after.map((x) => x.id)).toEqual(ids);
    await admin(request(app).put("/admin/cms/areas/order")).send({ ids: ids.slice().reverse() });
  });
});
