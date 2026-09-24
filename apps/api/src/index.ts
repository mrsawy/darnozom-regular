import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachAdminSocket } from "./lib/admin-socket";
import { seedStoreApps } from "./lib/seed/seedStoreApps";
import { seedJobOpenings } from "./lib/seed/seedJobOpenings";
import { seedAdminUsers } from "./lib/seed/seedAdminUsers";
import { startPayPalReconciliationJob } from "./lib/payments/reconcilePayPalOrders";
import { startPaymobReconciliationJob } from "./lib/payments/reconcilePaymobOrders";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
attachAdminSocket(server);

server.listen(port, () => {
  logger.info({ port }, "Server listening");
  void seedStoreApps();
  void seedJobOpenings();
  void seedAdminUsers();
  // Server-side safety net: periodically flip any PayPal order that was paid on
  // PayPal's side but left stuck "pending" (e.g. buyer closed the tab before
  // the return capture ran) to paid + confirmed. Idempotent, never re-charges.
  startPayPalReconciliationJob();
  // Same safety net for Paymob card payments: flip any card order whose
  // Paymob transaction succeeded but whose webhook/confirm never landed.
  startPaymobReconciliationJob();
});
