import { db, users } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";
import { auth } from "../auth";

/**
 * Development seed accounts, one per role.
 *
 * Accounts are created through `auth.api.signUpEmail` rather than inserted
 * directly, so passwords go through the real argon2 hashing path and the rows
 * are byte-for-byte what a genuine sign-up produces. A hand-written INSERT
 * would produce accounts that cannot actually sign in.
 *
 * Roles and `email_verified` are then set with a direct UPDATE — both are
 * `input: false` on the auth side precisely so a request body can never set
 * them, which means the sign-up call itself cannot either.
 *
 * NEVER run this against production: the passwords are public knowledge.
 */
const SEED_PASSWORD = "darnozom-dev-1234";

const SEED_USERS = [
  { email: "superadmin@darnozom.test", name: "Super Admin", role: "super_admin" },
  { email: "admin@darnozom.test", name: "Admin User", role: "admin" },
  { email: "consultant@darnozom.test", name: "Consultant User", role: "consultant" },
  { email: "client@darnozom.test", name: "Client User", role: "client" },
] as const;

export async function seedDevUsers({
  throwOnError = false,
}: { throwOnError?: boolean } = {}): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    const message =
      "Refusing to seed development users in production — these accounts have a well-known password.";
    logger.error(message);
    if (throwOnError) throw new Error(message);
    return;
  }

  try {
    let created = 0;
    let skipped = 0;

    for (const seed of SEED_USERS) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${seed.email}`)
        .limit(1);

      if (existing.length > 0) {
        skipped += 1;
        continue;
      }

      await auth.api.signUpEmail({
        body: {
          name: seed.name,
          email: seed.email,
          password: SEED_PASSWORD,
        },
      });

      // Seeded accounts skip the verification round-trip; there is no inbox to
      // check for @darnozom.test.
      await db
        .update(users)
        .set({ role: seed.role, emailVerified: true, updatedAt: new Date() })
        .where(sql`lower(${users.email}) = ${seed.email}`);

      created += 1;
    }

    logger.info(
      { created, skipped, password: SEED_PASSWORD },
      "Development user seeding complete",
    );
  } catch (err) {
    logger.error({ err }, "Failed to seed development users");
    if (throwOnError) throw err;
  }
}
