import { beforeEach, describe, expect, it, vi } from "vitest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("./medusa-admin", () => ({ medusaAdmin: medusaAdminMock }));

const { syncMedusaOrder } = await import("./medusa-order-sync");

describe("syncMedusaOrder", () => {
  beforeEach(() => {
    medusaAdminMock.mockReset();
  });

  it("creates a draft order then converts it so it appears under Admin Orders", async () => {
    medusaAdminMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/admin/regions")) return { regions: [{ id: "reg_1" }] };
      if (path.startsWith("/admin/sales-channels")) {
        return { sales_channels: [{ id: "sc_1" }] };
      }
      if (path === "/admin/draft-orders" && init?.method === "POST") {
        return { draft_order: { id: "order_draft_1" } };
      }
      if (path === "/admin/draft-orders/order_draft_1/convert-to-order") {
        return { order: { id: "order_draft_1" } };
      }
      throw new Error(`unexpected call: ${path}`);
    });

    const result = await syncMedusaOrder({
      darnozomOrderId: 42,
      email: "Buyer@Example.com",
      fullName: "Ahmed Yosef",
      phone: "01012345678",
      address: "123 St",
      city: "Cairo",
      currencyCode: "EGP",
      shippingTotal: 100,
      paymentMethod: "cash_on_delivery",
      items: [
        {
          title: "BOOK 858585",
          quantity: 1,
          unitPrice: 50,
          variantId: "variant_paper_1",
        },
      ],
    });

    expect(result.medusaOrderId).toBe("order_draft_1");

    const createCall = medusaAdminMock.mock.calls.find(
      (c) => c[0] === "/admin/draft-orders",
    );
    expect(createCall).toBeTruthy();
    const body = JSON.parse(createCall![1].body as string);
    expect(body.email).toBe("buyer@example.com");
    expect(body.region_id).toBe("reg_1");
    expect(body.sales_channel_id).toBe("sc_1");
    expect(body.currency_code).toBe("egp");
    expect(body.no_notification_order).toBe(true);
    expect(body.metadata.darnozom_order_id).toBe(42);
    expect(body.items).toEqual([
      {
        variant_id: "variant_paper_1",
        quantity: 1,
        unit_price: 50,
        title: "BOOK 858585",
        metadata: { darnozom_order_id: 42 },
      },
      {
        title: "Shipping",
        quantity: 1,
        unit_price: 100,
        metadata: { darnozom_order_id: 42, kind: "shipping" },
      },
    ]);
    expect(body.shipping_address).toEqual({
      first_name: "Ahmed",
      last_name: "Yosef",
      phone: "01012345678",
      address_1: "123 St",
      city: "Cairo",
      country_code: "eg",
    });

    expect(medusaAdminMock).toHaveBeenCalledWith(
      "/admin/draft-orders/order_draft_1/convert-to-order",
      { method: "POST", body: "{}" },
    );
  });

  it("uses custom line items when there is no Medusa variant id", async () => {
    medusaAdminMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/admin/regions")) return { regions: [{ id: "reg_1" }] };
      if (path.startsWith("/admin/sales-channels")) return { sales_channels: [] };
      if (path === "/admin/draft-orders") return { draft_order: { id: "order_2" } };
      if (path.includes("convert-to-order")) return { order: { id: "order_2" } };
      throw new Error(`unexpected: ${path} ${init?.method}`);
    });

    await syncMedusaOrder({
      darnozomOrderId: 7,
      email: "a@b.com",
      fullName: "Solo",
      items: [{ title: "Legacy Course", quantity: 2, unitPrice: 200 }],
    });

    const body = JSON.parse(
      medusaAdminMock.mock.calls.find((c) => c[0] === "/admin/draft-orders")![1].body as string,
    );
    expect(body.sales_channel_id).toBeUndefined();
    expect(body.items[0]).toEqual({
      title: "Legacy Course",
      quantity: 2,
      unit_price: 200,
      metadata: { darnozom_order_id: 7 },
    });
  });

  it("throws when no region exists", async () => {
    medusaAdminMock.mockResolvedValue({ regions: [] });
    await expect(
      syncMedusaOrder({
        darnozomOrderId: 1,
        email: "a@b.com",
        fullName: "X",
        items: [{ title: "T", quantity: 1, unitPrice: 1 }],
      }),
    ).rejects.toThrow(/No Medusa region/);
  });
});
