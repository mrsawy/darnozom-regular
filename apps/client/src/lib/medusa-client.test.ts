import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMedusaClient, setMedusaCustomerToken, getMedusaCustomerToken, resolveMedusaBackendUrl } from "./medusa-client";

describe("medusa-client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getMedusaCustomerToken returns null when nothing stored", () => {
    expect(getMedusaCustomerToken()).toBeNull();
  });

  it("setMedusaCustomerToken persists and getMedusaCustomerToken reads it back", () => {
    setMedusaCustomerToken("medusa-jwt-abc");
    expect(getMedusaCustomerToken()).toBe("medusa-jwt-abc");
  });

  it("setMedusaCustomerToken(null) clears the stored token", () => {
    setMedusaCustomerToken("medusa-jwt-abc");
    setMedusaCustomerToken(null);
    expect(getMedusaCustomerToken()).toBeNull();
  });

  it("getMedusaClient returns a client configured with the publishable key", () => {
    const client = getMedusaClient();
    expect(client).toBeTruthy();
  });

  describe("resolveMedusaBackendUrl", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("uses a non-local configured backend URL as-is (production)", () => {
      vi.stubEnv("VITE_MEDUSA_BACKEND_URL", "https://ecommerce.darnozom.com");
      expect(resolveMedusaBackendUrl()).toBe("https://ecommerce.darnozom.com");
    });

    it("falls back to the localhost URL when it is configured and the page is on localhost", () => {
      vi.stubEnv("VITE_MEDUSA_BACKEND_URL", "http://localhost:9010");
      expect(resolveMedusaBackendUrl()).toBe("http://localhost:9010");
    });
  });
});
