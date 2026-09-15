import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, books, type NewBook, type NewOrder } from "@workspace/db";
import { eq, inArray, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Money-sensitive integration tests for the mobile-wallet payment path
// (Paymob: Vodafone Cash / Orange Money / Etisalat Cash). Wallet orders are
// charged in EGP directly — no USD conversion. The flow is: create order
// (paymentMethod "wallet" + walletPhone) → Paymob order id + wallet redirect
// URL → webhook / confirm poll flips the order to paid. These hit the REAL
// database (rows are seeded and cleaned up) but stub the external boundaries:
// Paymob (network), PayPal and auth.
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-wallet-";
const OWNER = `${TEST_USER_PREFIX}owner`;
const STRANGER = `${TEST_USER_PREFIX}stranger`;

const {
  redirectCreateMock,
  captureMock,
  convertMock,
  configMock,
  paymobConfiguredMock,
  paymobWalletConfiguredMock,
  paymobCreateMock,
  paymobRegenUrlMock,
  walletCreateMock,
  walletRegenMock,
  paymobStatusMock,
  paymobVerifyHmacMock,
  paidNotificationsMock,
} = vi.hoisted(() => ({
  redirectCreateMock: vi.fn(),
  captureMock: vi.fn(),
  convertMock: vi.fn(),
  configMock: vi.fn(),
  paymobConfiguredMock: vi.fn(),
  paymobWalletConfiguredMock: vi.fn(),
  paymobCreateMock: vi.fn(),
  paymobRegenUrlMock: vi.fn(),
  walletCreateMock: vi.fn(),
  walletRegenMock: vi.fn(),
  paymobStatusMock: vi.fn(),
  paymobVerifyHmacMock: vi.fn(),
  paidNotificationsMock: vi.fn(),
}));

vi.mock("../../lib/payments/paypal", () => ({
  createPayPalOrder: redirectCreateMock,
  capturePayPalOrder: captureMock,
  getPayPalClientConfig: configMock,
}));

vi.mock("../../lib/payments/paymob", () => ({
  isPaymobConfigured: paymobConfiguredMock,
  isPaymobWalletConfigured: paymobWalletConfiguredMock,
  createPaymobCheckout: paymobCreateMock,
  createPaymobCheckoutUrlForExistingOrder: paymobRegenUrlMock,
  createPaymobWalletPayment: walletCreateMock,
  createPaymobWalletRedirectForExistingOrder: walletRegenMock,
  getPaymobTransactionStatus: paymobStatusMock,
  verifyPaymobWebhookHmac: paymobVerifyHmacMock,
}));

vi.mock("../../lib/currency", () => ({
  convertEgpToUsd: convertMock,
}));

// Keep paid-order side effects (emails, entitlements) out of these tests.
vi.mock("../../lib/email/orderPaidNotifications", () => ({
  sendOrderPaidNotifications: paidNotificationsMock,
}));

// Stub auth: trust an `x-test-user` header instead of a session. Absent → 401.
vi.mock("../../middlewares/authMiddleware", () => ({
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

// Import the router only AFTER the mocks are registered.
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

const seededBookIds: number[] = [];

async function seedBook(overrides: Partial<NewBook> = {}): Promise<number> {
  const [row] = await db
    .insert(books)
    .values({
      title: "Test Wallet Book",
      category: "management",
      status: "available",
      currency: "EGP",
      paperAvailable: false,
      digitalAvailable: true,
      digitalPrice: "100.00",
      digitalFileUrl: "internal://book-pdfs/test-object-id",
      ...overrides,
    })
    .returning();
  seededBookIds.push(row.id);
  return row.id;
}

async function seedWalletOrder(overrides: Partial<NewOrder> = {}): Promise<number> {
  const [row] = await db
    .insert(orders)
    .values({
      userId: OWNER,
      userEmail: "buyer@example.com",
      fullName: "Test Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "wallet",
      paymentStatus: "pending",
      paymobOrderId: `PMW-${Math.random().toString(36).slice(2)}`,
      walletPhone: "01012345678",
      totalAmount: "100.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

async function getOrder(id: number) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  return row;
}

async function cleanup() {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  if (seededBookIds.length) {
    await db.delete(books).where(inArray(books.id, seededBookIds));
    seededBookIds.length = 0;
  }
}

beforeAll(async () => {
  await cleanup();
});

beforeEach(() => {
  // Default happy-path stubs; individual tests may override.
  paymobConfiguredMock.mockReturnValue(true);
  paymobWalletConfiguredMock.mockReturnValue(true);
  walletCreateMock.mockResolvedValue({
    paymobOrderId: "PMW-ORDER-1",
    redirectUrl: "https://accept.paymob.com/wallet/redirect?token=wtok",
  });
  walletRegenMock.mockResolvedValue(
    "https://accept.paymob.com/wallet/redirect?token=wtok2",
  );
  convertMock.mockResolvedValue({ usd: "3.25", rate: 0.0325 });
});

afterEach(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
  redirectCreateMock.mockReset();
  captureMock.mockReset();
  convertMock.mockReset();
  configMock.mockReset();
  paymobConfiguredMock.mockReset();
  paymobWalletConfiguredMock.mockReset();
  paymobCreateMock.mockReset();
  paymobRegenUrlMock.mockReset();
  walletCreateMock.mockReset();
  walletRegenMock.mockReset();
  paymobStatusMock.mockReset();
  paymobVerifyHmacMock.mockReset();
  paidNotificationsMock.mockReset();
});

afterAll(async () => {
  await cleanup();
});

describe("POST /store/orders — wallet payment method (Paymob)", () => {
  it("creates a Paymob wallet payment in EGP and returns the redirect URL", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "wallet",
        walletPhone: "01012345678",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.paymentMethod).toBe("wallet");
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.redirectUrl).toContain("wallet/redirect");
    // The wallet flow must NOT return PayPal or card fields.
    expect(res.body.approveUrl).toBeUndefined();
    expect(res.body.checkoutUrl).toBeUndefined();

    // Charged in EGP directly — the authoritative server-side total.
    expect(walletCreateMock).toHaveBeenCalledTimes(1);
    expect(walletCreateMock.mock.calls[0][0]).toMatchObject({
      amountEgp: 100,
      walletPhone: "01012345678",
    });
    // NO USD conversion for wallet payments.
    expect(convertMock).not.toHaveBeenCalled();
    expect(redirectCreateMock).not.toHaveBeenCalled();
    expect(paymobCreateMock).not.toHaveBeenCalled();

    const order = await getOrder(res.body.id);
    expect(order.paymentMethod).toBe("wallet");
    expect(order.paymentStatus).toBe("pending");
    expect(order.paymobOrderId).toBe("PMW-ORDER-1");
    expect(order.walletPhone).toBe("01012345678");
    expect(order.paypalOrderId).toBeNull();
    expect(order.usdAmount).toBeNull();
  });

  it("normalizes a +2-prefixed wallet phone before charging", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "wallet",
        walletPhone: "+2 010 1234 5678",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(201);
    expect(walletCreateMock.mock.calls[0][0]).toMatchObject({
      walletPhone: "01012345678",
    });
    const order = await getOrder(res.body.id);
    expect(order.walletPhone).toBe("01012345678");
  });

  it("rejects an invalid wallet phone with 400 (and creates nothing)", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "wallet",
        walletPhone: "12345",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/wallet phone/i);
    expect(walletCreateMock).not.toHaveBeenCalled();
    const rows = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(rows).toHaveLength(0);
  });

  it("returns 503 (and creates nothing) when the wallet integration is not configured", async () => {
    paymobWalletConfiguredMock.mockReturnValue(false);
    const bookId = await seedBook({ digitalPrice: "100.00" });

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "wallet",
        walletPhone: "01012345678",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/PAYMOB_WALLET_INTEGRATION_ID/);
    expect(walletCreateMock).not.toHaveBeenCalled();
    const rows = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(rows).toHaveLength(0);
  });

  it("fails the order (502) when the Paymob wallet payment cannot be created", async () => {
    const bookId = await seedBook({ digitalPrice: "100.00" });
    walletCreateMock.mockRejectedValue(new Error("paymob down"));

    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Test Buyer",
        phone: "0100000000",
        paymentMethod: "wallet",
        walletPhone: "01012345678",
        items: [
          { productType: "book", productId: bookId, quantity: 1, format: "digital" },
        ],
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/wallet checkout/i);

    // The dangling order must be marked failed, never left pending.
    const [row] = await db.select().from(orders).where(eq(orders.userId, OWNER));
    expect(row.paymentStatus).toBe("failed");
  });
});

