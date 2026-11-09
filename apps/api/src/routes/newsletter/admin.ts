import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, newsletterSubscribers } from "@workspace/db";
import { requireAdmin } from "../../middlewares/adminAuth";
import { getItemById } from "../../lib/cms/repo";
import { canNotifyType } from "../../lib/newsletter/config";
import { notifyIfRequested } from "../../lib/newsletter/notify";
import { countConfirmed } from "../../lib/newsletter/subscribers";

const router = Router();

router.get("/admin/newsletter/subscribers", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: newsletterSubscribers.id,
      email: newsletterSubscribers.email,
      status: newsletterSubscribers.status,
      locale: newsletterSubscribers.locale,
      createdAt: newsletterSubscribers.createdAt,
      confirmedAt: newsletterSubscribers.confirmedAt,
    })
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.id));
  res.json({ items: rows, confirmed: rows.filter((r) => r.status === "confirmed").length });
});

const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : String(v ?? "");
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

router.get("/admin/newsletter/subscribers.csv", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.id));
  const lines = [["email", "status", "locale", "created_at", "confirmed_at"].join(",")];
  for (const r of rows) lines.push([r.email, r.status, r.locale, r.createdAt, r.confirmedAt].map(csvCell).join(","));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="newsletter-subscribers.csv"');
  res.send("﻿" + lines.join("\n"));
});

router.get("/admin/newsletter/count", requireAdmin, async (_req, res) => {
  res.json({ confirmed: await countConfirmed() });
});

/** Manually email subscribers about an already-published item (once). */
router.post("/admin/cms/items/:id/notify", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const item = await getItemById(id);
  if (!item) return res.status(404).json({ error: "Not found" });
  if (!canNotifyType(item.type)) return res.status(400).json({ error: "This content type does not notify subscribers" });
  if (item.status !== "published") return res.status(400).json({ error: "Publish the item before notifying subscribers" });
  if (item.notifiedAt) return res.status(409).json({ error: "Subscribers were already notified" });
  const started = await notifyIfRequested(item, true);
  return started ? res.status(202).json({ ok: true }) : res.status(409).json({ error: "Subscribers were already notified" });
});

export default router;
