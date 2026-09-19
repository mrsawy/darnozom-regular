import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { medusaBridgeRouter } from "./index";

vi.mock("../../middlewares/authMiddleware", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user_1";
    req.userEmail = "buyer@example.com";
    next();
  },
}));

describe("POST /api/store/medusa-token", () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "test-bridge-secret";
    process.env.MEDUSA_ADMIN_API_KEY = "test-medusa-admin-key";
    process.env.MEDUSA_BACKEND_URL = "http://localhost:9000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/admin/customers?")) {
          return Promise.resolve({ ok: true, json: async () => ({ customers: [] }) });
        }
        if (url.endsWith("/admin/customers")) {
          return Promise.resolve({ ok: true, json: async () => ({ customer: { id: "cus_new_1" } }) });
        }
        if (url.includes("/auth/customer/better-auth-bridge")) {
          return Promise.resolve({ ok: true, json: async () => ({ token: "medusa-jwt-abc" }) });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  it("creates a Medusa customer when none exists and returns a token", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/store", medusaBridgeRouter);

    const res = await request(app).post("/api/store/medusa-token").send();

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("medusa-jwt-abc");
  });
});
