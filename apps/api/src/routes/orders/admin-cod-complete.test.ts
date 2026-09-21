import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const TEST_USER_PREFIX = "test-cod-complete-";
const OWNER = `${TEST_USER_PREFIX}owner`;

const { statusUpdateMock } = vi.hoisted(() => ({
  statusUpdateMock: vi.fn(async () => ({ ok: true })),
}));

vi.mock("../../lib/email/email", () => ({
  sendOrderPlacedConfirmation: vi.fn(),
  sendOrderStatusUpdate: statusUpdateMock,
  sendAdminSalesNotification: vi.fn(),
  sendOrderReceipt: vi.fn(),
  sendOrderAutoCancelledEmail: vi.fn(),
}));

vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (
    req: express.Request & { userId?: string },
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = uid;
    next();
  },
}));

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.header("x-test-admin") === "1") {
      next();
      return;
    }
    _res.status(403).json({ error: "Forbidden" });
  },
}));

vi.mock("../../lib/medusa-order-sync", () => ({
  syncMedusaOrder: vi.fn(async () => undefined),
}));

const { default: ordersRouter } = await import("./index");

function makeApp() {
  const app = express();
  app.use(express.json());
  const noopLog = { info() {}, warn() {}, error() {}, debug() {} };
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = noopLog;
    next();
  });
  app.use(ordersRouter);
  return app;
}

const app = makeApp();

async function seedOrder(overrides: Partial<NewOrder> = {}): Promise<number> {
  const [row] = await db
    .insert(orders)
    .values({
      userId: OWNER,
      userEmail: "buyer@example.com",
      fullName: "COD Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "cash_on_delivery",
      paymentStatus: "unpaid",
      status: "processing",
      totalAmount: "150.00",
      shippingTotal: "30.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

describe("PUT /admin/orders/:id — COD paid on completed", () => {
  beforeAll(async () => {
    // ensure clean slate for this prefix
    await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  });

  afterEach(async () => {
    statusUpdateMock.mockClear();
    await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  });

  afterAll(async () => {
    await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  });

  it("marks COD unpaid → paid when status becomes completed", async () => {
    const orderId = await seedOrder();

    const res = await request(app)
      .put(`/admin/orders/${orderId}`)
      .set("x-test-admin", "1")
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(res.body.status).toBe("completed");
    expect(res.body.paidAt).toBeTruthy();

    const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(row.paymentStatus).toBe("paid");
    expect(row.paidAt).toBeTruthy();
    expect(statusUpdateMock).toHaveBeenCalledOnce();
  });

  it("does not mark PayPal orders paid when completed", async () => {
    const orderId = await seedOrder({
      paymentMethod: "paypal",
      paymentStatus: "pending",
      paypalOrderId: "PP-test",
    });

    const res = await request(app)
      .put(`/admin/orders/${orderId}`)
      .set("x-test-admin", "1")
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.paidAt).toBeFalsy();
  });

  it("does not re-stamp paidAt when COD already paid", async () => {
    const paidAt = new Date("2026-01-15T10:00:00.000Z");
    const orderId = await seedOrder({
      paymentStatus: "paid",
      paidAt,
      status: "processing",
    });

    const res = await request(app)
      .put(`/admin/orders/${orderId}`)
      .set("x-test-admin", "1")
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(new Date(res.body.paidAt).toISOString()).toBe(paidAt.toISOString());
  });
});
