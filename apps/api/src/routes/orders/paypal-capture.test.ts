import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Readable } from "stream";
import { db, orders, orderItems, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Money-sensitive integration tests for the PayPal capture + digital-unlock
// flow. These hit the REAL database (rows are seeded and cleaned up) but stub
// out the two external boundaries: PayPal (network) and object storage.
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-capture-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const STRANGER = `${TEST_USER_PREFIX}stranger`;

// Shared, per-test-controllable PayPal capture result.
const { captureMock } = vi.hoisted(() => ({ captureMock: vi.fn() }));

vi.mock("../../lib/paypal", () => ({
  capturePayPalOrder: captureMock,
  createPayPalOrder: vi.fn(),
}));

// Stub auth: trust an `x-test-user` header instead of Clerk. Absent → 401.
vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (
    req: express.Request & { clerkUserId?: string },
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.clerkUserId = uid;
    next();
  },
}));

// Stub admin middleware (admin routes are not exercised here).
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (
    _req: express.Request,
    res: express.Response,
  ) => res.status(403).json({ error: "Forbidden" }),
}));

// Stub object storage so the digital-file route resolves without real GCS.
vi.mock("../../lib/objectStorage", () => {
  const file = {
    exists: vi.fn(async () => [true]),
    getMetadata: vi.fn(async () => [{ size: 3 }]),
    createReadStream: vi.fn(() => Readable.from([Buffer.from("pdf")])),
  };
  return {
    ObjectStorageService: class {
      getPrivateObjectDir() {
        return "test-bucket/private";
      }
    },
    objectStorageClient: {
      bucket: () => ({ file: () => file }),
    },
  };
});

// Import the router only AFTER the mocks are registered.
const { default: ordersRouter } = await import("./index");

function makeApp() {
  const app = express();
  app.use(express.json());
  // The real server attaches `req.log` via pino-http; stub a no-op logger so
  // the route's logging branches don't throw in tests.
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
      fullName: "Test Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "paypal",
      paymentStatus: "pending",
      paypalOrderId: `PP-${Math.random().toString(36).slice(2)}`,
      totalAmount: "100.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

async function seedDigitalItem(orderId: number): Promise<number> {
  const [row] = await db
    .insert(orderItems)
    .values({
      orderId,
      productType: "book",
      productId: 999999,
      productTitle: "Test Digital Book",
      quantity: 1,
      unitPrice: "100.00",
      currency: "EGP",
      format: "digital",
      digitalFileUrlSnapshot: "internal://book-pdfs/test-object-id",
    })
    .returning();
  return row.id;
}

async function getOrder(id: number) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row;
}

beforeAll(async () => {
  // Ensure a clean slate in case a previous aborted run left rows behind.
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

afterEach(() => {
  captureMock.mockReset();
});

afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

describe("POST /store/orders/:id/capture", () => {
  it("returns 402 and leaves the order unpaid when capture is not COMPLETED", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: false,
      captureId: null,
      status: "DECLINED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(402);
    expect(res.body.paypalStatus).toBe("DECLINED");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(after.status).toBe("pending");
    expect(after.paidAt).toBeNull();
    expect(after.paypalCaptureId).toBeNull();
  });

  it("marks the order paid + confirmed on a COMPLETED capture", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-123",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(res.body.status).toBe("confirmed");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paypalCaptureId).toBe("CAP-123");
    expect(after.paidAt).not.toBeNull();
  });

  it("is idempotent: a duplicate capture stays paid and never re-charges", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-DUP",
      status: "COMPLETED",
    });

    const first = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);
    expect(first.status).toBe(200);
    expect(first.body.paymentStatus).toBe("paid");
    expect(captureMock).toHaveBeenCalledTimes(1);

    // Second attempt: the route short-circuits on the already-paid state, so
    // PayPal is never called again.
    const second = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);
    expect(second.status).toBe(200);
    expect(second.body.paymentStatus).toBe("paid");
    expect(captureMock).toHaveBeenCalledTimes(1);

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
  });

  it("reconciles an ORDER_ALREADY_CAPTURED result without a false failure", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-RECON",
      status: "COMPLETED",
      alreadyCaptured: true,
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.paypalCaptureId).toBe("CAP-RECON");
  });

  it("returns 404 when a non-owning user attempts the capture", async () => {
    const orderId = await seedOrder();
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-STRANGER",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", STRANGER);

    expect(res.status).toBe(404);
    // PayPal must never be contacted for someone else's order.
    expect(captureMock).not.toHaveBeenCalled();

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(after.paypalCaptureId).toBeNull();
  });

  it("returns 401 when unauthenticated", async () => {
    const orderId = await seedOrder();
    const res = await request(app).post(`/store/orders/${orderId}/capture`);
    expect(res.status).toBe(401);
    expect(captureMock).not.toHaveBeenCalled();
  });
});

describe("digital unlock on /account after payment", () => {
  it("serves the PDF once the order is paid", async () => {
    const orderId = await seedOrder({ paymentStatus: "pending" });
    const itemId = await seedDigitalItem(orderId);

    // Before payment: locked.
    const locked = await request(app)
      .get(`/account/me/orders/${orderId}/items/${itemId}/file`)
      .set("x-test-user", OWNER);
    expect(locked.status).toBe(403);

    // Capture completes → order becomes paid.
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-UNLOCK",
      status: "COMPLETED",
    });
    await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER)
      .expect(200);

    // After payment: unlocked.
    const unlocked = await request(app)
      .get(`/account/me/orders/${orderId}/items/${itemId}/file`)
      .set("x-test-user", OWNER);
    expect(unlocked.status).toBe(200);
    expect(unlocked.headers["content-type"]).toContain("application/pdf");
  });

  it("keeps the PDF locked for a failed/unpaid order", async () => {
    const orderId = await seedOrder({ paymentStatus: "failed" });
    const itemId = await seedDigitalItem(orderId);

    const res = await request(app)
      .get(`/account/me/orders/${orderId}/items/${itemId}/file`)
      .set("x-test-user", OWNER);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Payment not completed");
  });

  it("keeps the PDF locked for a cancelled order even if marked paid", async () => {
    const orderId = await seedOrder({
      paymentStatus: "paid",
      status: "cancelled",
    });
    const itemId = await seedDigitalItem(orderId);

    const res = await request(app)
      .get(`/account/me/orders/${orderId}/items/${itemId}/file`)
      .set("x-test-user", OWNER);
    expect(res.status).toBe(403);
  });

  it("refuses to serve another user's paid digital item", async () => {
    const orderId = await seedOrder({ paymentStatus: "paid", status: "confirmed" });
    const itemId = await seedDigitalItem(orderId);

    const res = await request(app)
      .get(`/account/me/orders/${orderId}/items/${itemId}/file`)
      .set("x-test-user", STRANGER);
    expect(res.status).toBe(404);
  });
});
