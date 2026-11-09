import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { eq, like } from "drizzle-orm";
import { db, newsletterSubscribers } from "@workspace/db";

const sent: { to: string; token: string }[] = [];
vi.mock("../../lib/email/newsletterEmail", () => ({
  sendNewsletterConfirmEmail: async (p: { to: string; token: string }) => {
    sent.push(p);
    return { ok: true };
  },
}));

const { default: router, __resetNewsletterRateLimit } = await import("./public");
const app = express();
app.use(express.json());
app.use(router);

const EMAIL = "test-nl-pub@example.test";
const cleanup = () => db.delete(newsletterSubscribers).where(like(newsletterSubscribers.email, "test-nl-%"));
const row = async () => (await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, EMAIL)))[0];

beforeEach(async () => {
  sent.length = 0;
  __resetNewsletterRateLimit();
  await cleanup();
});
afterAll(cleanup);

const post = (b: Record<string, unknown>) => request(app).post("/newsletter/subscribe").send(b);

describe("POST /newsletter/subscribe", () => {
  it("stores a pending subscriber (lowercased) and sends the confirm email", async () => {
    const r = await post({ email: "  TEST-NL-PUB@Example.test ", consent: true, locale: "en" });
    expect(r.status).toBe(202);
    const s = await row();
    expect(s).toMatchObject({ status: "pending", locale: "en" });
    expect(sent).toEqual([{ to: EMAIL, token: s!.confirmToken }]);
  });

  it("rejects bad email and missing consent", async () => {
    expect((await post({ email: "nope", consent: true })).status).toBe(400);
    expect((await post({ email: EMAIL, consent: false })).status).toBe(400);
    expect((await post({ email: EMAIL })).status).toBe(400);
    expect(await row()).toBeUndefined();
  });

  it("confirm flips to confirmed; an already-confirmed signup gives the same response and no email", async () => {
    await post({ email: EMAIL, consent: true });
    const t = (await row())!.confirmToken;
    const c = await request(app).get(`/newsletter/confirm?token=${t}`);
    expect(c.status).toBe(302);
    expect(c.headers.location).toMatch(/\/newsletter\/confirmed$/);
    expect((await row())!.status).toBe("confirmed");
    sent.length = 0;
    const again = await post({ email: EMAIL, consent: true });
    expect(again.status).toBe(202);
    expect(sent).toHaveLength(0);
    expect((await row())!.status).toBe("confirmed");
  });

  it("unsubscribe (GET and one-click POST), then re-subscribing goes back to pending", async () => {
    await post({ email: EMAIL, consent: true });
    await request(app).get(`/newsletter/confirm?token=${(await row())!.confirmToken}`);
    const u = (await row())!.unsubscribeToken;
    const g = await request(app).get(`/newsletter/unsubscribe?token=${u}`);
    expect(g.headers.location).toMatch(/\/newsletter\/unsubscribed$/);
    expect((await row())!.status).toBe("unsubscribed");
    expect((await request(app).post(`/newsletter/unsubscribe?token=${u}`)).status).toBe(200);
    await post({ email: EMAIL, consent: true });
    expect((await row())!.status).toBe("pending");
  });

  it("bad tokens redirect to invalid / 404", async () => {
    const c = await request(app).get("/newsletter/confirm?token=zzz");
    expect(c.headers.location).toMatch(/\/newsletter\/invalid$/);
    expect((await request(app).post("/newsletter/unsubscribe?token=" + "a".repeat(32))).status).toBe(404);
  });

  it("rate limits repeated signups from one IP", async () => {
    let last = 0;
    for (let i = 0; i < 7; i++) last = (await post({ email: `test-nl-${i}@example.test`, consent: true })).status;
    expect(last).toBe(429);
  });
});
