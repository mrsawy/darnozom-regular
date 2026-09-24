import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("../lib/express-internal", () => ({ expressInternalFetch: fetchMock }));

import handler, { config } from "./manual-payment-captured";

function containerWith(order: any) {
  const graph = vi.fn().mockResolvedValue({
    data: [{ id: "pay_1", payment_collection: order ? { order } : null }],
  });
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
  return {
    graph,
    logger,
    container: {
      resolve: (k: string) => (k === "query" ? { graph } : k === "logger" ? logger : undefined),
    } as any,
  };
}

const manualMeta = (method: string, id = 7) => ({
  source: "darnozom_storefront",
  payment_method: method,
  darnozom_order_id: id,
});

describe("manual-payment-captured subscriber", () => {
  beforeEach(() => fetchMock.mockReset());

  it("listens to payment.captured", () => {
    expect(config.event).toBe("payment.captured");
  });

  it("looks up the order through the payment and notifies Express", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { container, graph } = containerWith({ id: "order_1", metadata: manualMeta("vodafone_cash", 42) });
    await handler({ event: { data: { id: "pay_1" } }, container } as any);
    expect(graph).toHaveBeenCalledWith({
      entity: "payment",
      fields: ["id", "payment_collection.order.id", "payment_collection.order.metadata"],
      filters: { id: "pay_1" },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/internal/orders/42/mark-paid", {
      medusaOrderId: "order_1",
    });
  });

  it("ignores non-manual methods and non-storefront orders", async () => {
    for (const metadata of [
      { source: "darnozom_storefront", payment_method: "paypal", darnozom_order_id: 1 },
      { payment_method: "instapay", darnozom_order_id: 1 },
      { source: "darnozom_storefront", payment_method: "instapay" },
    ]) {
      const { container } = containerWith({ id: "o", metadata });
      await handler({ event: { data: { id: "pay_1" } }, container } as any);
    }
    const { container } = containerWith(null);
    await handler({ event: { data: { id: "pay_1" } }, container } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on a 5xx failure so the event is retried", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));
    const { container } = containerWith({ id: "o", metadata: manualMeta("instapay") });
    await expect(handler({ event: { data: { id: "pay_1" } }, container } as any)).rejects.toThrow(/503/);
  });

  it("does not retry a 409 (cancelled order) — logs a warning instead", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 409 }));
    const { container, logger } = containerWith({ id: "o", metadata: manualMeta("instapay") });
    await handler({ event: { data: { id: "pay_1" } }, container } as any);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("throws when no secret is configured (fetch returns null)", async () => {
    fetchMock.mockResolvedValue(null);
    const { container } = containerWith({ id: "o", metadata: manualMeta("instapay") });
    await expect(handler({ event: { data: { id: "pay_1" } }, container } as any)).rejects.toThrow(
      /BETTER_AUTH_BRIDGE_SECRET/,
    );
  });
});
