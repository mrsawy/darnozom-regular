import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { db, contentComments, contentItems, contentLikes } from "@workspace/db";
import { getSessionUser, isAdminRole } from "../../middlewares/authMiddleware";
import { isGuestId, issueGuest, readGuestId } from "../../lib/cms/guest";
import { requireAdmin } from "../../middlewares/adminAuth";
import { rateLimit } from "../../middlewares/rateLimit";

const router = Router();

export const SHARE_CHANNELS = ["x", "facebook", "whatsapp", "telegram", "linkedin", "instagram", "email", "copy", "native"] as const;

const parseId = (raw: unknown): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

async function publishedItem(id: number) {
  const [row] = await db
    .select({
      id: contentItems.id,
      likesEnabled: contentItems.likesEnabled,
      commentsEnabled: contentItems.commentsEnabled,
      viewCount: contentItems.viewCount,
      shareCount: contentItems.shareCount,
    })
    .from(contentItems)
    .where(and(eq(contentItems.id, id), eq(contentItems.status, "published")));
  return row ?? null;
}

async function counts(itemId: number) {
  const [[likes], [comments]] = await Promise.all([
    db.select({ n: count() }).from(contentLikes).where(eq(contentLikes.contentItemId, itemId)),
    db
      .select({ n: count() })
      .from(contentComments)
      .where(and(eq(contentComments.contentItemId, itemId), eq(contentComments.status, "visible"))),
  ]);
  return { likeCount: likes.n, commentCount: comments.n };
}

/** Everything the engagement bar needs in one round trip. `liked` is only set for signed-in users. */
async function snapshot(itemId: number, userId?: string) {
  const item = await publishedItem(itemId);
  if (!item) return null;
  const { likeCount, commentCount } = await counts(itemId);
  let liked = false;
  if (userId) {
    const [row] = await db
      .select({ id: contentLikes.id })
      .from(contentLikes)
      .where(and(eq(contentLikes.contentItemId, itemId), eq(contentLikes.userId, userId)));
    liked = !!row;
  }
  return {
    viewCount: item.viewCount,
    shareCount: item.shareCount,
    likeCount,
    commentCount,
    likesEnabled: item.likesEnabled,
    commentsEnabled: item.commentsEnabled,
    liked,
  };
}

type Identity = { id: string; name: string | null; isGuest: boolean; isAdmin: boolean };

/** Signed-in user, else the guest cookie's identity, else null (nothing issued). */
async function identify(req: Request): Promise<Identity | null> {
  const user = await getSessionUser(req);
  if (user) return { id: user.id, name: user.name || user.email.split("@")[0], isGuest: false, isAdmin: isAdminRole(user.role) };
  const guest = readGuestId(req);
  return guest ? { id: guest, name: null, isGuest: true, isAdmin: false } : null;
}

/** Like identify(), but starts a guest session when the visitor has none (for write actions). */
async function identifyOrIssue(req: Request, res: Response): Promise<Identity> {
  return (await identify(req)) ?? { id: issueGuest(res), name: null, isGuest: true, isAdmin: false };
}

router.get("/cms/items/:id/engagement", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const snap = await snapshot(id, (await identify(req))?.id);
    if (!snap) return res.status(404).json({ error: "Not found" });
    res.set("Cache-Control", "no-store");
    return res.json(snap);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load engagement" });
  }
});

const viewLimit = rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "cms-view:" });
router.post("/cms/items/:id/view", viewLimit, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const [row] = await db
      .update(contentItems)
      .set({ viewCount: sql`${contentItems.viewCount} + 1` })
      .where(and(eq(contentItems.id, id), eq(contentItems.status, "published")))
      .returning({ viewCount: contentItems.viewCount });
    return row ? res.json({ viewCount: row.viewCount }) : res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to record view" });
  }
});

const shareLimit = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "cms-share:" });
router.post("/cms/items/:id/share", shareLimit, async (req, res) => {
  const id = parseId(req.params.id);
  const body = z.object({ channel: z.enum(SHARE_CHANNELS) }).safeParse(req.body);
  if (!id || !body.success) return res.status(400).json({ error: "Invalid request" });
  try {
    const [row] = await db
      .update(contentItems)
      .set({ shareCount: sql`${contentItems.shareCount} + 1` })
      .where(and(eq(contentItems.id, id), eq(contentItems.status, "published")))
      .returning({ shareCount: contentItems.shareCount });
    return row ? res.json({ shareCount: row.shareCount }) : res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to record share" });
  }
});

