import { describe, it, expect, vi, beforeEach } from "vitest"
import ResendNotificationProviderService from "./service"

const sendMock = vi.fn()

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

describe("ResendNotificationProviderService", () => {
  beforeEach(() => {
    sendMock.mockReset()
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null })
  })

  it("validateOptions requires api_key and from", () => {
    expect(() =>
      ResendNotificationProviderService.validateOptions({ from: "a@b.com" }),
    ).toThrow(/api_key/)
    expect(() =>
      ResendNotificationProviderService.validateOptions({ api_key: "re_x" }),
    ).toThrow(/from/)
  })

  it("sends order-placed HTML via Resend", async () => {
    const service = new ResendNotificationProviderService(
      { logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } as any },
      {
        api_key: "re_test",
        from: "Darnozom Consulting <noreply@darnozom.com>",
      },
    )

    const result = await service.send({
      to: "buyer@example.com",
      channel: "email",
      template: "order-placed",
      data: {
        order: {
          display_id: 42,
          currency_code: "egp",
          total: 120,
          item_total: 100,
          tax_total: 0,
          customer: { first_name: "سارة" },
          items: [{ id: "i1", product_title: "كتاب", total: 100 }],
          shipping_methods: [{ id: "s1", name: "القاهرة", total: 20 }],
        },
      },
    } as any)

    expect(result).toEqual({ id: "email_1" })
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["buyer@example.com"],
        from: "Darnozom Consulting <noreply@darnozom.com>",
        subject: "تأكيد الطلب — دار النظم",
        html: expect.stringContaining("كتاب"),
      }),
    )
  })

  it("returns empty when template is unknown", async () => {
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
    const service = new ResendNotificationProviderService(
      { logger: logger as any },
      { api_key: "re_test", from: "noreply@darnozom.com" },
    )

    const result = await service.send({
      to: "a@b.com",
      channel: "email",
      template: "unknown-template",
      data: {},
    } as any)

    expect(result).toEqual({})
    expect(sendMock).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalled()
  })
})
