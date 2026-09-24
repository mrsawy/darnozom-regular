import { describe, it, expect, vi, beforeEach } from "vitest"

const runMock = vi.fn(async () => ({}))
vi.mock("../workflows/send-order-confirmation", () => ({
  sendOrderConfirmationWorkflow: () => ({ run: runMock }),
}))

const { default: orderPlacedHandler } = await import("./order-placed")

describe("order-placed subscriber", () => {
  beforeEach(() => {
    runMock.mockClear()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })),
    )
    process.env.BETTER_AUTH_BRIDGE_SECRET = "test-secret"
    process.env.DARNOZOM_API_URL = "http://127.0.0.1:8087"
  })

  it("skips Express-synced storefront orders", async () => {
    const graph = vi.fn(async () => ({
      data: [
        {
          id: "order_1",
          metadata: { source: "darnozom_storefront", darnozom_order_id: 42 },
        },
      ],
    }))
    await orderPlacedHandler({
      event: { data: { id: "order_1" }, name: "order.placed" },
      container: { resolve: () => ({ graph }) },
    } as any)
    expect(runMock).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends confirmation for native Medusa orders", async () => {
    const graph = vi.fn(async () => ({
      data: [
        {
          id: "order_2",
          email: "a@b.com",
          created_at: "2026-01-01T00:00:00.000Z",
          currency_code: "egp",
          total: 5000,
          metadata: {},
        },
      ],
    }))
    await orderPlacedHandler({
      event: { data: { id: "order_2" }, name: "order.placed" },
      container: { resolve: () => ({ graph }) },
    } as any)
    expect(runMock).toHaveBeenCalledWith({ input: { id: "order_2" } })
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8087/api/internal/admin-notify/order-new",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-secret",
        }),
      }),
    )
  })

  it("reports the total in major units (Medusa v2 does not use cents)", async () => {
    const graph = vi.fn(async () => ({
      data: [{ id: "order_3", created_at: "2026-01-01T00:00:00.000Z", currency_code: "egp", total: 66, metadata: {} }],
    }))
    await orderPlacedHandler({
      event: { data: { id: "order_3" }, name: "order.placed" },
      container: { resolve: () => ({ graph }) },
    } as any)
    const body = JSON.parse((fetch as any).mock.calls[0][1].body)
    expect(body.totalAmount).toBe("66.00")
  })
})
