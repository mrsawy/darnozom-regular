// apps/medusa/src/api/store/digital-products/[variantId]/access/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { DIGITAL_PRODUCT_MODULE } from "../../../../../modules/digital-product";

// vitest does not load apps/medusa/.env into process.env, but createSignedObjectUrl
// (used by the route) requires MEDUSA_JWT_SECRET, same as signed-object-url.test.ts.
const originalSecret = process.env.MEDUSA_JWT_SECRET;
beforeEach(() => {
  process.env.MEDUSA_JWT_SECRET = "test-secret";
});
afterEach(() => {
  process.env.MEDUSA_JWT_SECRET = originalSecret;
});

function fakeReq(overrides: Partial<any> = {}) {
  return {
    params: { variantId: "variant_digital_1" },
    auth_context: { actor_id: "cus_1" },
    scope: {
      resolve: (key: string) => {
        if (key === DIGITAL_PRODUCT_MODULE) return overrides.digitalProductService;
        if (key === "query") return overrides.query;
        throw new Error(`Unexpected resolve: ${key}`);
      },
    },
    ...overrides,
  };
}

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /store/digital-products/:variantId/access", () => {
  it("returns 403 when the customer has no entitlement", async () => {
    const req = fakeReq({
      digitalProductService: { hasEntitlement: vi.fn().mockResolvedValue(false) },
    });
    const res = fakeRes();

    await GET(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns a signed url when entitled", async () => {
    const req = fakeReq({
      digitalProductService: { hasEntitlement: vi.fn().mockResolvedValue(true) },
      query: {
        graph: vi.fn().mockResolvedValue({
          data: [{ id: "variant_digital_1", digital_product_file: { relative_key: "books/digital/42.pdf" } }],
        }),
      },
    });
    const res = fakeRes();

    await GET(req as any, res as any);

    expect(res.status).not.toHaveBeenCalledWith(403);
    const payload = res.json.mock.calls[0][0];
    expect(payload.url).toContain("/store/digital-products/download");
    expect(payload.expiresAt).toBeTruthy();
  });
});
