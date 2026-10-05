import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn(async () => undefined) }));
vi.mock("@workspace/object-store", () => ({ savePrivateObject: saveMock }));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) => (req.header("x-test-admin") === "1" ? next() : res.status(403).end()),
  checkAdminStatus: vi.fn(),
  getBootstrapAdminEmails: () => [],
}));

const { default: router } = await import("./index");
const app = express();
app.use(router);

describe("POST /admin/upload-file", () => {
  it("requires admin", async () => {
    expect((await request(app).post("/admin/upload-file")).status).toBe(403);
  });

  it("stores a PDF and returns its URL", async () => {
    const r = await request(app)
      .post("/admin/upload-file?folder=cms")
      .set("x-test-admin", "1")
      .attach("file", Buffer.from("%PDF-1.7 test"), { filename: "s.pdf", contentType: "application/pdf" });
    expect(r.status).toBe(200);
    expect(r.body.url).toMatch(/^\/api\/storage\/objects\/cms\/[0-9a-f-]{36}$/);
    expect(saveMock).toHaveBeenCalledWith(expect.stringMatching(/^cms\//), expect.any(Buffer), "application/pdf", expect.any(Object));
  });

  it("rejects non-PDF files", async () => {
    const r = await request(app)
      .post("/admin/upload-file")
      .set("x-test-admin", "1")
      .attach("file", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    expect(r.status).toBe(400);
  });
});
