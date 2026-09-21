import { describe, it, expect, vi, beforeEach } from "vitest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("./medusa-admin", () => ({ medusaAdmin: medusaAdminMock }));

const { syncMedusaCustomer } = await import("./medusa-customer-sync");

describe("syncMedusaCustomer", () => {
  beforeEach(() => {
    medusaAdminMock.mockReset();
  });

  it("creates a guest Medusa customer with checkout name and phone", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      if (path === "/admin/customers") return { customer: { id: "cus_guest" } };
      throw new Error(`unexpected call: ${path}`);
    });

    const result = await syncMedusaCustomer({
      email: "Buyer@Example.com",
      fullName: "Ahmed Yosef",
      phone: "01012345678",
    });

    expect(result.customerId).toBe("cus_guest");
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        email: "buyer@example.com",
        first_name: "Ahmed",
        last_name: "Yosef",
        phone: "01012345678",
        metadata: { source: "darnozom_guest" },
      }),
    });
    const body = JSON.parse(
      (medusaAdminMock.mock.calls.find((c) => c[0] === "/admin/customers")![1] as { body: string })
        .body,
    );
    expect(body).not.toHaveProperty("has_account");
  });

  it("creates a registered Medusa customer when betterAuthUserId is set", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      if (path === "/admin/customers") return { customer: { id: "cus_reg" } };
      throw new Error(`unexpected call: ${path}`);
    });

    const result = await syncMedusaCustomer({
      email: "buyer@example.com",
      fullName: "Ahmed Yosef",
      betterAuthUserId: "user_abc",
    });

    expect(result.customerId).toBe("cus_reg");
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        email: "buyer@example.com",
        first_name: "Ahmed",
        last_name: "Yosef",
        phone: undefined,
        metadata: {
          source: "darnozom_registered",
          betterAuthUserId: "user_abc",
        },
      }),
    });
    const body = JSON.parse(
      (medusaAdminMock.mock.calls.find((c) => c[0] === "/admin/customers")![1] as { body: string })
        .body,
    );
    expect(body).not.toHaveProperty("has_account");
  });

  it("updates an existing guest with checkout name/phone and marks registered", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) {
        return {
          customers: [
            {
              id: "cus_existing",
              email: "buyer@example.com",
              has_account: false,
              metadata: { source: "darnozom_guest" },
            },
          ],
        };
      }
      if (path === "/admin/customers/cus_existing") {
        return { customer: { id: "cus_existing" } };
      }
      throw new Error(`unexpected call: ${path}`);
    });

    await syncMedusaCustomer({
      email: "buyer@example.com",
      fullName: "Ahmed Yosef",
      phone: "01012345678",
      betterAuthUserId: "user_abc",
    });

    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers/cus_existing", {
      method: "POST",
      body: JSON.stringify({
        first_name: "Ahmed",
        last_name: "Yosef",
        phone: "01012345678",
        metadata: {
          source: "darnozom_registered",
          betterAuthUserId: "user_abc",
        },
      }),
    });
    const body = JSON.parse(
      (
        medusaAdminMock.mock.calls.find(
          (c) => c[0] === "/admin/customers/cus_existing",
        )![1] as { body: string }
      ).body,
    );
    expect(body).not.toHaveProperty("has_account");
  });

  it("heals an email-only guest when create races with a prior draft customer", async () => {
    let lookups = 0;
    medusaAdminMock.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/customers?")) {
        lookups += 1;
        if (lookups === 1) return { customers: [] };
        return {
          customers: [
            {
              id: "cus_race",
              email: "buyer@example.com",
              metadata: {},
            },
          ],
        };
      }
      if (path === "/admin/customers" && init?.method === "POST") {
        throw new Error("Customer with email already exists");
      }
      if (path === "/admin/customers/cus_race") {
        return { customer: { id: "cus_race" } };
      }
      throw new Error(`unexpected call: ${path}`);
    });

    const result = await syncMedusaCustomer({
      email: "buyer@example.com",
      fullName: "Sara Ali",
      phone: "01111111111",
    });

    expect(result.customerId).toBe("cus_race");
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers/cus_race", {
      method: "POST",
      body: JSON.stringify({
        first_name: "Sara",
        last_name: "Ali",
        phone: "01111111111",
        metadata: { source: "darnozom_guest" },
      }),
    });
  });

  it("handles a single-word name with no last name", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      return { customer: { id: "cus_1" } };
    });

    await syncMedusaCustomer({ email: "solo@example.com", fullName: "Ahmed" });

    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        email: "solo@example.com",
        first_name: "Ahmed",
        last_name: null,
        phone: undefined,
        metadata: { source: "darnozom_guest" },
      }),
    });
  });

  it("no-ops on an empty email instead of calling Medusa", async () => {
    const result = await syncMedusaCustomer({ email: "  ", fullName: "Ahmed Yosef" });
    expect(result.customerId).toBeNull();
    expect(medusaAdminMock).not.toHaveBeenCalled();
  });

  it("propagates a Medusa API failure to the caller (caller treats it as best-effort)", async () => {
    medusaAdminMock.mockRejectedValue(new Error("Medusa admin down"));
    await expect(
      syncMedusaCustomer({ email: "buyer@example.com", fullName: "Ahmed Yosef" }),
    ).rejects.toThrow("Medusa admin down");
  });
});
