import { AbstractAuthModuleProvider } from "@medusajs/framework/utils";
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from "@medusajs/framework/types";
import { createHmac, timingSafeEqual } from "crypto";

interface AssertionPayload {
  betterAuthUserId: string;
  email: string;
  name?: string;
  exp: number;
}

/**
 * Verifies an HMAC-signed assertion minted by the Express API (the actual
 * source of truth for identity via Better Auth).
 *
 * Security ordering, deliberately preserved:
 * 1. Split the assertion and require both segments to be present.
 * 2. Recompute the expected MAC over the *raw, unparsed* body and compare
 *    it to the provided MAC using a constant-time comparison. Buffer
 *    lengths are checked before calling `timingSafeEqual`, because
 *    `timingSafeEqual` throws (rather than returning false) when its two
 *    buffers differ in length — letting that throw escape uncaught would
 *    either crash the request or leak timing/behavioral information about
 *    *why* verification failed.
 * 3. Only after the MAC is confirmed valid do we parse the base64url body
 *    as JSON and inspect its `exp` field. The payload is untrusted content
 *    until the MAC proves it wasn't tampered with, so no decision
 *    (including the expiry check) may be made from it beforehand.
 */
function verifyAssertion(assertion: string, secret: string): AssertionPayload {
  const [body, mac] = assertion.split(".");
  if (!body || !mac) throw new Error("Malformed assertion");

  const expectedMac = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid assertion signature");
  }

  let payload: AssertionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  } catch {
    throw new Error("Malformed assertion payload");
  }

  if (typeof payload.exp !== "number" || Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error("Assertion expired");
  }
  return payload;
}

class BetterAuthBridgeProvider extends AbstractAuthModuleProvider {
  static identifier = "better-auth-bridge";
  static DISPLAY_NAME = "Better Auth Bridge";

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService,
  ): Promise<AuthenticationResponse> {
    const assertion = data.body?.assertion as string | undefined;

    // Fail closed: BETTER_AUTH_BRIDGE_SECRET must be explicitly configured.
    // There is no hardcoded or empty-string fallback — this exact class of
    // bug (hardcoded secret fallback) was a CRITICAL finding elsewhere in
    // this migration plan, so it must never recur here.
    const secret = process.env.BETTER_AUTH_BRIDGE_SECRET;
    if (!assertion || !secret) {
      return { success: false, error: "Missing assertion or bridge secret" };
    }

    let payload: AssertionPayload;
    try {
      payload = verifyAssertion(assertion, secret);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }

    const entityId = payload.betterAuthUserId;

    try {
      let authIdentity;
      try {
        authIdentity = await authIdentityProviderService.retrieve({
          entity_id: entityId,
        });
      } catch (error) {
        if ((error as { type?: string }).type !== "not_found") {
          throw error;
        }
        authIdentity = await authIdentityProviderService.create({
          entity_id: entityId,
          user_metadata: {
            email: payload.email,
            name: payload.name ?? payload.email,
          },
        });
      }

      return {
        success: true,
        authIdentity,
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export default BetterAuthBridgeProvider;
