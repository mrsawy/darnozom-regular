import { afterEach, describe, it, expect, vi } from "vitest"
import { GET } from "./route"

function fakeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
})

describe("GET /admin/darnozom/notifications-config", () => {
  it("gives the admin bell the socket address and a signed token", async () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "s"
    process.env.DARNOZOM_PUBLIC_API_URL = "https://darnozom.com/"
    const res = fakeRes()
    await GET({} as any, res)
    const body = res.json.mock.calls[0][0]
    expect(body.socketUrl).toBe("https://darnozom.com")
    expect(body.socketPath).toBe("/api/socket.io")
    expect(body.token).toMatch(/^\d+\.[\w-]+$/)
  })

  it("defaults to the local API in development", async () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "s"
    delete process.env.DARNOZOM_PUBLIC_API_URL
    const res = fakeRes()
    await GET({} as any, res)
    expect(res.json.mock.calls[0][0].socketUrl).toBe("http://localhost:8087")
  })

  it("returns no token when the bridge secret is missing (live updates off, polling still works)", async () => {
    delete process.env.BETTER_AUTH_BRIDGE_SECRET
    const res = fakeRes()
    await GET({} as any, res)
    expect(res.json.mock.calls[0][0].token).toBeNull()
  })
})
