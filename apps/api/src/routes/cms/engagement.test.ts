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
  requireAuth: async (req: any, res: any, next: any) => {
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    req.userId = session.id;
    req.userEmail = `${session.id}@t.test`;
    req.isAdmin = session.role === "admin";
    next();
  },
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

  it("requires sign-in to like, and likes are idempotent", async () => {
    session = null;
    expect((await request(app).put(`/cms/items/${open}/like`)).status).toBe(401);
    session = { id: "u1", name: "Ali", role: "client" };
    await request(app).put(`/cms/items/${open}/like`);
    const r = await request(app).put(`/cms/items/${open}/like`);
    expect(r.body).toMatchObject({ liked: true, likeCount: 1 });
    expect((await request(app).get(`/cms/items/${open}/engagement`)).body).toMatchObject({ liked: true, likeCount: 1, viewCount: 1, shareCount: 1 });
    expect((await request(app).delete(`/cms/items/${open}/like`)).body).toMatchObject({ liked: false, likeCount: 0 });
  });

  it("rejects likes and comments when the admin has disabled them", async () => {
    session = { id: "u1", name: "Ali", role: "client" };
    expect((await request(app).put(`/cms/items/${closed}/like`)).status).toBe(403);
    expect((await request(app).post(`/cms/items/${closed}/comments`).send({ body: "hi" })).status).toBe(403);
    expect((await request(app).get(`/cms/items/${closed}/comments`)).body).toEqual({ enabled: false, comments: [] });
  });

  it("posts, hides and deletes comments with correct permissions", async () => {
    session = { id: "u2", name: "Sara", role: "client" };
    const c = await request(app).post(`/cms/items/${open}/comments`).send({ body: "  رائع  " });
    expect(c.status).toBe(201);
    expect(c.body.body).toBe("رائع");
    expect((await request(app).post(`/cms/items/${open}/comments`).send({ body: "   " })).status).toBe(400);

    session = { id: "u3", name: "Omar", role: "client" };
    expect((await request(app).delete(`/cms/comments/${c.body.id}`)).status).toBe(404); // not the author
    const listed = await request(app).get(`/cms/items/${open}/comments`);
    expect(listed.body.comments[0]).toMatchObject({ authorName: "Sara", mine: false });

    session = { id: "a1", name: "Admin", role: "admin" };
    expect((await request(app).patch(`/admin/cms/comments/${c.body.id}`).send({ status: "hidden" })).status).toBe(200);
    expect((await request(app).get(`/cms/items/${open}/comments`)).body.comments).toHaveLength(0);
    expect((await request(app).get(`/cms/items/${open}/engagement`)).body.commentCount).toBe(0);
    expect((await request(app).delete(`/admin/cms/comments/${c.body.id}`)).status).toBe(204);
  });
});
