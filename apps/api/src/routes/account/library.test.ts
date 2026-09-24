import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Readable } from "node:stream";
import { db, orders, orderItems, type NewOrder } from "@workspace/db";
import { like } from "drizzle-orm";

const PREFIX = "test-library-";
const BUYER = `${PREFIX}buyer`;
const OTHER = `${PREFIX}other`;

const { listFilesMock, getFileMock, existsMock, metaMock, streamMock } = vi.hoisted(() => ({
  listFilesMock: vi.fn(),
  getFileMock: vi.fn(),
  existsMock: vi.fn(async () => true),
  metaMock: vi.fn(async () => ({ contentType: "application/pdf", size: 8 })),
  streamMock: vi.fn(() => Readable.from([Buffer.from("%PDF-1.7")])),
}));

vi.mock("../../lib/medusa-digital-files", () => ({
  listDigitalFilesForVariants: listFilesMock,
  getDigitalFile: getFileMock,
}));
vi.mock("@workspace/object-store", () => ({
  privateObjectExists: existsMock,
  readPrivateObjectMeta: metaMock,
  openPrivateObjectStream: streamMock,
}));
vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const uid = req.header("x-test-user");
    if (!uid) return res.status(401).json({ error: "Unauthorized" });
    req.userId = uid;
    next();
  },
}));

const { default: router } = await import("./library");
const app = express();
app.use((req, _res, next) => {
  (req as any).log = { info() {}, warn() {}, error() {}, debug() {} };
  next();
});
app.use(router);

async function seedOrder(
  order: Partial<NewOrder>,
  items: Array<{ format: "digital" | "paper"; variantId?: string | null; title?: string; snapshot?: string | null }>,
) {
  const [row] = await db
    .insert(orders)
    .values({
      userId: BUYER,
      userEmail: "buyer@example.com",
      fullName: "Buyer",
      phone: "01000000000",
      currency: "EGP",
      itemsCount: items.length,
      paymentMethod: "vodafone_cash",
      paymentStatus: "paid",
      totalAmount: "250.00",
      shippingTotal: "0.00",
      ...order,
    })
    .returning();
  const inserted = await db
    .insert(orderItems)
    .values(
      items.map((it) => ({
        orderId: row.id,
        productType: "book" as const,
        productId: "prod_1",
        productTitle: it.title ?? "Digital Book",
        quantity: 1,
        unitPrice: "250.00",
        currency: "EGP",
        format: it.format,
        variantId: it.variantId ?? null,
        digitalFileUrlSnapshot: it.snapshot ?? null,
      })),
    )
    .returning();
  return { orderId: row.id, itemIds: inserted.map((i) => i.id) };
}

const pdf = {
  id: "dbf_1",
  variant_id: "var_d",
  title: "Full book",
  file_name: "book.pdf",
  mime_type: "application/pdf",
  size: 8,
  sort_order: 0,
  relative_key: "book-files/var_d/x-book.pdf",
};
const mp3 = { ...pdf, id: "dbf_2", title: "Chapter 1 audio", file_name: "ch1.mp3", mime_type: "audio/mpeg", sort_order: 1, relative_key: "book-files/var_d/y-ch1.mp3" };

afterEach(async () => {
  vi.clearAllMocks();
  existsMock.mockResolvedValue(true);
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});
afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});

