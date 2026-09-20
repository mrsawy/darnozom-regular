import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/create-book-product", () => ({
  createBookProduct: vi.fn(),
}));

import { createBookProduct } from "../../../lib/create-book-product";
import { POST } from "./route";

function fakeReq(body: any = {}) {
  return { body, scope: {} } as any;
}

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("POST /admin/books", () => {
  it("returns 201 with the created product", async () => {
    vi.mocked(createBookProduct).mockResolvedValue({
      product: { id: "prod_1" },
      paperVariantId: "var_p",
      digitalVariantId: "var_d",
    });
    const res = fakeRes();
    await POST(
      fakeReq({
        title: "Book",
        salesChannelId: "sc_1",
        paperPrice: 100,
        digitalPrice: 50,
        paperInventoryQty: 5,
      }),
      res,
    );

    expect(createBookProduct).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        title: "Book",
        salesChannelId: "sc_1",
        paperPrice: 100,
        digitalPrice: 50,
        paperInventoryQty: 5,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      product: { id: "prod_1" },
      paperVariantId: "var_p",
      digitalVariantId: "var_d",
    });
  });

  it("returns 400 for validation errors from createBookProduct", async () => {
    vi.mocked(createBookProduct).mockRejectedValue(
      new Error("title is required"),
    );
    const res = fakeRes();
    await POST(fakeReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "title is required" });
  });
});
