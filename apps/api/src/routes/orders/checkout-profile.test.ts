import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  db,
  orders,
  orderItems,
  books,
  shippingRates,
  checkoutProfiles,
  type NewBook,
} from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tests for remembering customer checkout details:
//   - placing an order upserts the user's checkout profile (name/phone/
//     city/address, no notes),
//   - a second order overwrites the saved details,
//   - GET /account/me/checkout-details returns the saved profile,
//   - falls back to the latest order when no profile row exists,
//   - returns null details for first-time customers,
//   - requires auth.
//
// Like the other order tests, these hit the REAL database (rows are seeded
// and cleaned up) but stub the external boundaries (auth, object storage).
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-ckprofile-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const TEST_CITY = "TestProfileCity";

// Stub auth: trust an `x-test-user` header instead of a session. Absent → 401.
vi.mock("../../middlewares/authMiddleware", () => ({
  optionalAuth: (
    req: express.Request & { userId?: string; userEmail?: string },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (uid) {
      req.userId = uid;
      req.userEmail = req.header("x-test-email") || "buyer@example.com";
    }
    next();
  },
  requireAuth: (
    req: express.Request & { userId?: string; userEmail?: string },
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const uid = req.header("x-test-user");
    if (!uid) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = uid;
    req.userEmail = "buyer@example.com";
    next();
  },
}));

// Stub admin middleware (admin routes are not exercised here).
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (_req: express.Request, res: express.Response) =>
    res.status(403).json({ error: "Forbidden" }),
}));

// Stub object storage so importing the router doesn't require real GCS.
vi.mock("@workspace/object-store", () => ({
  ObjectStorageService: class {
    getPrivateObjectDir() {
      return "test-bucket/private";
    }
  },
  objectStorageClient: {
    bucket: () => ({ file: () => ({}) }),
  },
}));

// Import the routers only AFTER the mocks are registered.
const { default: ordersRouter } = await import("./index");
const { default: accountRouter } = await import("../account");

function makeApp() {
  const app = express();
  app.use(express.json());
  const noopLog = { info() {}, warn() {}, error() {}, debug() {} };
  app.use((req, _res, next) => {
    (req as unknown as { log: unknown }).log = noopLog;
    next();
  });
  app.use(ordersRouter);
  app.use(accountRouter);
  return app;
}

const app = makeApp();

const seededBookIds: number[] = [];

async function seedBook(overrides: Partial<NewBook> = {}): Promise<number> {
  const [row] = await db
    .insert(books)
    .values({
      title: "Test Profile Book",
      category: "management",
      status: "available",
      currency: "EGP",
      paperAvailable: true,
      paperPrice: "150.00",
      digitalAvailable: false,
      ...overrides,
    })
    .returning();
  seededBookIds.push(row.id);
  return row.id;
}

async function seedShippingRate() {
  await db
    .insert(shippingRates)
    .values({ city: TEST_CITY, price: "50.00", currency: "EGP" });
}

async function cleanup() {
  const testOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  const ids = testOrders.map((o) => o.id);
  if (ids.length) {
    await db.delete(orderItems).where(inArray(orderItems.orderId, ids));
    await db.delete(orders).where(inArray(orders.id, ids));
  }
  await db
    .delete(checkoutProfiles)
    .where(like(checkoutProfiles.userId, `${TEST_USER_PREFIX}%`));
  if (seededBookIds.length) {
    await db.delete(books).where(inArray(books.id, seededBookIds));
    seededBookIds.length = 0;
  }
  await db.delete(shippingRates).where(eq(shippingRates.city, TEST_CITY));
}

afterEach(cleanup);
afterAll(cleanup);

function placeOrder(bookId: number, contact: Record<string, string>) {
  return request(app)
    .post("/store/orders")
    .set("x-test-user", OWNER)
    .send({
      fullName: contact.fullName,
      phone: contact.phone,
      city: contact.city,
      address: contact.address,
      notes: contact.notes,
      paymentMethod: "cash_on_delivery",
      items: [{ productType: "book", productId: bookId, quantity: 1, format: "paper" }],
    });
}

describe("checkout profile persistence", () => {
  it("upserts the profile when an order is placed and overwrites on the next order", async () => {
    const bookId = await seedBook();
    await seedShippingRate();

    const res1 = await placeOrder(bookId, {
      fullName: "Ahmed Test",
      phone: "+201000000001",
      city: TEST_CITY,
      address: "1 First St",
      notes: "gift wrap please",
    });
    expect(res1.status).toBe(201);

    let [profile] = await db
      .select()
      .from(checkoutProfiles)
      .where(eq(checkoutProfiles.userId, OWNER));
    expect(profile).toBeDefined();
    expect(profile.fullName).toBe("Ahmed Test");
    expect(profile.phone).toBe("+201000000001");
    expect(profile.city).toBe(TEST_CITY);
    expect(profile.address).toBe("1 First St");

    const res2 = await placeOrder(bookId, {
      fullName: "Ahmed Updated",
      phone: "+201000000002",
      city: TEST_CITY,
      address: "2 Second St",
    });
    expect(res2.status).toBe(201);

    const rows = await db
      .select()
      .from(checkoutProfiles)
      .where(eq(checkoutProfiles.userId, OWNER));
    expect(rows).toHaveLength(1);
    [profile] = rows;
    expect(profile.fullName).toBe("Ahmed Updated");
    expect(profile.phone).toBe("+201000000002");
    expect(profile.address).toBe("2 Second St");
  });

  it("returns saved details via GET /account/me/checkout-details (no notes)", async () => {
    const bookId = await seedBook();
    await seedShippingRate();
    const res = await placeOrder(bookId, {
      fullName: "Sara Test",
      phone: "+201000000003",
      city: TEST_CITY,
      address: "3 Third St",
      notes: "order-specific note",
    });
    expect(res.status).toBe(201);

    const details = await request(app)
      .get("/account/me/checkout-details")
      .set("x-test-user", OWNER);
    expect(details.status).toBe(200);
    expect(details.body.details).toEqual({
      fullName: "Sara Test",
      phone: "+201000000003",
      city: TEST_CITY,
      address: "3 Third St",
    });
    expect(details.body.details.notes).toBeUndefined();
  });

  it("falls back to the latest order when no profile row exists", async () => {
    const bookId = await seedBook();
    await seedShippingRate();
    const res = await placeOrder(bookId, {
      fullName: "Legacy Buyer",
      phone: "+201000000004",
      city: TEST_CITY,
      address: "4 Fourth St",
    });
    expect(res.status).toBe(201);
    // Simulate a pre-feature customer: profile row missing, order exists.
    await db.delete(checkoutProfiles).where(eq(checkoutProfiles.userId, OWNER));

    const details = await request(app)
      .get("/account/me/checkout-details")
      .set("x-test-user", OWNER);
    expect(details.status).toBe(200);
    expect(details.body.details).toEqual({
      fullName: "Legacy Buyer",
      phone: "+201000000004",
      city: TEST_CITY,
      address: "4 Fourth St",
    });
  });

  it("returns null details for a first-time customer", async () => {
    const details = await request(app)
      .get("/account/me/checkout-details")
      .set("x-test-user", `${TEST_USER_PREFIX}fresh`);
    expect(details.status).toBe(200);
    expect(details.body.details).toBeNull();
  });

  it("requires auth", async () => {
    const details = await request(app).get("/account/me/checkout-details");
    expect(details.status).toBe(401);
  });
});
