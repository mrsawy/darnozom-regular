import { describe, it, expect, vi, beforeEach } from "vitest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("./medusa-admin", () => ({ medusaAdmin: medusaAdminMock }));

const { syncMedusaCustomer } = await import("./medusa-customer-sync");

describe("syncMedusaCustomer", () => {
  beforeEach(() => {
    medusaAdminMock.mockReset();
  });

  it("creates a new Medusa customer when none exists for the email", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      if (path === "/admin/customers") return { customer: { id: "cus_new" } };
      throw new Error(`unexpected call: ${path}`);
    });

    await syncMedusaCustomer({ email: "Buyer@Example.com", fullName: "Ahmed Yosef", phone: "01012345678" });

    expect(medusaAdminMock).toHaveBeenCalledWith(
      expect.stringContaining("/admin/customers?email=buyer%40example.com"),
    );
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        email: "buyer@example.com",
        first_name: "Ahmed",
        last_name: "Yosef",
        phone: "01012345678",
      }),
    });
  });

  it("updates the existing Medusa customer instead of creating a duplicate", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) {
        return { customers: [{ id: "cus_existing", email: "buyer@example.com" }] };
      }
      if (path === "/admin/customers/cus_existing") return { customer: { id: "cus_existing" } };
      throw new Error(`unexpected call: ${path}`);
    });

    await syncMedusaCustomer({ email: "buyer@example.com", fullName: "Ahmed Yosef", phone: "01012345678" });

    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers/cus_existing", {
      method: "POST",
      body: JSON.stringify({
        first_name: "Ahmed",
        last_name: "Yosef",
        phone: "01012345678",
      }),
    });
  });

  it("handles a single-word name with no last name", async () => {
    medusaAdminMock.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/customers?")) return { customers: [] };
      return {};
    });

    await syncMedusaCustomer({ email: "solo@example.com", fullName: "Ahmed" });

    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/customers", {
      method: "POST",
      body: JSON.stringify({
        email: "solo@example.com",
        first_name: "Ahmed",
        last_name: null,
        phone: undefined,
      }),
    });
  });

  it("no-ops on an empty email instead of calling Medusa", async () => {
    await syncMedusaCustomer({ email: "  ", fullName: "Ahmed Yosef" });
    expect(medusaAdminMock).not.toHaveBeenCalled();
  });

  it("propagates a Medusa API failure to the caller (caller treats it as best-effort)", async () => {
    medusaAdminMock.mockRejectedValue(new Error("Medusa admin down"));
    await expect(
      syncMedusaCustomer({ email: "buyer@example.com", fullName: "Ahmed Yosef" }),
    ).rejects.toThrow("Medusa admin down");
  });
});
