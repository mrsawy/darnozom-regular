import { db, adminUsers } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import { getBootstrapAdminEmails } from "../middlewares/adminAuth";

const BOOTSTRAP_NOTE = "Auto-seeded from ADMIN_EMAILS env var on server start.";

export async function seedAdminUsers(): Promise<void> {
  try {
    const emails = getBootstrapAdminEmails();
    if (emails.length === 0) {
      logger.warn(
        "ADMIN_EMAILS env var is empty; no bootstrap admins will be auto-seeded.",
      );
      return;
    }

    let inserted = 0;
    for (const email of emails) {
      const existing = await db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(sql`lower(${adminUsers.email}) = ${email}`)
        .limit(1);

      if (existing.length > 0) continue;

      try {
        await db.insert(adminUsers).values({
          email,
          addedByEmail: null,
          note: BOOTSTRAP_NOTE,
        });
        inserted += 1;
      } catch (err) {
        logger.warn(
          { err },
          "Failed to insert one bootstrap admin row (continuing).",
        );
      }
    }

    logger.info(
      { configured: emails.length, inserted },
      "Bootstrap admin seeding complete",
    );
  } catch (err) {
    logger.error({ err }, "Failed to seed bootstrap admin users");
  }
}
