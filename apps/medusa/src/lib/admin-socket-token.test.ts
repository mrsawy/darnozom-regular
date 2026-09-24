import { describe, it, expect } from "vitest"
import { signAdminSocketToken } from "./admin-socket-token"

describe("signAdminSocketToken", () => {
  // Must match apps/api/src/lib/admin-socket-token.test.ts exactly — the API
  // verifies what Medusa signs.
  it("produces the format the API verifies", () => {
    expect(signAdminSocketToken("s3cret", 1_000, 5_000)).toBe(
      "6000.VgeTUhDicaSsOe7I4BVNe-37OpwtxTQ6RVz4FIPM-zU"
    )
  })
})
