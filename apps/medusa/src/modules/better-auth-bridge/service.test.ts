import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createHmac } from "crypto";
import BetterAuthBridgeProvider from "./service";

function signAssertion(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

// Minimal stand-in for Medusa's AuthIdentityProviderService, matching the
// real interface's retrieve/create/update/setState/getState surface
// (@medusajs/types auth/provider.d.ts). Real Medusa auth providers (e.g.
// the built-in emailpass provider) use this service to look up or create a
// genuine AuthIdentityDTO — they never fabricate an ad-hoc object as the
// `authIdentity` field of the response.
function createAuthIdentityProviderServiceMock() {
  const store = new Map<string, any>();
  return {
    retrieve: vi.fn(async ({ entity_id }: { entity_id: string }) => {
      const found = store.get(entity_id);
      if (!found) {
        const err: any = new Error("Auth identity not found");
        err.type = "not_found";
        throw err;
      }
      return found;
    }),
    create: vi.fn(async (data: { entity_id: string; provider_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
      const identity = {
        id: `authid_${data.entity_id}`,
        provider_identities: [
          {
            id: `provid_${data.entity_id}`,
            provider: "better-auth-bridge",
            entity_id: data.entity_id,
            provider_metadata: data.provider_metadata,
            user_metadata: data.user_metadata,
          },
        ],
        app_metadata: {},
      };
      store.set(data.entity_id, identity);
      return identity;
    }),
    update: vi.fn(),
    setState: vi.fn(),
    getState: vi.fn(),
  };
}

describe("BetterAuthBridgeProvider", () => {
  const secret = "test-bridge-secret";
  beforeEach(() => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = secret;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.BETTER_AUTH_BRIDGE_SECRET;
  });

  it("authenticates successfully with a valid, unexpired assertion", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 },
      secret,
    );

    const result = await provider.authenticate({ body: { assertion } } as any, authIdentityProviderService as any);

    expect(result.success).toBe(true);
    // The real AuthenticationResponse.authIdentity is an AuthIdentityDTO
    // ({ id, provider_identities, app_metadata }), not a bespoke
    // { provider_identity_id, user_metadata } object — verify the genuine
    // shape, since Task 24's Express endpoint and Medusa's own
    // /auth/customer/better-auth-bridge route depend on it downstream.
    expect(result.authIdentity?.provider_identities?.[0]?.entity_id).toBe("user_1");
    expect(result.authIdentity?.provider_identities?.[0]?.user_metadata?.email).toBe("buyer@example.com");
    expect(authIdentityProviderService.create).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: "user_1" }),
    );
  });

  it("reuses an existing auth identity on a second authentication", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 },
      secret,
    );

    await provider.authenticate({ body: { assertion } } as any, authIdentityProviderService as any);
    const result = await provider.authenticate({ body: { assertion } } as any, authIdentityProviderService as any);

    expect(result.success).toBe(true);
    expect(authIdentityProviderService.create).toHaveBeenCalledTimes(1);
    expect(authIdentityProviderService.retrieve).toHaveBeenCalledTimes(2);
  });

  it("rejects an expired assertion", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) - 10 },
      secret,
    );

    const result = await provider.authenticate({ body: { assertion } } as any, authIdentityProviderService as any);
    expect(result.success).toBe(false);
  });

  it("rejects a tampered assertion", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 },
      secret,
    );
    const tampered = assertion.slice(0, -2) + "xx";

    const result = await provider.authenticate({ body: { assertion: tampered } } as any, authIdentityProviderService as any);
    expect(result.success).toBe(false);
  });

  it("rejects a well-formed but wrong-length signature without throwing", async () => {
    // Guards the timingSafeEqual length-check ordering: comparing MACs of
    // different lengths must fail closed, not throw past the caller.
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();
    const body = Buffer.from(
      JSON.stringify({ betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 }),
    ).toString("base64url");
    const assertion = `${body}.short`;

    const result = await provider.authenticate({ body: { assertion } } as any, authIdentityProviderService as any);
    expect(result.success).toBe(false);
  });

  it("fails closed when BETTER_AUTH_BRIDGE_SECRET is not set, never falling back to a default", async () => {
    delete process.env.BETTER_AUTH_BRIDGE_SECRET;
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();
    const assertion = signAssertion(
      { betterAuthUserId: "user_1", email: "buyer@example.com", exp: Math.floor(Date.now() / 1000) + 60 },
      secret,
    );

    const result = await provider.authenticate({ body: { assertion } } as any, authIdentityProviderService as any);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed assertion missing the MAC segment", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();

    const result = await provider.authenticate({ body: { assertion: "not-a-valid-assertion" } } as any, authIdentityProviderService as any);
    expect(result.success).toBe(false);
  });

  it("rejects when the assertion is missing from the request body", async () => {
    const provider = new BetterAuthBridgeProvider({} as any, {});
    const authIdentityProviderService = createAuthIdentityProviderServiceMock();

    const result = await provider.authenticate({ body: {} } as any, authIdentityProviderService as any);
    expect(result.success).toBe(false);
  });
});
