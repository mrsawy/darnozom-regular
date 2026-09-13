/**
 * Better Auth browser client — the replacement for `@clerk/react`.
 *
 * No publishable key and no provider component: the SPA is served same-origin
 * with the API, so every call is a same-origin request carrying the httpOnly
 * session cookie. That also means there is no "auth is not configured" state to
 * design around the way `VITE_CLERK_PUBLISHABLE_KEY` forced.
 */
import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Same origin in every environment: nginx proxies /api/ on the site domain in
  // production, Vite proxies it in dev.
  basePath: "/api/auth",
  plugins: [
    emailOTPClient(),
    // Declared explicitly rather than via `inferAdditionalFields<typeof auth>`,
    // which would drag the server's auth module (and its DB imports) into the
    // browser bundle.
    //
    // `input: false` must mirror the server config exactly. It is what marks
    // these as read-only projections of the session rather than sign-up
    // parameters — without it the client types demand a `role` on every
    // signUp.email() call, for a field the server refuses to accept from a
    // request body anyway.
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false, input: false },
        clientId: { type: "number", required: false, input: false },
        tenantId: { type: "number", required: false, input: false },
      },
    }),
  ],
});

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  resetPassword,
  emailOtp,
} = authClient;

export type UserRole = "client" | "consultant" | "admin" | "super_admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: UserRole;
  clientId?: number | null;
  tenantId?: number | null;
}

/** Base path the app is served under, used when building redirect URLs. */
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Maps a Better Auth error onto a display string, preferring our own localized
 * copy over the server's English message.
 */
export function authErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string,
  byCode: Record<string, string> = {},
): string {
  if (!error) return fallback;
  if (error.code && byCode[error.code]) return byCode[error.code];
  return error.message || fallback;
}
