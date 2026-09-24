import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";

const { sessionMock } = vi.hoisted(() => ({ sessionMock: vi.fn() }));
vi.mock("../middlewares/authMiddleware", () => ({
  getSessionUser: sessionMock,
  isAdminRole: (role: string | undefined) => role === "admin" || role === "super_admin",
}));

vi.mock("./auth", () => ({
  auth: { options: { trustedOrigins: ["https://darnozom.test"] } },
}));

import {
  ADMIN_SOCKET_PATH,
  ORDER_NEW_EVENT,
  ORDER_UPDATED_EVENT,
  attachAdminSocket,
  emitOrderNew,
  emitOrderUpdated,
} from "./admin-socket";
import { signAdminSocketToken } from "./admin-socket-token";

const SECRET = "socket-test-secret";
let url = "";
let server: http.Server;
const open: Socket[] = [];

beforeAll(async () => {
  process.env.BETTER_AUTH_BRIDGE_SECRET = SECRET;
  server = http.createServer();
  attachAdminSocket(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  open.forEach((s) => s.disconnect());
  await new Promise((r) => server.close(r));
});

/** Resolves "connected" or the connect_error message. */
function tryConnect(opts: {
  token?: string;
  cookie?: string;
  origin?: string;
}): Promise<{ socket: Socket; result: string }> {
  const socket = connect(url, {
    path: ADMIN_SOCKET_PATH,
    transports: ["websocket"],
    reconnection: false,
    auth: opts.token ? { token: opts.token } : {},
    extraHeaders: {
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
      ...(opts.origin ? { origin: opts.origin } : {}),
    },
  });
  open.push(socket);
  return new Promise((resolve) => {
    socket.on("connect", () => resolve({ socket, result: "connected" }));
    socket.on("connect_error", (e) => resolve({ socket, result: e.message }));
  });
}

describe("admin order notifications socket", () => {
  it("rejects a visitor with no session and no token", async () => {
    sessionMock.mockResolvedValue(null);
    expect((await tryConnect({})).result).toBe("unauthorized");
  });

  it("rejects a signed-in customer who is not an admin", async () => {
    sessionMock.mockResolvedValue({ id: "u1", role: "client" });
    expect(
      (await tryConnect({ cookie: "session=x", origin: "https://darnozom.test" })).result,
    ).toBe("unauthorized");
  });

  // Browsers attach cookies to WebSocket handshakes from any page, so a
  // session cookie only counts when the page is one of ours.
  it("ignores an admin session cookie sent from an untrusted page", async () => {
    sessionMock.mockResolvedValue({ id: "a1", role: "admin" });
    expect(
      (await tryConnect({ cookie: "session=admin", origin: "https://evil.example" })).result,
    ).toBe("unauthorized");
    expect((await tryConnect({ cookie: "session=admin" })).result).toBe("unauthorized");
  });

  it("accepts a Medusa token from Medusa Admin's own origin", async () => {
    sessionMock.mockResolvedValue(null);
    const token = signAdminSocketToken(SECRET, Date.now(), 60_000);
    expect((await tryConnect({ token, origin: "https://ecommerce.darnozom.test" })).result).toBe(
      "connected",
    );
  });

  it("rejects an expired or forged Medusa token", async () => {
    sessionMock.mockResolvedValue(null);
    const expired = signAdminSocketToken(SECRET, Date.now() - 10_000, 1_000);
    expect((await tryConnect({ token: expired })).result).toBe("unauthorized");
    const forged = signAdminSocketToken("wrong", Date.now(), 60_000);
    expect((await tryConnect({ token: forged })).result).toBe("unauthorized");
  });

  it("delivers order events to a storefront admin and a Medusa admin", async () => {
    sessionMock.mockResolvedValue({ id: "a1", role: "admin" });
    const storefront = await tryConnect({ cookie: "session=admin", origin: "https://darnozom.test" });
    sessionMock.mockResolvedValue(null);
    const medusa = await tryConnect({ token: signAdminSocketToken(SECRET, Date.now(), 60_000) });
    expect(storefront.result).toBe("connected");
    expect(medusa.result).toBe("connected");

    const got = (c: { socket: Socket }, event: string) =>
      new Promise((r) => c.socket.once(event, r));
    const newAtStorefront = got(storefront, ORDER_NEW_EVENT);
    const newAtMedusa = got(medusa, ORDER_NEW_EVENT);
    emitOrderNew({ id: 7, source: "express", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(await newAtStorefront).toMatchObject({ id: 7 });
    expect(await newAtMedusa).toMatchObject({ id: 7 });

    const updatedAtMedusa = got(medusa, ORDER_UPDATED_EVENT);
    emitOrderUpdated({ id: 7, medusaOrderId: "order_1", status: "confirmed", paymentStatus: "paid" });
    expect(await updatedAtMedusa).toMatchObject({ id: 7, paymentStatus: "paid" });
  });
});
