import { describe, it, expect, vi, beforeEach } from "vitest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("./medusa-admin", () => ({ medusaAdmin: medusaAdminMock }));

const { syncMedusaCustomer } = await import("./medusa-customer-sync");

describe("syncMedusaCustomer", () => {
  beforeEach(() => {
    medusaAdminMock.mockReset();
  });

  it("creates a guest Medusa customer (has_account false) when not signed in", async () => {
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
        has_account: false,
        metadata: { source: "darnozom_guest" },
      }),
    });
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
        has_account: true,
        metadata: {
          source: "darnozom_registered",
          betterAuthUserId: "user_abc",
        },
      }),
    });
  });

  it("promotes an existing guest to registered on signed-in checkout", async () => {
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
        has_account: true,
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
        has_account: false,
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
