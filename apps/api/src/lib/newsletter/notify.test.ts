import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, like } from "drizzle-orm";
import { db, contentItems, newsletterSubscribers } from "@workspace/db";
import { createItem } from "../cms/repo";
import { parseContentItem } from "../cms/schemas";
import { claimNotification, notifyIfRequested, sendToSubscribers } from "./notify";

const EMAIL = (n: string) => `test-nl-${n}@example.test`;

async function seed(body: Record<string, unknown>) {
  const p = parseContentItem({ titleAr: "عنوان", ...body });
  if (!p.ok) throw new Error(JSON.stringify(p.issues));
  return createItem(p.value);
}
async function sub(n: string, status: "pending" | "confirmed" | "unsubscribed") {
  await db.insert(newsletterSubscribers).values({
    email: EMAIL(n), status, confirmToken: `c${n}`.padEnd(32, "0"), unsubscribeToken: `u${n}`.padEnd(32, "0"),
  });
}
const cleanup = async () => {
  await db.delete(contentItems).where(like(contentItems.slug, "test-nl-%"));
  await db.delete(newsletterSubscribers).where(like(newsletterSubscribers.email, "test-nl-%"));
};

beforeAll(cleanup);
afterAll(cleanup);
beforeEach(cleanup);

describe("claimNotification", () => {
  it("claims a published article exactly once", async () => {
    const item = await seed({ type: "article", slug: "test-nl-a", status: "published" });
    expect(await claimNotification(item)).not.toBeNull();
    expect(await claimNotification(item)).toBeNull();
    const [row] = await db.select().from(contentItems).where(eq(contentItems.id, item.id));
    expect(row!.notifiedAt).not.toBeNull();
  });

  it("never claims drafts, or types that do not notify", async () => {
    const draft = await seed({ type: "article", slug: "test-nl-draft", status: "draft" });
    const obs = await seed({ type: "observatory", slug: "test-nl-obs", status: "published", details: { kind: "daily_brief" } });
    expect(await claimNotification(draft)).toBeNull();
    expect(await claimNotification(obs)).toBeNull();
  });

  it("only one of two concurrent claims wins", async () => {
    const item = await seed({ type: "news", slug: "test-nl-race", status: "published" });
    const [a, b] = await Promise.all([claimNotification(item), claimNotification(item)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });
});

describe("notifyIfRequested", () => {
  it("does nothing when the admin did not tick the box", async () => {
    const item = await seed({ type: "article", slug: "test-nl-off", status: "published" });
    expect(await notifyIfRequested(item, false)).toBe(false);
    const [row] = await db.select().from(contentItems).where(eq(contentItems.id, item.id));
    expect(row!.notifiedAt).toBeNull();
  });

  it("a draft with the box ticked sends nothing until it is published", async () => {
    const draft = await seed({ type: "article", slug: "test-nl-later", status: "draft" });
    expect(await notifyIfRequested(draft, true)).toBe(false);
    const [row] = await db.select().from(contentItems).where(eq(contentItems.id, draft.id));
    expect(row!.notifiedAt).toBeNull();
    expect(await notifyIfRequested({ ...row!, status: "published" }, true)).toBe(true);
  });
});

describe("sendToSubscribers", () => {
  it("emails only confirmed subscribers and counts failures", async () => {
    await sub("ok1", "confirmed");
    await sub("ok2", "confirmed");
    await sub("fail", "confirmed");
    await sub("pend", "pending");
    await sub("gone", "unsubscribed");
    const item = await seed({ type: "article", slug: "test-nl-send", status: "published" });
    const send = vi.fn(async (p: { to: string }) => ({ ok: p.to !== EMAIL("fail") }));
    const out = await sendToSubscribers(item, { send: send as never });
    const to = send.mock.calls.map((c) => c[0].to).sort();
    expect(to).toEqual([EMAIL("fail"), EMAIL("ok1"), EMAIL("ok2")].sort());
    expect(out).toEqual({ sent: 2, failed: 1 });
    const [row] = await db.select().from(contentItems).where(eq(contentItems.id, item.id));
    expect(row!.notifiedCount).toBe(2);
  });

  it("a send that reached nobody does not use up the item's one send", async () => {
    const item = await seed({ type: "article", slug: "test-nl-zero", status: "published" });
    const first = await claimNotification(item);
    expect(first).not.toBeNull();
    // Nobody is confirmed yet: finishes with count 0.
    await sendToSubscribers(first!, { send: vi.fn() as never });
    await sub("late", "confirmed");
    const second = await claimNotification(item);
    expect(second).not.toBeNull();
    const send = vi.fn(async () => ({ ok: true }));
    await sendToSubscribers(second!, { send: send as never });
    expect(send).toHaveBeenCalledTimes(1);
    // Now it has really been sent: no third send.
    expect(await claimNotification(item)).toBeNull();
  });

  it("a throwing sender never propagates", async () => {
    await sub("boom", "confirmed");
    const item = await seed({ type: "article", slug: "test-nl-boom", status: "published" });
    const out = await sendToSubscribers(item, { send: (async () => { throw new Error("x"); }) as never });
    expect(out).toEqual({ sent: 0, failed: 1 });
  });
});