const likeLimit = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "cms-like:" });
async function setLike(req: Request, res: Response, like: boolean) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const item = await publishedItem(id);
    if (!item) return res.status(404).json({ error: "Not found" });
    if (!item.likesEnabled) return res.status(403).json({ error: "Likes are disabled for this item" });
    const who = await identifyOrIssue(req, res);
    if (like) {
      await db.insert(contentLikes).values({ contentItemId: id, userId: who.id }).onConflictDoNothing();
    } else {
      await db.delete(contentLikes).where(and(eq(contentLikes.contentItemId, id), eq(contentLikes.userId, who.id)));
    }
    return res.json({ liked: like, ...(await counts(id)) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update like" });
  }
}
router.put("/cms/items/:id/like", likeLimit, (req, res) => setLike(req, res, true));
router.delete("/cms/items/:id/like", likeLimit, (req, res) => setLike(req, res, false));

/** Explicitly start a guest session (the like/comment endpoints also do this on demand). */
router.post("/cms/guest", async (req, res) => {
  const who = await identifyOrIssue(req, res);
  return res.json({ guest: who.isGuest });
});

router.get("/cms/items/:id/comments", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const item = await publishedItem(id);
    if (!item) return res.status(404).json({ error: "Not found" });
    // Existing comments stay hidden (not deleted) while comments are switched off.
    if (!item.commentsEnabled) return res.json({ enabled: false, comments: [] });
    const userId = (await identify(req))?.id;
    const rows = await db
      .select({
        id: contentComments.id,
        authorName: contentComments.authorName,
        body: contentComments.body,
        isGuest: contentComments.isGuest,
        createdAt: contentComments.createdAt,
        userId: contentComments.userId,
      })
      .from(contentComments)
      .where(and(eq(contentComments.contentItemId, id), eq(contentComments.status, "visible")))
      .orderBy(desc(contentComments.createdAt))
      .limit(200);
    return res.json({
      enabled: true,
      comments: rows.map(({ userId: owner, ...c }) => ({ ...c, mine: !!userId && owner === userId })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load comments" });
  }
});

const commentLimit = rateLimit({ windowMs: 60_000, max: 5, keyPrefix: "cms-comment:" });
const commentBody = z.object({
  body: z.string().trim().min(1).max(2000),
  guestName: z.string().trim().min(1).max(80).optional(),
});
router.post("/cms/items/:id/comments", commentLimit, async (req, res) => {
  const id = parseId(req.params.id);
  const parsed = commentBody.safeParse(req.body);
  if (!id || !parsed.success) return res.status(400).json({ error: "Invalid comment" });
  try {
    const item = await publishedItem(id);
    if (!item) return res.status(404).json({ error: "Not found" });
    if (!item.commentsEnabled) return res.status(403).json({ error: "Comments are disabled for this item" });
    const who = await identifyOrIssue(req, res);
    let authorName = who.name;
    if (who.isGuest) {
      authorName = parsed.data.guestName ?? null;
      if (!authorName) return res.status(400).json({ error: "A name is required to comment as a guest" });
    }
    const [row] = await db
      .insert(contentComments)
      .values({ contentItemId: id, userId: who.id, authorName: (authorName || "Reader").slice(0, 200), isGuest: who.isGuest, body: parsed.data.body })
      .returning({
        id: contentComments.id,
        authorName: contentComments.authorName,
        body: contentComments.body,
        isGuest: contentComments.isGuest,
        createdAt: contentComments.createdAt,
      });
    return res.status(201).json({ ...row, mine: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to post comment" });
  }
});

router.delete("/cms/comments/:commentId", async (req, res) => {
  const id = parseId(req.params.commentId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const who = await identify(req);
  if (!who) return res.status(404).json({ error: "Not found" });
  const where = who.isAdmin
    ? eq(contentComments.id, id)
    : and(eq(contentComments.id, id), eq(contentComments.userId, who.id));
  const rows = await db.delete(contentComments).where(where).returning({ id: contentComments.id });
  return rows.length ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

// ---- Admin moderation ----------------------------------------------------

router.get("/admin/cms/items/:id/comments", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const rows = await db
    .select()
    .from(contentComments)
    .where(eq(contentComments.contentItemId, id))
    .orderBy(desc(contentComments.createdAt))
    .limit(500);
  return res.json({ comments: rows });
});

router.patch("/admin/cms/comments/:commentId", requireAdmin, async (req, res) => {
  const id = parseId(req.params.commentId);
  const parsed = z.object({ status: z.enum(["visible", "hidden"]) }).safeParse(req.body);
  if (!id || !parsed.success) return res.status(400).json({ error: "Invalid request" });
  const [row] = await db
    .update(contentComments)
    .set({ status: parsed.data.status })
    .where(eq(contentComments.id, id))
    .returning();
  return row ? res.json(row) : res.status(404).json({ error: "Not found" });
});

router.delete("/admin/cms/comments/:commentId", requireAdmin, async (req, res) => {
  const id = parseId(req.params.commentId);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const rows = await db.delete(contentComments).where(eq(contentComments.id, id)).returning({ id: contentComments.id });
  return rows.length ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

export default router;
