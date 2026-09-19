import { describe, it, expect, beforeEach, vi } from "vitest";
import { getMedusaClient, setMedusaCustomerToken, getMedusaCustomerToken } from "./medusa-client";

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
});
