import { beforeEach, describe, expect, it, vi } from "vitest"

const createOrUpdateRun = vi.fn()
const markRun = vi.fn()

vi.mock("@medusajs/medusa/core-flows", () => ({
  createOrUpdateOrderPaymentCollectionWorkflow: () => ({
    run: createOrUpdateRun,
  }),
  markPaymentCollectionAsPaid: () => ({ run: markRun }),
}))

const { ensureOrderPaymentCollection } = await import(
  "./ensure-order-payment-collection"
)

describe("ensureOrderPaymentCollection", () => {
  beforeEach(() => {
    createOrUpdateRun.mockReset()
    markRun.mockReset()
    createOrUpdateRun.mockResolvedValue({ result: [{ id: "paycol_new" }] })
    markRun.mockResolvedValue({})
  })

  it("creates a not_paid collection when outstanding and none exists", async () => {
    const graph = vi.fn(async () => ({
      data: [
        {
          id: "order_1",
          status: "pending",
          summary: { pending_difference: 30 },
          payment_collections: [],
        },
      ],
    }))

    const result = await ensureOrderPaymentCollection(
      { resolve: () => ({ graph }) } as any,
      "order_1",
    )

    expect(createOrUpdateRun).toHaveBeenCalledWith({
      input: { order_id: "order_1" },
    })
    expect(result).toEqual({
      paymentCollectionId: "paycol_new",
      created: true,
    })
    expect(markRun).not.toHaveBeenCalled()
  })

  it("reuses existing not_paid collection and can mark it paid", async () => {
    const graph = vi.fn(async () => ({
      data: [
        {
          id: "order_2",
          status: "pending",
          summary: { pending_difference: 30 },
          payment_collections: [{ id: "paycol_1", status: "not_paid" }],
        },
      ],
    }))

    const result = await ensureOrderPaymentCollection(
      { resolve: () => ({ graph }) } as any,
      "order_2",
      { markPaid: true, providerId: "pp_system_default" },
    )

    expect(createOrUpdateRun).not.toHaveBeenCalled()
    expect(markRun).toHaveBeenCalledWith({
      input: {
        order_id: "order_2",
        payment_collection_id: "paycol_1",
        provider_id: "pp_system_default",
      },
    })
    expect(result.created).toBe(false)
    expect(result.paymentCollectionId).toBe("paycol_1")
  })

  it("skips when there is no outstanding amount", async () => {
    const graph = vi.fn(async () => ({
      data: [
        {
          id: "order_3",
          status: "completed",
          summary: { pending_difference: 0 },
          payment_collections: [],
        },
      ],
    }))

    const result = await ensureOrderPaymentCollection(
      { resolve: () => ({ graph }) } as any,
      "order_3",
    )

    expect(createOrUpdateRun).not.toHaveBeenCalled()
    expect(result).toEqual({ paymentCollectionId: null, created: false })
  })
})
