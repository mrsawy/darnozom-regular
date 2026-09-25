import { describe, expect, it, vi, beforeEach } from "vitest";

const { createBookMock } = vi.hoisted(() => ({ createBookMock: vi.fn() }));
vi.mock("../../../lib/create-book", () => ({
  createBook: createBookMock,
  makeCreateBookDeps: () => ({}),
}));

import { POST } from "./route";
import { BookProfileConflictError } from "../../../modules/book-catalog";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}
const valid = {
  title: "Book",
  sales_channel_id: "sc_1",
  print: { price: 100, stock: 5 },
  profile: { authors: ["A"], language: "ar" },
};

describe("POST /admin/books", () => {
  beforeEach(() => createBookMock.mockReset());

  it("returns 201 with the created book", async () => {
    createBookMock.mockResolvedValue({ product: { id: "prod_1" }, paperVariantId: "v", digitalVariantId: null, profile: {} });
    const res = fakeRes();
    await POST({ body: valid, scope: {} } as any, res);
    expect(createBookMock.mock.calls[0][1]).toMatchObject({ title: "Book", print: { price: 100, stock: 5 } });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 400 with field errors for an invalid body", async () => {
    const res = fakeRes();
    await POST({ body: { title: "" }, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(createBookMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a duplicate ISBN", async () => {
    createBookMock.mockRejectedValueOnce(new BookProfileConflictError("exists"));
    const res = fakeRes();
    await POST({ body: valid, scope: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