describe("GET /store/paymob-config — walletEnabled flag", () => {
  it("reports walletEnabled=true when the wallet integration is configured", async () => {
    const res = await request(app).get("/store/paymob-config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardEnabled: true, walletEnabled: true });
  });

  it("reports walletEnabled=false when the wallet integration id is missing", async () => {
    paymobWalletConfiguredMock.mockReturnValue(false);
    const res = await request(app).get("/store/paymob-config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cardEnabled: true, walletEnabled: false });
  });
});

describe("POST /store/orders/:id/paymob-wallet-checkout — restart wallet payment", () => {
  it("returns a fresh redirect URL for the owner's pending wallet order", async () => {
    const orderId = await seedWalletOrder();

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-wallet-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.redirectUrl).toContain("token=wtok2");
    expect(walletRegenMock).toHaveBeenCalledTimes(1);
    expect(walletRegenMock.mock.calls[0][0]).toMatchObject({
      walletPhone: "01012345678",
    });
  });

  it("404s for a stranger's order", async () => {
    const orderId = await seedWalletOrder();

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-wallet-checkout`)
      .set("x-test-user", STRANGER);

    expect(res.status).toBe(404);
    expect(walletRegenMock).not.toHaveBeenCalled();
  });

  it("rejects an already-paid order", async () => {
    const orderId = await seedWalletOrder({ paymentStatus: "paid" });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-wallet-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already paid/i);
  });

  it("rejects non-wallet orders", async () => {
    const orderId = await seedWalletOrder({
      paymentMethod: "card",
      walletPhone: null,
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-wallet-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    expect(walletRegenMock).not.toHaveBeenCalled();
  });

  it("reopens a declined (failed) wallet order as pending and returns a fresh URL", async () => {
    const orderId = await seedWalletOrder({
      paymentStatus: "failed",
      paymentFailureReason: "PAYMOB_DECLINED: Insufficient funds (code 51)",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-wallet-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.redirectUrl).toContain("token=wtok2");

    const [after] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(after.paymentStatus).toBe("pending");
    expect(after.paymentFailureReason).toBeNull();
  });

  it("rejects retry of a cancelled failed wallet order", async () => {
    const orderId = await seedWalletOrder({
      paymentStatus: "failed",
      status: "cancelled",
      paymentFailureReason: "cancelled_by_customer",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-wallet-checkout`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(400);
    expect(walletRegenMock).not.toHaveBeenCalled();
    const [after] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(after.paymentStatus).toBe("failed");
  });
});

describe("POST /store/orders/:id/paymob-confirm — wallet orders", () => {
  it("marks the wallet order paid when Paymob reports a successful transaction", async () => {
    const orderId = await seedWalletOrder();
    paymobStatusMock.mockResolvedValue({
      found: true,
      success: true,
      pending: false,
      transactionId: "TX-W1",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(res.body.status).toBe("confirmed");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
    expect(after.paymobTransactionId).toBe("TX-W1");
    expect(after.paidAt).not.toBeNull();
    expect(paidNotificationsMock).toHaveBeenCalledTimes(1);
  });

  it("leaves the wallet order pending when no successful transaction exists", async () => {
    const orderId = await seedWalletOrder();
    paymobStatusMock.mockResolvedValue({
      found: false,
      success: false,
      pending: false,
      transactionId: null,
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/paymob-confirm`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("pending");

    const after = await getOrder(orderId);
    expect(after.paymentStatus).toBe("pending");
    expect(paidNotificationsMock).not.toHaveBeenCalled();
  });
});
