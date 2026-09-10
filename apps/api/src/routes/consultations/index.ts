import { Router, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { consultationSlots, consultationBookings } from "@workspace/db";
import { and, asc, desc, eq, gte, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import { requireAdmin, type AdminAuthRequest } from "../../middlewares/adminAuth";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  isGoogleCalendarConfigured,
} from "../../lib/googleCalendar";
import { sendBookingConfirmation } from "../../lib/consultationEmail";

const router = Router();

const ADMIN_NOTIFY_EMAILS = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function parseInt10(v: unknown, def = 0): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : def;
}

// ───────────────────────────── PUBLIC ──────────────────────────────

router.get("/consultation-slots/available", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(consultationSlots)
      .where(and(eq(consultationSlots.status, "available"), gte(consultationSlots.startsAt, now)))
      .orderBy(asc(consultationSlots.startsAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load slots" });
  }
});

router.post("/consultation-bookings", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const slotId = parseInt10(body.slotId);
    const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
    const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : "";
    const clientPhone = typeof body.clientPhone === "string" ? body.clientPhone.trim() : null;
    const consultationType = typeof body.consultationType === "string" ? body.consultationType.trim() : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const userId = typeof body.userId === "string" ? body.userId : null;

    if (!slotId) return res.status(400).json({ error: "slotId مطلوب" });
    if (!clientName) return res.status(400).json({ error: "الاسم مطلوب" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))
      return res.status(400).json({ error: "بريد إلكتروني غير صالح" });

    const { booking, slot } = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(consultationSlots)
        .set({ status: "booked", updatedAt: new Date() })
        .where(and(eq(consultationSlots.id, slotId), eq(consultationSlots.status, "available")))
        .returning();
      if (!updated) {
        throw Object.assign(new Error("الموعد لم يعد متاحاً"), { http: 409 });
      }
      const [b] = await tx
        .insert(consultationBookings)
        .values({
          slotId: updated.id,
          clientName,
          clientEmail,
          clientPhone,
          consultationType: consultationType ?? updated.consultationType ?? null,
          notes,
          userId,
          status: "confirmed",
        })
        .returning();
      return { booking: b, slot: updated };
    });

    // Best-effort Google Calendar sync.
    let calendarSyncError: string | null = null;
    let googleEventId: string | null = null;
    let googleEventHtmlLink: string | null = null;
    let googleMeetLink: string | null = null;

    if (isGoogleCalendarConfigured()) {
      try {
        const endsAt = new Date(slot.startsAt.getTime() + slot.durationMinutes * 60_000);
        const adminAttendees = ADMIN_NOTIFY_EMAILS().map((email) => ({ email }));
        const ev = await createCalendarEvent({
          summary: `استشارة: ${clientName}${consultationType ? ` — ${consultationType}` : ""}`,
          description: [
            `العميل: ${clientName}`,
            `البريد: ${clientEmail}`,
            clientPhone ? `الهاتف: ${clientPhone}` : null,
            consultationType ? `نوع الاستشارة: ${consultationType}` : null,
            notes ? `ملاحظات العميل:\n${notes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          startsAt: slot.startsAt,
          endsAt,
          attendees: [{ email: clientEmail, displayName: clientName }, ...adminAttendees],
          conferenceRequestId: `dn-booking-${booking.id}-${randomUUID().slice(0, 8)}`,
        });
        googleEventId = ev.eventId;
        googleEventHtmlLink = ev.htmlLink ?? null;
        googleMeetLink = ev.meetLink ?? null;
      } catch (err) {
        calendarSyncError = err instanceof Error ? err.message : String(err);
        req.log.error({ err, bookingId: booking.id }, "google calendar sync failed");
      }
    } else {
      calendarSyncError = "Google Calendar غير مُهيأ — لم يتم إنشاء حدث Meet";
    }

    const [finalBooking] = await db
      .update(consultationBookings)
      .set({
        googleEventId,
        googleEventHtmlLink,
        googleMeetLink,
        calendarSyncError,
        updatedAt: new Date(),
      })
      .where(eq(consultationBookings.id, booking.id))
      .returning();

    // Best-effort confirmation email.
    try {
      await sendBookingConfirmation({
        to: clientEmail,
        clientName,
        startsAt: slot.startsAt,
        durationMinutes: slot.durationMinutes,
        consultationType: finalBooking.consultationType,
        notes: finalBooking.notes,
        meetLink: finalBooking.googleMeetLink,
        calendarLink: finalBooking.googleEventHtmlLink,
      });
    } catch (err) {
      req.log.warn({ err, bookingId: booking.id }, "booking confirmation email failed");
    }

    return res.status(201).json({ booking: finalBooking, slot });
  } catch (err) {
    const e = err as Error & { http?: number };
    if (e.http === 409) {
      return res.status(409).json({ error: e.message });
    }
    req.log.error({ err }, "create booking failed");
    return res.status(500).json({ error: "فشل إنشاء الحجز" });
  }
});

// ───────────────────── ACCOUNT (signed-in client) ──────────────────

async function getCurrentUserEmails(req: AuthRequest): Promise<string[]> {
  const userId = req.clerkUserId;
  if (!userId) return [];
  try {
    const user = await clerkClient.users.getUser(userId);
    return (user.emailAddresses ?? [])
      .map((e) => (e.emailAddress || "").trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

router.get("/account/me/bookings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const emails = await getCurrentUserEmails(req);
    const userId = req.clerkUserId;
    const orConditions = [] as ReturnType<typeof eq>[];
    if (userId) orConditions.push(eq(consultationBookings.userId, userId));
    if (emails.length) {
      for (const e of emails) {
        orConditions.push(sql`lower(${consultationBookings.clientEmail}) = ${e}` as any);
      }
    }
    if (orConditions.length === 0) return res.json({ bookings: [] });

    const rows = await db
      .select({
        id: consultationBookings.id,
        slotId: consultationBookings.slotId,
        clientName: consultationBookings.clientName,
        clientEmail: consultationBookings.clientEmail,
        consultationType: consultationBookings.consultationType,
        notes: consultationBookings.notes,
        status: consultationBookings.status,
        googleMeetLink: consultationBookings.googleMeetLink,
        googleEventHtmlLink: consultationBookings.googleEventHtmlLink,
        calendarSyncError: consultationBookings.calendarSyncError,
        createdAt: consultationBookings.createdAt,
        startsAt: consultationSlots.startsAt,
        durationMinutes: consultationSlots.durationMinutes,
      })
      .from(consultationBookings)
      .innerJoin(consultationSlots, eq(consultationBookings.slotId, consultationSlots.id))
      .where(sql`(${sql.join(orConditions, sql` OR `)})`)
      .orderBy(desc(consultationSlots.startsAt));

    return res.json({ bookings: rows });
  } catch (err) {
    req.log.error({ err }, "account bookings failed");
    return res.status(500).json({ error: "Failed to load bookings" });
  }
});

router.post("/account/me/bookings/:id/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt10(req.params.id);
    const emails = await getCurrentUserEmails(req);
    const userId = req.clerkUserId;
    const [b] = await db.select().from(consultationBookings).where(eq(consultationBookings.id, id));
    if (!b) return res.status(404).json({ error: "غير موجود" });
    const owns =
      (userId && b.userId === userId) ||
      emails.includes(b.clientEmail.toLowerCase());
    if (!owns) return res.status(403).json({ error: "ليست هذه استشارتك" });
    if (b.status === "cancelled") return res.json({ ok: true });
    await cancelBooking(b.id, b.slotId, b.googleEventId, req);
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "cancel booking failed");
    return res.status(500).json({ error: "فشل إلغاء الحجز" });
  }
});

async function cancelBooking(
  bookingId: number,
  slotId: number,
  googleEventId: string | null,
  req: AuthRequest | AdminAuthRequest,
): Promise<{ calendarError?: string }> {
  let calendarError: string | undefined;
  if (googleEventId && isGoogleCalendarConfigured()) {
    try {
      await deleteCalendarEvent(googleEventId);
    } catch (err) {
      calendarError = err instanceof Error ? err.message : String(err);
      (req as AuthRequest).log?.error({ err, bookingId }, "google calendar cancel failed");
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .update(consultationBookings)
      .set({
        status: "cancelled",
        calendarSyncError: calendarError ?? null,
        updatedAt: new Date(),
      })
      .where(eq(consultationBookings.id, bookingId));
    await tx
      .update(consultationSlots)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(consultationSlots.id, slotId));
  });
  return { calendarError };
}

// ───────────────────────────── ADMIN ───────────────────────────────

router.get("/admin/consultation-slots", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(consultationSlots).orderBy(asc(consultationSlots.startsAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/admin/consultation-slots", requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const startsAt = parseDate(body.startsAt);
    const duration = parseInt10(body.durationMinutes, 60);
    if (!startsAt) return res.status(400).json({ error: "startsAt مطلوب" });
    if (duration <= 0) return res.status(400).json({ error: "المدة غير صالحة" });
    const [row] = await db
      .insert(consultationSlots)
      .values({
        startsAt,
        durationMinutes: duration,
        consultationType: typeof body.consultationType === "string" ? body.consultationType.trim() : null,
        notes: typeof body.notes === "string" ? body.notes.trim() : null,
        status: (body.status as "available" | "disabled") || "available",
        createdBy: req.adminEmail ?? null,
      })
      .returning();
    return res.status(201).json(row);
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/admin/consultation-slots/bulk", requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const body = req.body as {
      startDate?: string;
      endDate?: string;
      weekdays?: number[];
      startHour?: number;
      endHour?: number;
      slotMinutes?: number;
      consultationType?: string;
      timeZone?: string;
    };
    const start = body.startDate ? new Date(body.startDate + "T00:00:00Z") : null;
    const end = body.endDate ? new Date(body.endDate + "T00:00:00Z") : null;
    const weekdays = Array.isArray(body.weekdays) ? body.weekdays.filter((d) => d >= 0 && d <= 6) : [];
    const startHour = body.startHour ?? 10;
    const endHour = body.endHour ?? 12;
    const slotMin = body.slotMinutes ?? 30;
    const tz = body.timeZone || "Asia/Riyadh";
    if (!start || !end || weekdays.length === 0 || endHour <= startHour || slotMin <= 0) {
      return res.status(400).json({ error: "بيانات غير صالحة" });
    }
    const tzOffsetMinutes = -180; // Asia/Riyadh = UTC+3 → -180 to convert local→UTC
    // For non-Riyadh, fall back to local interpretation via Date; primary use is KSA.
    const offsetMin = tz === "Asia/Riyadh" ? tzOffsetMinutes : new Date().getTimezoneOffset();

    const rows: { startsAt: Date; durationMinutes: number; consultationType: string | null; createdBy: string | null; status: "available" }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
      const d = new Date(t);
      const dow = d.getUTCDay();
      if (!weekdays.includes(dow)) continue;
      for (let mins = startHour * 60; mins + slotMin <= endHour * 60; mins += slotMin) {
        // Local clock time → UTC: subtract offset
        const startsAt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + (mins + offsetMin) * 60_000);
        rows.push({
          startsAt,
          durationMinutes: slotMin,
          consultationType: body.consultationType?.trim() || null,
          createdBy: req.adminEmail ?? null,
          status: "available",
        });
      }
    }
    if (rows.length === 0) return res.status(400).json({ error: "لا توجد مواعيد للإنشاء" });
    const inserted = await db.insert(consultationSlots).values(rows).returning();
    return res.status(201).json({ count: inserted.length, slots: inserted });
  } catch (err) {
    req.log.error({ err }, "bulk slots failed");
    return res.status(500).json({ error: "Failed" });
  }
});

router.patch("/admin/consultation-slots/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt10(req.params.id);
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.startsAt !== undefined) {
      const d = parseDate(body.startsAt);
      if (!d) return res.status(400).json({ error: "startsAt غير صالح" });
      updates.startsAt = d;
    }
    if (body.durationMinutes !== undefined) updates.durationMinutes = parseInt10(body.durationMinutes, 60);
    if (body.consultationType !== undefined) updates.consultationType = body.consultationType ? String(body.consultationType) : null;
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes) : null;
    if (body.status !== undefined) updates.status = body.status;
    const [row] = await db.update(consultationSlots).set(updates).where(eq(consultationSlots.id, id)).returning();
    if (!row) return res.status(404).json({ error: "غير موجود" });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.delete("/admin/consultation-slots/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt10(req.params.id);
    const [slot] = await db.select().from(consultationSlots).where(eq(consultationSlots.id, id));
    if (!slot) return res.status(404).json({ error: "غير موجود" });
    if (slot.status === "booked") {
      return res.status(400).json({ error: "لا يمكن حذف موعد محجوز — ألغِ الحجز أولاً" });
    }
    await db.delete(consultationSlots).where(eq(consultationSlots.id, id));
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/admin/consultation-bookings", requireAdmin, async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const filters = [] as any[];
    if (status) filters.push(eq(consultationBookings.status, status as any));
    const rows = await db
      .select({
        id: consultationBookings.id,
        slotId: consultationBookings.slotId,
        clientName: consultationBookings.clientName,
        clientEmail: consultationBookings.clientEmail,
        clientPhone: consultationBookings.clientPhone,
        consultationType: consultationBookings.consultationType,
        notes: consultationBookings.notes,
        status: consultationBookings.status,
        googleEventId: consultationBookings.googleEventId,
        googleMeetLink: consultationBookings.googleMeetLink,
        googleEventHtmlLink: consultationBookings.googleEventHtmlLink,
        calendarSyncError: consultationBookings.calendarSyncError,
        createdAt: consultationBookings.createdAt,
        startsAt: consultationSlots.startsAt,
        durationMinutes: consultationSlots.durationMinutes,
      })
      .from(consultationBookings)
      .innerJoin(consultationSlots, eq(consultationBookings.slotId, consultationSlots.id))
      .where(filters.length ? and(...filters) : undefined as any)
      .orderBy(desc(consultationSlots.startsAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/admin/consultation-bookings/:id/cancel", requireAdmin, async (req: AdminAuthRequest, res) => {
  try {
    const id = parseInt10(req.params.id);
    const [b] = await db.select().from(consultationBookings).where(eq(consultationBookings.id, id));
    if (!b) return res.status(404).json({ error: "غير موجود" });
    if (b.status === "cancelled") return res.json({ ok: true });
    const result = await cancelBooking(b.id, b.slotId, b.googleEventId, req as any);
    return res.json({ ok: true, calendarError: result.calendarError });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.post("/admin/consultation-bookings/:id/complete", requireAdmin, async (req, res) => {
  try {
    const id = parseInt10(req.params.id);
    const [row] = await db
      .update(consultationBookings)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(consultationBookings.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "غير موجود" });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
