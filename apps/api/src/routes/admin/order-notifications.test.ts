import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, type NewOrder } from "@workspace/db";
import { like } from "drizzle-orm";

const PREFIX = "test-order-notif-";

const { medusaMock } = vi.hoisted(() => ({ medusaMock: vi.fn() }));
vi.mock("../../lib/medusa-admin", () => ({ medusaAdmin: medusaMock }));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).json({ error: "Forbidden" }),
}));

const { default: router } = await import("./order-notifications");
const app = express().use("/api", router);

async function seed(overrides: Partial<NewOrder> = {}) {
  const [row] = await db
    .insert(orders)
    .values({
      userId: `${PREFIX}u`,
      userEmail: "buyer@example.com",
      fullName: "Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "vodafone_cash",
      paymentStatus: "pending",
      status: "pending",
      totalAmount: "66.00",
      medusaOrderId: "order_mirror",
      ...overrides,
    })
    .returning();
  return row;
}

afterEach(async () => {
  medusaMock.mockReset();
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});
afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});

const nativeMedusaOrder = {
  id: "order_native",
  display_id: 57,
  email: "walkin@example.com",
  status: "pending",
  payment_status: "captured",
  created_at: "2030-01-01T10:00:00.000Z",
  currency_code: "egp",
  total: 120,
  metadata: null,
};
const mirroredOrder = { ...nativeMedusaOrder, id: "order_mirror", metadata: { darnozom_order_id: 1 } };

describe("GET /api/admin/order-notifications", () => {
  it("is admin only", async () => {
    expect((await request(app).get("/api/admin/order-notifications")).status).toBe(403);
  });

  it("merges storefront orders with orders created in Medusa, newest first", async () => {
    const mine = await seed();
    medusaMock.mockResolvedValue({ orders: [nativeMedusaOrder, mirroredOrder] });

    const res = await request(app).get("/api/admin/order-notifications").set("x-test-admin", "1");
    expect(res.status).toBe(200);
    const list = res.body.orders as any[];

    // Medusa's own mirror of a storefront order is not listed twice.
    expect(list.filter((o) => o.medusaOrderId === "order_mirror")).toHaveLength(1);
    expect(list[0]).toMatchObject({
      key: "medusa:order_native",
      source: "medusa",
      ref: "#57",
      email: "walkin@example.com",
      total: "120.00",
      currency: "EGP",
      needsPaymentReview: false,
    });
    expect(list.find((o) => o.key === `storefront:${mine.id}`)).toMatchObject({
      source: "storefront",
      ref: `#${mine.id}`,
      total: "66.00",
      paymentMethod: "vodafone_cash",
      needsPaymentReview: true,
      medusaOrderId: "order_mirror",
    });
  });

  it("still lists storefront orders when Medusa is unreachable", async () => {
    const mine = await seed({ paymentStatus: "paid", status: "confirmed" });
    medusaMock.mockRejectedValue(new Error("down"));
    const res = await request(app).get("/api/admin/order-notifications").set("x-test-admin", "1");
    expect(res.status).toBe(200);
    expect(res.body.medusaUnavailable).toBe(true);
    expect(res.body.orders.find((o: any) => o.key === `storefront:${mine.id}`)).toMatchObject({
      needsPaymentReview: false,
    });
  });
});
