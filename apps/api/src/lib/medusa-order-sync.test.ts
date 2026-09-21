import { beforeEach, describe, expect, it, vi } from "vitest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("./medusa-admin", () => ({ medusaAdmin: medusaAdminMock }));

const { syncMedusaOrder, markMedusaOrderPaidForDarnozomOrder } = await import(
  "./medusa-order-sync"
);

describe("syncMedusaOrder", () => {
  beforeEach(() => {
    medusaAdminMock.mockReset();
  });

  it("creates a draft order, converts it, then attaches a not_paid payment collection", async () => {
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
      if (path.startsWith("/admin/orders/order_draft_1")) {
        return {
          order: {
            id: "order_draft_1",
            summary: { pending_difference: 150 },
            payment_collections: [],
          },
        };
      }
      if (path === "/admin/payment-collections" && init?.method === "POST") {
        return { payment_collection: { id: "paycol_1" } };
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
      paymentStatus: "unpaid",
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
    expect(body.customer_id).toBeUndefined();
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

    const payColCall = medusaAdminMock.mock.calls.find(
      (c) => c[0] === "/admin/payment-collections",
    );
    expect(payColCall).toBeTruthy();
    expect(JSON.parse(payColCall![1].body as string)).toEqual({
      order_id: "order_draft_1",
      amount: 150,
    });
  });

  it("marks payment collection paid when Express paymentStatus is paid", async () => {
    medusaAdminMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/admin/regions")) return { regions: [{ id: "reg_1" }] };
      if (path.startsWith("/admin/sales-channels")) return { sales_channels: [] };
      if (path === "/admin/draft-orders") return { draft_order: { id: "order_paid" } };
      if (path.includes("convert-to-order")) return { order: { id: "order_paid" } };
      if (path.startsWith("/admin/orders/order_paid")) {
        return {
          order: {
            id: "order_paid",
            summary: { pending_difference: 50 },
            payment_collections: [{ id: "paycol_existing", status: "not_paid" }],
          },
        };
      }
      if (path.includes("/mark-as-paid")) return { payment_collection: { id: "paycol_existing" } };
      throw new Error(`unexpected: ${path} ${init?.method}`);
    });

    await syncMedusaOrder({
      darnozomOrderId: 9,
      email: "a@b.com",
      fullName: "Solo",
      paymentStatus: "paid",
      items: [{ title: "Book", quantity: 1, unitPrice: 50 }],
    });

    const markCall = medusaAdminMock.mock.calls.find((c) =>
      String(c[0]).includes("/mark-as-paid"),
    );
    expect(markCall).toBeTruthy();
    expect(JSON.parse(markCall![1].body as string)).toMatchObject({
      order_id: "order_paid",
      provider_id: "pp_system_default",
    });
  });

  it("uses custom line items when there is no Medusa variant id", async () => {
    medusaAdminMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/admin/regions")) return { regions: [{ id: "reg_1" }] };
      if (path.startsWith("/admin/sales-channels")) return { sales_channels: [] };
      if (path === "/admin/draft-orders") return { draft_order: { id: "order_2" } };
      if (path.includes("convert-to-order")) return { order: { id: "order_2" } };
      if (path.startsWith("/admin/orders/order_2")) {
        return {
          order: {
            id: "order_2",
            summary: { pending_difference: 400 },
            payment_collections: [],
          },
        };
      }
      if (path === "/admin/payment-collections") {
        return { payment_collection: { id: "paycol_2" } };
      }
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

  it("passes customer_id onto the draft order when provided", async () => {
    medusaAdminMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/admin/regions")) return { regions: [{ id: "reg_1" }] };
      if (path.startsWith("/admin/sales-channels")) return { sales_channels: [] };
      if (path === "/admin/draft-orders") return { draft_order: { id: "order_c" } };
      if (path.includes("convert-to-order")) return { order: { id: "order_c" } };
      if (path.startsWith("/admin/orders/order_c")) {
        return {
          order: {
            id: "order_c",
            summary: { pending_difference: 10 },
            payment_collections: [{ id: "paycol", status: "not_paid" }],
          },
        };
      }
      throw new Error(`unexpected: ${path} ${init?.method}`);
    });

    await syncMedusaOrder({
      darnozomOrderId: 3,
      email: "a@b.com",
      fullName: "A B",
      customerId: "cus_registered",
      items: [{ title: "Book", quantity: 1, unitPrice: 10 }],
    });

    const body = JSON.parse(
      medusaAdminMock.mock.calls.find((c) => c[0] === "/admin/draft-orders")![1].body as string,
    );
    expect(body.customer_id).toBe("cus_registered");
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

describe("markMedusaOrderPaidForDarnozomOrder", () => {
  beforeEach(() => {
    medusaAdminMock.mockReset();
  });

  it("finds the mirrored order and marks its unpaid collection paid", async () => {
    medusaAdminMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/admin/orders?limit=100")) {
        return {
          orders: [
            { id: "order_other", metadata: { darnozom_order_id: 1 } },
            { id: "order_match", metadata: { darnozom_order_id: 42 } },
          ],
        };
      }
      if (path.startsWith("/admin/orders/order_match")) {
        return {
          order: {
            id: "order_match",
            summary: { pending_difference: 30 },
            payment_collections: [{ id: "paycol_x", status: "not_paid" }],
          },
        };
      }
      if (path.includes("/mark-as-paid")) return {};
      throw new Error(`unexpected: ${path} ${init?.method}`);
    });

    await markMedusaOrderPaidForDarnozomOrder(42);

    const markCall = medusaAdminMock.mock.calls.find((c) =>
      String(c[0]).includes("paycol_x/mark-as-paid"),
    );
    expect(markCall).toBeTruthy();
  });
});
