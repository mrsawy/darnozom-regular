import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { isClerkConfigured } from "./lib/clerkConfig";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
// Larger limit allows saving book covers imported as inline base64 data URIs
// (some sites embed the cover directly in HTML at ~500 KB).
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Mounting Clerk unconditionally makes every request throw when the keys are
// absent, including /api/healthz. Auth-protected routes fall back to 401 via
// safeGetAuth; everything public keeps working.
if (isClerkConfigured) {
  app.use(clerkMiddleware());
} else {
  logger.warn(
    "CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY not set — auth is disabled and " +
      "protected routes will answer 401.",
  );
}

app.use("/api", router);

export default app;
