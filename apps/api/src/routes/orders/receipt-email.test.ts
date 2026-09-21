import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Readable } from "stream";
import { db, orders, orderItems, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Regression coverage for the "receipt email actually goes out after every
// payment" guarantee. These tests exercise the PayPal capture handler against
// the REAL database (rows seeded + cleaned up) while stubbing the external
// boundaries: PayPal (network), object storage, and the Resend HTTP endpoint
// (global fetch). The email module itself runs for real so we can assert on
// the exact HTML that would be sent to Resend.
// ---------------------------------------------------------------------------

const TEST_USER_PREFIX = "test-receipt-";
const OWNER = `${TEST_USER_PREFIX}owner`;

// Resend is only invoked when a key is present; ensure it is truthy so the
// real sendEmail() proceeds to POST to (our mocked) fetch. Must be set BEFORE
// the email module is first imported (top-level, before the router import).
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "test-resend-key";

// Per-test-controllable PayPal capture result.
const { captureMock } = vi.hoisted(() => ({ captureMock: vi.fn() }));

vi.mock("@workspace/payment-gateways", () => ({
  capturePayPalOrder: captureMock,
  createPayPalOrder: vi.fn(),
}));

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

vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (_req: express.Request, res: express.Response) =>
    res.status(403).json({ error: "Forbidden" }),
}));

vi.mock("@workspace/object-store", () => {
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

// Keep the real email module (so orderReceiptHtml runs and produces real
// reader links) but wrap sendOrderReceipt in a spy for direct call-count and
// argument assertions.
vi.mock("../../lib/email/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/email/email")>();
  return {
    ...actual,
    sendOrderReceipt: vi.fn(actual.sendOrderReceipt),
  };
});

// Import mocked pieces + the router AFTER the mocks are registered.
const { sendOrderReceipt } = await import("../../lib/email/email");
const { default: ordersRouter } = await import("./index");

// ---------------------------------------------------------------------------
// Capture every Resend HTTP POST so we can inspect the exact email HTML/subject
// and simulate Resend outages.
// ---------------------------------------------------------------------------
interface SentEmail {
  to: unknown;
  subject: string;
  html: string;
}
let sentEmails: SentEmail[] = [];
let resendShouldFail = false;

const fetchMock = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
  const url = String(input);
  if (url.includes("api.resend.com")) {
    const parsed = JSON.parse(String(init?.body ?? "{}"));
    sentEmails.push({ to: parsed.to, subject: parsed.subject, html: parsed.html });
    if (resendShouldFail) {
      return new Response("Resend is down", { status: 500 });
    }
    return new Response(JSON.stringify({ id: "email_test" }), { status: 200 });
  }
  throw new Error(`Unexpected fetch in test: ${url}`);
});
vi.stubGlobal("fetch", fetchMock);

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
      fullName: "Test Buyer",
      phone: "0100000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "paypal",
      paymentStatus: "pending",
      paypalOrderId: `PP-${Math.random().toString(36).slice(2)}`,
      totalAmount: "100.00",
      shippingTotal: "0.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

async function seedItem(
  orderId: number,
  format: "paper" | "digital",
): Promise<number> {
  const [row] = await db
    .insert(orderItems)
    .values({
      orderId,
      productType: "book",
      productId: format === "digital" ? "991001" : "991002",
      productTitle: format === "digital" ? "Digital Book" : "Paper Book",
      quantity: 1,
      unitPrice: "100.00",
      currency: "EGP",
      format,
      digitalFileUrlSnapshot:
        format === "digital" ? "internal://book-pdfs/test-object-id" : null,
    })
    .returning();
  return row.id;
}

function receiptEmails(): SentEmail[] {
  return sentEmails.filter((e) => e.subject.includes("إيصال طلبك"));
}

beforeAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

afterEach(async () => {
  captureMock.mockReset();
  (sendOrderReceipt as ReturnType<typeof vi.fn>).mockClear();
  fetchMock.mockClear();
  sentEmails = [];
  resendShouldFail = false;
  // Reconciler sweeps all pending PayPal orders; drop fixtures each test so
  // leftovers can't skew later passes.
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${TEST_USER_PREFIX}%`));
});

describe("receipt email on PayPal capture", () => {
  it("sends the receipt exactly once on the first successful capture", async () => {
    const orderId = await seedOrder();
    await seedItem(orderId, "digital");
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-1",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(sendOrderReceipt).toHaveBeenCalledTimes(1);
    expect(receiptEmails()).toHaveLength(1);
    expect(receiptEmails()[0].to).toEqual(["buyer@example.com"]);
  });

  it("does not resend the receipt on an already-paid re-capture", async () => {
    const orderId = await seedOrder();
    await seedItem(orderId, "digital");
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-2",
      status: "COMPLETED",
    });

    const first = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);
    expect(first.status).toBe(200);
    expect(sendOrderReceipt).toHaveBeenCalledTimes(1);

    // The order is now paid; a duplicate capture short-circuits before PayPal
    // and before the receipt email.
    const second = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);
    expect(second.status).toBe(200);
    expect(second.body.paymentStatus).toBe("paid");
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(sendOrderReceipt).toHaveBeenCalledTimes(1);
    expect(receiptEmails()).toHaveLength(1);
  });

  it("includes a reader/download link for digital items but not paper items", async () => {
    const orderId = await seedOrder({ shippingTotal: "0.00" });
    const digitalItemId = await seedItem(orderId, "digital");
    const paperItemId = await seedItem(orderId, "paper");
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-3",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);
    expect(res.status).toBe(200);

    // The handler must flag the digital line as digital and the paper line as
    // not, so the email template renders the correct buttons.
    const call = (sendOrderReceipt as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const digitalArg = call.items.find(
      (i: { id: number }) => i.id === digitalItemId,
    );
    const paperArg = call.items.find(
      (i: { id: number }) => i.id === paperItemId,
    );
    expect(digitalArg.isDigital).toBe(true);
    expect(paperArg.isDigital).toBe(false);

    // And the actual rendered HTML sent to Resend must carry a reader link for
    // the digital item only.
    const html = receiptEmails()[0].html;
    expect(html).toContain(`/items/${digitalItemId}/read`);
    expect(html).not.toContain(`/items/${paperItemId}/read`);
    expect(html).toContain("قراءة / تحميل النسخة الرقمية");
  });

  it("still returns a successful capture when Resend fails", async () => {
    const orderId = await seedOrder();
    await seedItem(orderId, "digital");
    resendShouldFail = true;
    captureMock.mockResolvedValue({
      captured: true,
      captureId: "CAP-4",
      status: "COMPLETED",
    });

    const res = await request(app)
      .post(`/store/orders/${orderId}/capture`)
      .set("x-test-user", OWNER);

    // Email delivery failed, but the payment was captured — the order must be
    // reported paid and the request must not error.
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(sendOrderReceipt).toHaveBeenCalledTimes(1);

    const [after] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(after.paymentStatus).toBe("paid");
    expect(after.status).toBe("confirmed");
  });
});
