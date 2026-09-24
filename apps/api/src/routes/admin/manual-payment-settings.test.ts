import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("../../lib/medusa-admin", () => ({
  medusaAdmin: medusaAdminMock,
  medusaAdminAuthHeader: () => "Basic test",
}));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));

const { default: router } = await import("./manual-payment-settings");
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as any).log = { error() {} };
  next();
});
app.use(router);

afterEach(() => {
  medusaAdminMock.mockReset();
  vi.unstubAllGlobals();
});

describe("manual payment settings proxy", () => {
  it("requires admin", async () => {
    expect((await request(app).get("/admin/manual-payments")).status).toBe(403);
  });

  it("GET proxies to Medusa", async () => {
    medusaAdminMock.mockResolvedValue({ methods: [{ code: "instapay" }] });
    const res = await request(app).get("/admin/manual-payments").set("x-test-admin", "1");
    expect(res.body).toEqual({ methods: [{ code: "instapay" }] });
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/manual-payment-methods");
  });

  it("PUT proxies the patch for a known code", async () => {
    medusaAdminMock.mockResolvedValue({ method: { code: "vodafone_cash" } });
    const res = await request(app)
      .put("/admin/manual-payments/vodafone_cash")
      .set("x-test-admin", "1")
      .send({ account_number: "01012345678" });
    expect(res.status).toBe(200);
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/manual-payment-methods/vodafone_cash", {
      method: "POST",
      body: JSON.stringify({ account_number: "01012345678" }),
    });
  });

  it("PUT rejects unknown codes without calling Medusa", async () => {
    const res = await request(app)
      .put("/admin/manual-payments/cod")
      .set("x-test-admin", "1")
      .send({});
    expect(res.status).toBe(400);
    expect(medusaAdminMock).not.toHaveBeenCalled();
  });

  it("PUT surfaces Medusa validation errors as 400", async () => {
    medusaAdminMock.mockRejectedValue(
      new Error(
        'Medusa admin POST /admin/manual-payment-methods/instapay failed (400): {"error":"qr_image_url must be an http(s) URL or /static/ path"}',
      ),
    );
    const res = await request(app)
      .put("/admin/manual-payments/instapay")
      .set("x-test-admin", "1")
      .send({ qr_image_url: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/qr_image_url/);
  });

  it("QR upload forwards the file to Medusa /admin/uploads", async () => {
    process.env.MEDUSA_BACKEND_URL = "http://medusa.test";
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ files: [{ id: "f1", url: "http://medusa.test/static/qr.png" }] }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await request(app)
      .post("/admin/manual-payments/qr")
      .set("x-test-admin", "1")
      .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
        filename: "qr.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: "http://medusa.test/static/qr.png" });
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toBe("http://medusa.test/admin/uploads");
    expect(init.headers.Authorization).toBe("Basic test");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("QR upload rejects non-images", async () => {
    const res = await request(app)
      .post("/admin/manual-payments/qr")
      .set("x-test-admin", "1")
      .attach("image", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });
});
