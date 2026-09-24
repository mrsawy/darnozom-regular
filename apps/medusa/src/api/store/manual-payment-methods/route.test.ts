import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

describe("GET /store/manual-payment-methods", () => {
  it("returns methods without internal ids", async () => {
    const listAllMethods = vi.fn().mockResolvedValue([
      { id: "a", code: "instapay", instapay_address: "dar@instapay", created_at: "x" },
    ]);
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    await GET({ scope: { resolve: () => ({ listAllMethods }) } } as any, res);
    const body = res.json.mock.calls[0][0];
    expect(body.methods[0]).toEqual(
      expect.objectContaining({ code: "instapay", instapay_address: "dar@instapay" }),
    );
    expect(body.methods[0]).not.toHaveProperty("id");
    expect(body.methods[0]).not.toHaveProperty("created_at");
  });
});
