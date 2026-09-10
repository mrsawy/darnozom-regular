import { Router } from "express";
import { db, shippingRates } from "@workspace/db";
import { eq, asc, sql, and, ne } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/adminAuth";

const router = Router();

function normalizeCity(city: unknown): string {
  return String(city ?? "").trim();
}

function parsePrice(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const n = Number.parseFloat(s.replace(/[^\d.\-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

// Listing the full rate table is admin-only operational data. Public
// callers should use the /shipping-rates/lookup endpoint, which only
// reveals the price relevant to their own city.
router.get("/shipping-rates", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(shippingRates).orderBy(asc(shippingRates.city));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list shipping rates" });
  }
});

router.get("/shipping-rates/lookup", async (req, res) => {
  try {
    const cityRaw = normalizeCity(req.query.city);
    if (!cityRaw) {
      return res.status(400).json({ error: "city query parameter is required" });
    }
    // Case-insensitive lookup by normalized city name.
    const [exact] = await db
      .select()
      .from(shippingRates)
      .where(sql`lower(${shippingRates.city}) = lower(${cityRaw})`)
      .limit(1);
    if (exact) {
      return res.json({ matched: true, rate: exact });
    }
    const [defaultRate] = await db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.isDefault, true))
      .limit(1);
    if (defaultRate) {
      return res.json({ matched: false, rate: defaultRate });
    }
    return res.json({ matched: false, rate: null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to lookup shipping rate" });
  }
});

router.post("/shipping-rates", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const city = normalizeCity(body.city);
    if (!city) return res.status(400).json({ error: "City is required" });
    const price = parsePrice(body.price);
    if (price === null) return res.status(400).json({ error: "A valid price is required" });
    const currency = body.currency ? String(body.currency) : "SAR";
    const requestedDefault = Boolean(body.isDefault);

    // Run insert + default demotion atomically. If the insert fails (e.g.
    // duplicate city) the demotion is rolled back, so we never end up with
    // zero default rows.
    try {
      const row = await db.transaction(async (tx) => {
        const existing = await tx.select({ id: shippingRates.id }).from(shippingRates).limit(1);
        const isDefault = existing.length === 0 ? true : requestedDefault;
        const [inserted] = await tx
          .insert(shippingRates)
          .values({ city, price, currency, isDefault })
          .returning();
        if (isDefault) {
          // Demote previous defaults only after the new row is safely in.
          await tx
            .update(shippingRates)
            .set({ isDefault: false })
            .where(and(eq(shippingRates.isDefault, true), ne(shippingRates.id, inserted.id)));
        }
        return inserted;
      });
      return res.status(201).json(row);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return res.status(409).json({ error: "A shipping rate for this city already exists" });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create shipping rate" });
  }
});

router.put("/shipping-rates/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.city !== undefined) {
      const city = normalizeCity(body.city);
      if (!city) return res.status(400).json({ error: "City is required" });
      updates.city = city;
    }
    if (body.price !== undefined) {
      const price = parsePrice(body.price);
      if (price === null) return res.status(400).json({ error: "A valid price is required" });
      updates.price = price;
    }
    if (body.currency !== undefined) updates.currency = String(body.currency || "SAR");

    const requestedDefault =
      body.isDefault === undefined ? null : Boolean(body.isDefault);

    // Wrap the existence check, default-demotion, and update in one
    // transaction so a missing row or update failure rolls back any
    // demotion of other defaults — guaranteeing at least one default
    // always remains.
    try {
      const result = await db.transaction(async (tx) => {
        const [current] = await tx
          .select({ id: shippingRates.id, isDefault: shippingRates.isDefault })
          .from(shippingRates)
          .where(eq(shippingRates.id, id));
        if (!current) return { error: "Shipping rate not found", status: 404 } as const;

        if (requestedDefault === false && current.isDefault) {
          return {
            error:
              "Cannot clear the default flag: at least one shipping rate must be marked as default. Mark another rate as default first.",
            status: 400,
          } as const;
        }
        if (requestedDefault !== null) updates.isDefault = requestedDefault;

        const [row] = await tx
          .update(shippingRates)
          .set(updates)
          .where(eq(shippingRates.id, id))
          .returning();
        if (!row) return { error: "Shipping rate not found", status: 404 } as const;

        if (requestedDefault === true) {
          await tx
            .update(shippingRates)
            .set({ isDefault: false })
            .where(and(eq(shippingRates.isDefault, true), ne(shippingRates.id, id)));
        }
        return { row } as const;
      });
      if ("error" in result) return res.status(result.status ?? 400).json({ error: result.error });
      return res.json(result.row);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        return res.status(409).json({ error: "A shipping rate for this city already exists" });
      }
      throw e;
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update shipping rate" });
  }
});

router.delete("/shipping-rates/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id));
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    // Invariant: at least one shipping rate must always exist so the lookup
    // endpoint can fall back to a default for unlisted cities. Refuse to
    // delete the last remaining row.
    const [{ count: total }] = (await db
      .select({ count: sql<number>`count(*)::int` })
      .from(shippingRates)) as { count: number }[];
    if (total <= 1) {
      return res.status(400).json({
        error: "Cannot delete the last shipping rate. Add another rate first so a fallback exists for non-listed cities.",
      });
    }

    const [row] = await db.delete(shippingRates).where(eq(shippingRates.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Shipping rate not found" });
    // Invariant: if we just deleted the default, promote the alphabetically
    // first remaining row to default.
    if (row.isDefault) {
      const [next] = await db
        .select({ id: shippingRates.id })
        .from(shippingRates)
        .orderBy(asc(shippingRates.city))
        .limit(1);
      if (next) {
        await db
          .update(shippingRates)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(shippingRates.id, next.id));
      }
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete shipping rate" });
  }
});

export default router;
