import { randomBytes } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db, newsletterSubscribers, type NewsletterSubscriber } from "@workspace/db";

const token = () => randomBytes(24).toString("hex");

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type SubscribeOutcome =
  | { kind: "pending"; subscriber: NewsletterSubscriber } // confirmation email should be (re)sent
  | { kind: "already_confirmed" };

/**
 * Create or revive a subscriber. A new or previously-unsubscribed address goes
 * to `pending` with a fresh confirm token; a confirmed one is left untouched.
 */
export async function subscribe(emailRaw: string, locale: "ar" | "en"): Promise<SubscribeOutcome> {
  const email = normalizeEmail(emailRaw);
  const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  if (existing?.status === "confirmed") return { kind: "already_confirmed" };

  if (existing) {
    const [row] = await db
      .update(newsletterSubscribers)
      .set({
        status: "pending",
        locale,
        confirmToken: token(),
        consentAt: new Date(),
        unsubscribedAt: null,
      })
      .where(eq(newsletterSubscribers.id, existing.id))
      .returning();
    return { kind: "pending", subscriber: row! };
  }

  const [row] = await db
    .insert(newsletterSubscribers)
    .values({ email, locale, confirmToken: token(), unsubscribeToken: token() })
    .onConflictDoNothing({ target: newsletterSubscribers.email })
    .returning();
  if (!row) return subscribe(emailRaw, locale); // lost a race with a concurrent signup: re-read
  return { kind: "pending", subscriber: row };
}

export async function confirmByToken(t: string): Promise<boolean> {
  const rows = await db
    .update(newsletterSubscribers)
    .set({ status: "confirmed", confirmedAt: new Date(), unsubscribedAt: null })
    .where(eq(newsletterSubscribers.confirmToken, t))
    .returning({ id: newsletterSubscribers.id });
  return rows.length > 0;
}

export async function unsubscribeByToken(t: string): Promise<boolean> {
  const rows = await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.unsubscribeToken, t))
    .returning({ id: newsletterSubscribers.id });
  return rows.length > 0;
}

export async function countConfirmed(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "confirmed"));
  return r?.n ?? 0;
}
