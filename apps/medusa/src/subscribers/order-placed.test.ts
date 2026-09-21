import { describe, it, expect, vi, beforeEach } from "vitest"

const runMock = vi.fn(async () => ({}))
vi.mock("../workflows/send-order-confirmation", () => ({
  sendOrderConfirmationWorkflow: () => ({ run: runMock }),
}))

const { default: orderPlacedHandler } = await import("./order-placed")

describe("order-placed subscriber", () => {
  beforeEach(() => {
    runMock.mockClear()
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
  })

  it("sends confirmation for native Medusa orders", async () => {
    const graph = vi.fn(async () => ({
      data: [{ id: "order_2", metadata: {} }],
    }))
    await orderPlacedHandler({
      event: { data: { id: "order_2" }, name: "order.placed" },
      container: { resolve: () => ({ graph }) },
    } as any)
    expect(runMock).toHaveBeenCalledWith({ input: { id: "order_2" } })
  })
})
