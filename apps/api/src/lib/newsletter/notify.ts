import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { db, contentItems, newsletterSubscribers, type ContentItem } from "@workspace/db";
import { sendContentPublishedEmail } from "../email/newsletterEmail";
import { BATCH_SIZE, canNotifyType } from "./config";

export type NotifyDeps = {
  send: typeof sendContentPublishedEmail;
};

/**
 * Atomically claim the right to email subscribers about `item`. Returns the
 * claimed item, or null if it is not eligible (not published, wrong type) or
 * was already sent to someone. The conditional UPDATE is the guard that
 * makes a double send impossible even under concurrent saves.
 */
export async function claimNotification(item: ContentItem): Promise<ContentItem | null> {
  if (item.status !== "published" || !canNotifyType(item.type)) return null;
  const [claimed] = await db
    .update(contentItems)
    // notifiedCount is reset to null while a send is in flight, so a concurrent claim
    // sees (notifiedAt set, count null) and loses. A finished send that reached nobody
    // (count = 0) does not use up the item's one send: it can be claimed again.
    .set({ notifiedAt: new Date(), notifiedCount: null })
    .where(
      and(
        eq(contentItems.id, item.id),
        or(isNull(contentItems.notifiedAt), eq(contentItems.notifiedCount, 0)),
      ),
    )
    .returning();
  return claimed ?? null;
}

/** Email every confirmed subscriber, in batches. Never throws. */
export async function sendToSubscribers(
  item: ContentItem,
  deps: NotifyDeps = { send: sendContentPublishedEmail },
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  let lastId = 0;
  try {
    for (;;) {
      const batch = await db
        .select()
        .from(newsletterSubscribers)
        .where(and(eq(newsletterSubscribers.status, "confirmed"), gt(newsletterSubscribers.id, lastId)))
        .orderBy(asc(newsletterSubscribers.id))
        .limit(BATCH_SIZE);
      if (batch.length === 0) break;
      lastId = batch[batch.length - 1]!.id;
      const results = await Promise.all(
        batch.map((s) =>
          deps
            .send({
              to: s.email,
              locale: s.locale === "en" ? "en" : "ar",
              item,
              unsubscribeToken: s.unsubscribeToken,
            })
            .then((r) => r.ok)
            .catch(() => false),
        ),
      );
      for (const ok of results) ok ? sent++ : failed++;
    }
  } catch (err) {
    console.error("[newsletter] send loop failed:", err);
  }
  await db.update(contentItems).set({ notifiedCount: sent }).where(eq(contentItems.id, item.id)).catch(() => {});
  if (failed) console.warn(`[newsletter] item ${item.id}: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/** Claim + send in the background. Returns whether a send was started. */
export async function notifyIfRequested(item: ContentItem, requested: boolean): Promise<boolean> {
  if (!requested) return false;
  const claimed = await claimNotification(item);
  if (!claimed) return false;
  void sendToSubscribers(claimed);
  return true;
}
