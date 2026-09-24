import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const PREFIX = "test-manual-routes-";
const OWNER = `${PREFIX}owner`;

const { paidMock, ensureMock, findMock } = vi.hoisted(() => ({
  paidMock: vi.fn(async () => undefined),
  ensureMock: vi.fn(async () => undefined),
  findMock: vi.fn(async () => null as string | null),
}));

vi.mock("../../lib/email/orderPaidNotifications", () => ({ sendOrderPaidNotifications: paidMock }));
vi.mock("../../lib/medusa-order-sync", () => ({
  ensureMedusaOrderPayable: ensureMock,
  findMedusaOrderIdByDarnozomId: findMock,
}));
vi.mock("../../middlewares/authMiddleware", () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    const uid = req.header("x-test-user");
    if (uid) {
      req.userId = uid;
      req.userEmail = "buyer@example.com";
    }
    next();
  },
  requireAuth: (_req: any, res: any) => res.status(401).end(),
}));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).json({ error: "Forbidden" }),
}));

const { default: router } = await import("./manual-payments");

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).log = { info() {}, warn() {}, error() {}, debug() {} };
  next();
});
app.use(router);

async function seed(overrides: Partial<NewOrder> = {}) {
  const [row] = await db
    .insert(orders)
    .values({
      userId: OWNER,
      userEmail: "buyer@example.com",
      fullName: "Buyer",
      phone: "01000000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "instapay",
      paymentStatus: "pending",
      totalAmount: "250.00",
      shippingTotal: "0.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

beforeEach(() => {
  process.env.BETTER_AUTH_BRIDGE_SECRET = "bridge";
});
afterEach(async () => {
  paidMock.mockClear();
  ensureMock.mockReset();
  findMock.mockReset();
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
  await db.delete(orders).where(like(orders.userEmail, `${PREFIX}%`));
});
afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});

describe("GET /store/orders/:id/manual-payment", () => {
  it("returns the summary to the signed-in owner", async () => {
    const id = await seed();
    const res = await request(app).get(`/store/orders/${id}/manual-payment`).set("x-test-user", OWNER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id,
      totalAmount: "250.00",
      currency: "EGP",
      paymentMethod: "instapay",
      paymentStatus: "pending",
    });
  });

  it("returns the summary to a guest who passes the order email", async () => {
    const id = await seed({ userId: null, userEmail: `${PREFIX}guest@example.com` });
    const res = await request(app)
      .get(`/store/orders/${id}/manual-payment`)
      .query({ email: `${PREFIX}GUEST@example.com` });
    expect(res.status).toBe(200);
  });

  it("404s for strangers and for non-manual orders", async () => {
    const id = await seed();
    const stranger = await request(app)
      .get(`/store/orders/${id}/manual-payment`)
      .set("x-test-user", "someone-else");
    expect(stranger.status).toBe(404);
    const paypal = await seed({ paymentMethod: "paypal" });
    const res = await request(app).get(`/store/orders/${paypal}/manual-payment`).set("x-test-user", OWNER);
    expect(res.status).toBe(404);
  });
});

describe("POST /internal/orders/:id/mark-paid", () => {
  it("rejects a bad secret", async () => {
    const id = await seed();
    const res = await request(app)
      .post(`/internal/orders/${id}/mark-paid`)
      .set("Authorization", "Bearer nope");
    expect(res.status).toBe(401);
  });

  it("marks paid, then reports alreadyPaid on repeat", async () => {
    const id = await seed();
    const first = await request(app)
      .post(`/internal/orders/${id}/mark-paid`)
      .set("Authorization", "Bearer bridge")
      .send({ medusaOrderId: "order_m" });
    expect(first.body).toEqual({ ok: true, alreadyPaid: false });
    const second = await request(app)
      .post(`/internal/orders/${id}/mark-paid`)
      .set("Authorization", "Bearer bridge");
    expect(second.body).toEqual({ ok: true, alreadyPaid: true });
    expect(paidMock).toHaveBeenCalledOnce();
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.medusaOrderId).toBe("order_m");
  });

  it("409s a cancelled order", async () => {
    const id = await seed({ status: "cancelled" });
    const res = await request(app)
      .post(`/internal/orders/${id}/mark-paid`)
      .set("Authorization", "Bearer bridge");
    expect(res.status).toBe(409);
  });
});

describe("POST /admin/orders/:id/confirm-payment", () => {
  it("marks Medusa paid first, then Express, using the stored medusaOrderId", async () => {
    const id = await seed({ medusaOrderId: "order_m1" });
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(ensureMock).toHaveBeenCalledWith("order_m1", 250, {
      markPaid: true,
      providerId: "pp_system_default",
    });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("falls back to lookup when medusaOrderId is missing", async () => {
    findMock.mockResolvedValue("order_found");
    const id = await seed();
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(200);
    expect(ensureMock).toHaveBeenCalledWith("order_found", 250, expect.anything());
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.medusaOrderId).toBe("order_found");
  });

  it("502s and changes nothing when the Medusa order cannot be found", async () => {
    const id = await seed();
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(502);
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.paymentStatus).toBe("pending");
    expect(paidMock).not.toHaveBeenCalled();
  });

  it("502s and changes nothing when Medusa mark-as-paid fails", async () => {
    ensureMock.mockRejectedValue(new Error("medusa down"));
    const id = await seed({ medusaOrderId: "order_m2" });
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(502);
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.paymentStatus).toBe("pending");
  });

  it("confirm then Medusa callback sends one email", async () => {
    const id = await seed({ medusaOrderId: "order_m3" });
    await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    const cb = await request(app)
      .post(`/internal/orders/${id}/mark-paid`)
      .set("Authorization", "Bearer bridge");
    expect(cb.body.alreadyPaid).toBe(true);
    expect(paidMock).toHaveBeenCalledOnce();
  });

  it("rejects non-manual orders and requires admin", async () => {
    const paypal = await seed({ paymentMethod: "paypal" });
    const asAdmin = await request(app)
      .post(`/admin/orders/${paypal}/confirm-payment`)
      .set("x-test-admin", "1");
    expect(asAdmin.status).toBe(400);
    const anon = await request(app).post(`/admin/orders/${paypal}/confirm-payment`);
    expect(anon.status).toBe(403);
  });
});
