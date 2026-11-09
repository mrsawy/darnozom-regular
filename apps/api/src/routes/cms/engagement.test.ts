import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, contentItems } from "@workspace/db";
import { like } from "drizzle-orm";
import { createItem } from "../../lib/cms/repo";
import { parseContentItem } from "../../lib/cms/schemas";

let session: { id: string; name: string; role: string } | null = null;
vi.mock("../../middlewares/authMiddleware", () => ({
  getSessionUser: async () => session && { ...session, email: `${session.id}@t.test` },
  isAdminRole: (r: string) => r === "admin",
}));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) => (session?.role === "admin" ? next() : res.status(403).json({ error: "Forbidden" })),
}));

const { default: router } = await import("./engagement");
const app = express();
app.use(express.json());
app.use(router);

let open: number, closed: number, draft: number;
async function seed(body: Record<string, unknown>) {
  const p = parseContentItem({ type: "article", titleAr: "ع", status: "published", ...body });
  if (!p.ok) throw new Error(JSON.stringify(p.issues));
  return (await createItem(p.value)).id;
}

beforeAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-eng-%"));
  open = await seed({ slug: "test-eng-open" });
  closed = await seed({ slug: "test-eng-closed", likesEnabled: false, commentsEnabled: false });
  draft = await seed({ slug: "test-eng-draft", status: "draft" });
});
afterAll(async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-eng-%"));
});

describe("engagement API", () => {
  it("counts views and shares, validating the channel", async () => {
    expect((await request(app).post(`/cms/items/${open}/view`)).body.viewCount).toBe(1);
    expect((await request(app).post(`/cms/items/${open}/share`).send({ channel: "x" })).body.shareCount).toBe(1);
    expect((await request(app).post(`/cms/items/${open}/share`).send({ channel: "myspace" })).status).toBe(400);
    expect((await request(app).post(`/cms/items/${draft}/view`)).status).toBe(404);
  });

  it("lets guests like via a cookie identity; likes are idempotent and per guest", async () => {
    session = null;
    const g1 = request.agent(app);
    await g1.put(`/cms/items/${open}/like`);
    expect((await g1.put(`/cms/items/${open}/like`)).body).toMatchObject({ liked: true, likeCount: 1 });
    expect((await g1.get(`/cms/items/${open}/engagement`)).body).toMatchObject({ liked: true, likeCount: 1, viewCount: 1, shareCount: 1 });
    // a different guest (no cookie) sees the like count but not liked, and adds their own
    expect((await request(app).get(`/cms/items/${open}/engagement`)).body).toMatchObject({ liked: false, likeCount: 1 });
    expect((await request.agent(app).put(`/cms/items/${open}/like`)).body.likeCount).toBe(2);
    expect((await g1.delete(`/cms/items/${open}/like`)).body).toMatchObject({ liked: false, likeCount: 1 });
  });

  it("ignores a forged guest cookie", async () => {
    session = null;
    const forged = `dn_guest=00000000-0000-0000-0000-000000000000.bogus`;
    const r = await request(app).put(`/cms/items/${open}/like`).set("Cookie", forged);
    expect(r.status).toBe(200);
    expect(r.headers["set-cookie"]?.[0]).toMatch(/^dn_guest=(?!00000000)/); // a fresh, valid identity was issued
  });

  it("signed-in users like under their account", async () => {
    session = { id: "u1", name: "Ali", role: "client" };
    expect((await request(app).put(`/cms/items/${open}/like`)).body.liked).toBe(true);
    expect((await request(app).get(`/cms/items/${open}/engagement`)).body.liked).toBe(true);
    await request(app).delete(`/cms/items/${open}/like`);
  });

  it("rejects likes and comments when the admin has disabled them", async () => {
    session = null;
    expect((await request(app).put(`/cms/items/${closed}/like`)).status).toBe(403);
    expect((await request(app).post(`/cms/items/${closed}/comments`).send({ body: "hi" })).status).toBe(403);
    expect((await request(app).get(`/cms/items/${closed}/comments`)).body).toEqual({ enabled: false, comments: [] });
  });

  it("guest comments need a name, are flagged, and only the guest can delete them", async () => {
    session = null;
    const g = request.agent(app);
    expect((await g.post(`/cms/items/${open}/comments`).send({ body: "hello" })).status).toBe(400);
    const c = await g.post(`/cms/items/${open}/comments`).send({ body: "  رائع  ", guestName: " ليلى " });
    expect(c.status).toBe(201);
    expect(c.body).toMatchObject({ body: "رائع", authorName: "ليلى", isGuest: true, mine: true });
    expect((await g.get(`/cms/items/${open}/comments`)).body.comments[0].mine).toBe(true);
    expect((await request(app).get(`/cms/items/${open}/comments`)).body.comments[0].mine).toBe(false);
    expect((await request(app).delete(`/cms/comments/${c.body.id}`)).status).toBe(404);
    expect((await g.delete(`/cms/comments/${c.body.id}`)).status).toBe(204);
  });

  it("signed-in comments use the account name; admins can hide and delete", async () => {
    session = { id: "u2", name: "Sara", role: "client" };
    const c = await request(app).post(`/cms/items/${open}/comments`).send({ body: "  رائع  ", guestName: "ignored" });
    expect(c.body).toMatchObject({ authorName: "Sara", isGuest: false });
    expect((await request(app).post(`/cms/items/${open}/comments`).send({ body: "   " })).status).toBe(400);

    session = { id: "u3", name: "Omar", role: "client" };
    expect((await request(app).delete(`/cms/comments/${c.body.id}`)).status).toBe(404);
    expect((await request(app).get(`/cms/items/${open}/comments`)).body.comments[0]).toMatchObject({ authorName: "Sara", mine: false });

    session = { id: "a1", name: "Admin", role: "admin" };
    expect((await request(app).patch(`/admin/cms/comments/${c.body.id}`).send({ status: "hidden" })).status).toBe(200);
    expect((await request(app).get(`/cms/items/${open}/comments`)).body.comments).toHaveLength(0);
    expect((await request(app).delete(`/admin/cms/comments/${c.body.id}`)).status).toBe(204);
  });
});
