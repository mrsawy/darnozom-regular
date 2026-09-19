import { db, users, adminUserEvents } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";
import { logger } from "../logger";
import { getBootstrapAdminEmails } from "../auth";

const BOOTSTRAP_NOTE = "Auto-granted from ADMIN_EMAILS on server start.";

/**
 * Promotes any existing account whose email is listed in ADMIN_EMAILS.
 *
 * This covers the half of the bootstrap the sign-up hook in lib/auth.ts cannot:
 * the hook grants admin to listed emails *as they sign up*, but an address
 * added to ADMIN_EMAILS after that person already has an account would
 * otherwise never take effect. Running on boot closes that gap.
 *
 * It only ever promotes. Removing an address from ADMIN_EMAILS does not demote
 * anyone — revoking is an explicit action through /admin/admins, so that a
 * typo'd env var cannot silently lock every admin out.
 */
export async function seedAdminUsers(): Promise<void> {
  try {
    const emails = getBootstrapAdminEmails();
    if (emails.length === 0) {
      logger.warn(
        "ADMIN_EMAILS env var is empty; no bootstrap admins will be granted.",
      );
      return;
    }

    // Compared case-insensitively, so `inArray` (which is not) cannot be used.
    const emailList = sql.join(
      emails.map((e) => sql`${e}`),
      sql`, `,
    );
    const candidates = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(sql`lower(${users.email}) IN (${emailList})`);

    const toPromote = candidates.filter(
      (u) => u.role !== "admin" && u.role !== "super_admin",
    );

    if (toPromote.length === 0) {
      logger.info(
        { configured: emails.length, existing: candidates.length },
        "Bootstrap admin check complete — nothing to promote",
      );
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(
          inArray(
            users.id,
            toPromote.map((u) => u.id),
          ),
        );
      await tx.insert(adminUserEvents).values(
        toPromote.map((u) => ({
          action: "added",
          targetEmail: u.email,
          actorEmail: null,
          note: BOOTSTRAP_NOTE,
        })),
      );
    });

    logger.info(
      { configured: emails.length, promoted: toPromote.length },
      "Bootstrap admin seeding complete",
    );
  } catch (err) {
    logger.error({ err }, "Failed to seed bootstrap admin roles");
  }
}
