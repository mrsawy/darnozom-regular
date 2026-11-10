import { Router } from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, pageViews } from "@workspace/db";
import { requireAdmin } from "../../middlewares/adminAuth";
import { snapshot } from "../../lib/visitors/live";

const router = Router();

router.get("/admin/visitors/live", requireAdmin, (_req, res) => {
  res.json(snapshot());
});

router.get("/admin/visitors/stats", requireAdmin, async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 365);
  const since = new Date(Date.now() - days * 86_400_000);
  const where = and(gte(pageViews.createdAt, since), eq(pageViews.isBot, false));

  const top = (col: typeof pageViews.path | typeof pageViews.referrerHost | typeof pageViews.country | typeof pageViews.device | typeof pageViews.browser | typeof pageViews.os, limit = 10) =>
    db
      .select({ label: col, views: sql<number>`count(*)::int`, visitors: sql<number>`count(distinct ${pageViews.visitorId})::int` })
      .from(pageViews)
      .where(where)
      .groupBy(col)
      .orderBy(sql`count(*) desc`)
      .limit(limit);

  const [totals, series, pages, referrers, countries, devices, browsers, systems] = await Promise.all([
    db
      .select({
        views: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${pageViews.visitorId})::int`,
        sessions: sql<number>`count(distinct ${pageViews.sessionId})::int`,
      })
      .from(pageViews)
      .where(where),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${pageViews.createdAt}), 'YYYY-MM-DD')`,
        views: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${pageViews.visitorId})::int`,
      })
      .from(pageViews)
      .where(where)
      .groupBy(sql`date_trunc('day', ${pageViews.createdAt})`)
      .orderBy(sql`date_trunc('day', ${pageViews.createdAt})`),
    top(pageViews.path),
    top(pageViews.referrerHost),
    top(pageViews.country),
    top(pageViews.device),
    top(pageViews.browser),
    top(pageViews.os),
  ]);

  res.json({ days, totals: totals[0], series, pages, referrers, countries, devices, browsers, systems });
});

/** GoAccess HTML report generated from the nginx access log (see deploy/goaccess-report.sh). */
router.get("/admin/visitors/server-report", requireAdmin, (_req, res) => {
  const file = resolve(process.env.GOACCESS_REPORT_PATH?.trim() || "/var/lib/darnozom/goaccess/report.html");
  if (!existsSync(file)) {
    return res.status(404).type("text/plain").send("Server-log report not generated yet. See deploy/goaccess-report.sh.");
  }
  // The report is self-contained and is only ever produced by our own cron job.
  res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'none'");
  return res.sendFile(file);
});

/** Which external analytics are configured (client reads VITE_* itself; this is for the server report). */
router.get("/admin/visitors/config", requireAdmin, (_req, res) => {
  res.json({ serverReport: existsSync(resolve(process.env.GOACCESS_REPORT_PATH?.trim() || "/var/lib/darnozom/goaccess/report.html")) });
});

export default router;
