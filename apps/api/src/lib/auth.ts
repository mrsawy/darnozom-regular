/**
 * The Better Auth instance — the single source of identity for this API.
 *
 * Replaces Clerk. Everything it needs lives in our own Postgres: credentials in
 * `accounts`, sessions in `sessions`, tokens in `verifications`. There is no
 * external identity provider to call, which is why the middlewares that used to
 * make network round-trips to fetch a role now just read a column.
 *
 * Mounted in app.ts ABOVE express.json() — Better Auth reads the raw request
 * stream, and a body parser that runs first consumes it.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { db } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { logger } from "./logger";
import {
  sendOtpEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "./email/authEmail";

/**
 * Emails listed here are promoted to `admin` the first time they sign up, so a
 * fresh deployment has a way in before any admin exists to grant the role. It
 * is bootstrap only: once a user row exists, `users.role` is authoritative and
 * removing an address from this list does NOT demote anyone.
 */
export function getBootstrapAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  // Without a stable secret every restart invalidates all sessions and, worse,
  // a generated-per-boot key across multiple workers means tokens signed by one
  // process are rejected by the next. Fail loudly rather than ship that.
  throw new Error(
    "BETTER_AUTH_SECRET must be set in production. Generate one with: openssl rand -base64 32",
  );
}
if (!secret) {
  logger.warn(
    "BETTER_AUTH_SECRET not set — using an ephemeral development secret. " +
      "Sessions will not survive a restart.",
  );
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
export const isGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret,
);
if (!isGoogleAuthConfigured) {
  logger.warn(
    "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — the 'Continue with " +
      "Google' button will be hidden and the provider disabled.",
  );
}

/** Site origin, used for email links and as the OAuth redirect base. */
const baseURL = (process.env.PUBLIC_SITE_URL ?? "http://localhost:5173").replace(
  /\/+$/,
  "",
);

export const auth = betterAuth({
  appName: "Darnozom",
  baseURL,
  basePath: "/api/auth",
  secret: secret ?? "dev-only-insecure-secret-change-me",

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // Our tables are `users` / `sessions` / `accounts` / `verifications`, which
    // matches the rest of this schema's plural convention.
    usePlural: true,
  }),

  user: {
    // `input: false` on all three is the security-relevant part: it stops a
    // crafted sign-up body from setting its own role or attaching itself to an
    // arbitrary client/tenant. They are writable only from server code.
    additionalFields: {
      role: {
        type: ["client", "consultant", "admin", "super_admin"],
        required: false,
        defaultValue: "client",
        input: false,
      },
      clientId: {
        type: "number",
        required: false,
        input: false,
      },
      tenantId: {
        type: "number",
        required: false,
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Users must confirm their address before a session is issued.
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      await sendResetPasswordEmail({ to: user.email, url });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendVerificationEmail({ to: user.email, url });
    },
  },

  socialProviders: isGoogleAuthConfigured
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      }
    : {},

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 5 * 60,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail({ to: email, otp, type });
      },
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        async before(user) {
          const email = user.email?.toLowerCase();
          if (email && getBootstrapAdminEmails().includes(email)) {
            logger.info(
              { email },
              "Bootstrap admin email signed up — granting admin role",
            );
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
      },
    },
  },

  // The SPA is served same-origin with the API (nginx proxies /api/ on the site
  // domain; Vite proxies it in dev), so a Lax cookie is all that's needed and
  // no cross-site exemption is required.
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },

  trustedOrigins: [baseURL, "http://localhost:5173", "http://localhost:4173"],
});

export type Auth = typeof auth;
