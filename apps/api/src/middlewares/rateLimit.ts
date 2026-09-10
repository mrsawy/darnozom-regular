import type { Request, Response, NextFunction, RequestHandler } from "express";

type Hit = { count: number; resetAt: number };

/**
 * Lightweight in-memory, per-client rate limiter. No external dependencies and
 * no shared state — suitable for protecting low-traffic public endpoints (e.g.
 * the academy registration form) against rapid repeated/bot submissions.
 *
 * The client key is derived from the X-Forwarded-For header (first hop) when
 * present, falling back to the socket address. This works behind the Replit
 * shared proxy without enabling app-wide `trust proxy`.
 */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}): RequestHandler {
  const hits = new Map<string, Hit>();
  const {
    windowMs,
    max,
    message = "Too many requests. Please try again later.",
    keyPrefix = "",
  } = opts;

  function clientIp(req: Request): string {
    const fwd = req.headers["x-forwarded-for"];
    if (typeof fwd === "string" && fwd.length > 0) {
      return fwd.split(",")[0]!.trim();
    }
    if (Array.isArray(fwd) && fwd.length > 0) {
      return fwd[0]!.trim();
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyPrefix + clientIp(req);
    const hit = hits.get(key);

    if (!hit || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Opportunistic cleanup so the map doesn't grow unbounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) {
          if (v.resetAt <= now) hits.delete(k);
        }
      }
      return next();
    }

    if (hit.count >= max) {
      const retryAfter = Math.ceil((hit.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
    }

    hit.count += 1;
    return next();
  };
}