describe("GET /account/me/library", () => {
  it("requires sign-in", async () => {
    expect((await request(app).get("/account/me/library")).status).toBe(401);
  });

  it("lists paid digital books with their files; hides the storage key", async () => {
    await seedOrder({}, [{ format: "digital", variantId: "var_d" }, { format: "paper", variantId: "var_p" }]);
    listFilesMock.mockResolvedValue([pdf, mp3]);
    const res = await request(app).get("/account/me/library").set("x-test-user", BUYER);
    expect(res.status).toBe(200);
    expect(listFilesMock).toHaveBeenCalledWith(["var_d"]);
    expect(res.body.books).toHaveLength(1);
    const book = res.body.books[0];
    expect(book).toMatchObject({ title: "Digital Book", status: "available" });
    expect(book.files).toEqual([
      { id: "dbf_1", title: "Full book", fileName: "book.pdf", kind: "pdf", size: 8, url: "/api/account/me/library/files/dbf_1" },
      { id: "dbf_2", title: "Chapter 1 audio", fileName: "ch1.mp3", kind: "audio", size: 8, url: "/api/account/me/library/files/dbf_2" },
    ]);
    expect(JSON.stringify(res.body)).not.toContain("book-files/");
  });

  it("shows unpaid orders as awaiting payment with no files", async () => {
    await seedOrder({ paymentStatus: "pending" }, [{ format: "digital", variantId: "var_d" }]);
    listFilesMock.mockResolvedValue([pdf]);
    const res = await request(app).get("/account/me/library").set("x-test-user", BUYER);
    expect(res.body.books[0]).toMatchObject({ status: "awaiting_payment", files: [] });
  });

  it("leaves out cancelled orders and other people's orders", async () => {
    await seedOrder({ status: "cancelled" }, [{ format: "digital", variantId: "var_d" }]);
    await seedOrder({ userId: OTHER }, [{ format: "digital", variantId: "var_x" }]);
    listFilesMock.mockResolvedValue([]);
    const res = await request(app).get("/account/me/library").set("x-test-user", BUYER);
    expect(res.body.books).toEqual([]);
  });

  it("shows a book bought twice once, as available when either order is paid", async () => {
    await seedOrder({ paymentStatus: "pending" }, [{ format: "digital", variantId: "var_d" }]);
    await seedOrder({}, [{ format: "digital", variantId: "var_d" }]);
    listFilesMock.mockResolvedValue([pdf]);
    const res = await request(app).get("/account/me/library").set("x-test-user", BUYER);
    expect(res.body.books).toHaveLength(1);
    expect(res.body.books[0].status).toBe("available");
  });

  it("keeps legacy single-PDF purchases working through the old file route", async () => {
    const { orderId, itemIds } = await seedOrder({}, [
      { format: "digital", variantId: null, title: "Legacy Book", snapshot: "internal://book-pdfs/abc" },
    ]);
    listFilesMock.mockResolvedValue([]);
    const res = await request(app).get("/account/me/library").set("x-test-user", BUYER);
    expect(res.body.books[0].files).toEqual([
      {
        id: `legacy-${itemIds[0]}`,
        title: "Legacy Book",
        fileName: "Legacy Book.pdf",
        kind: "pdf",
        size: null,
        url: `/api/account/me/orders/${orderId}/items/${itemIds[0]}/file`,
      },
    ]);
  });

  it("still lists books (without files) when Medusa is unreachable", async () => {
    await seedOrder({}, [{ format: "digital", variantId: "var_d" }]);
    listFilesMock.mockRejectedValue(new Error("medusa down"));
    const res = await request(app).get("/account/me/library").set("x-test-user", BUYER);
    expect(res.status).toBe(200);
    expect(res.body.books[0]).toMatchObject({ status: "available", files: [], filesUnavailable: true });
  });
});

describe("GET /account/me/library/files/:fileId", () => {
  it("streams the file to a buyer with a paid order", async () => {
    await seedOrder({}, [{ format: "digital", variantId: "var_d" }]);
    getFileMock.mockResolvedValue(pdf);
    const res = await request(app).get("/account/me/library/files/dbf_1").set("x-test-user", BUYER);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toBe('inline; filename="book.pdf"');
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(streamMock).toHaveBeenCalledWith("book-files/var_d/x-book.pdf");
  });

  it("forces a download when ?download=1", async () => {
    await seedOrder({}, [{ format: "digital", variantId: "var_d" }]);
    getFileMock.mockResolvedValue(pdf);
    const res = await request(app).get("/account/me/library/files/dbf_1?download=1").set("x-test-user", BUYER);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="book.pdf"');
  });

  it("403s while the payment is not confirmed", async () => {
    await seedOrder({ paymentStatus: "pending" }, [{ format: "digital", variantId: "var_d" }]);
    getFileMock.mockResolvedValue(pdf);
    const res = await request(app).get("/account/me/library/files/dbf_1").set("x-test-user", BUYER);
    expect(res.status).toBe(403);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("403s for someone who did not buy that edition", async () => {
    await seedOrder({ userId: OTHER }, [{ format: "digital", variantId: "var_d" }]);
    await seedOrder({}, [{ format: "digital", variantId: "var_other" }]);
    getFileMock.mockResolvedValue(pdf);
    const res = await request(app).get("/account/me/library/files/dbf_1").set("x-test-user", BUYER);
    expect(res.status).toBe(403);
  });

  it("403s for a cancelled order", async () => {
    await seedOrder({ status: "cancelled" }, [{ format: "digital", variantId: "var_d" }]);
    getFileMock.mockResolvedValue(pdf);
    const res = await request(app).get("/account/me/library/files/dbf_1").set("x-test-user", BUYER);
    expect(res.status).toBe(403);
  });

  it("404s for an unknown file or a missing stored object", async () => {
    getFileMock.mockResolvedValue(null);
    expect((await request(app).get("/account/me/library/files/nope").set("x-test-user", BUYER)).status).toBe(404);

    await seedOrder({}, [{ format: "digital", variantId: "var_d" }]);
    getFileMock.mockResolvedValue(pdf);
    existsMock.mockResolvedValue(false);
    expect((await request(app).get("/account/me/library/files/dbf_1").set("x-test-user", BUYER)).status).toBe(404);
  });
});
