import { Router } from "express";
import type { Response } from "express";
import { db } from "@workspace/db";
import {
  academyApplications,
  courseRegistrations,
  academyCourses,
  rfpSubmissions,
  checkoutProfiles,
  orders,
} from "@workspace/db";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { desc, eq, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

/**
 * Still returns a list because the historical records these queries match
 * against (academy applications, RFP submissions) were keyed by whatever email
 * the visitor typed, and the callers below build `lower(col) IN (...)` filters.
 * An account now has exactly one address, so the list holds at most one — under
 * Clerk a user could hold several verified addresses.
 */
function getCurrentUserEmails(req: AuthRequest): string[] {
  const email = req.userEmail?.trim().toLowerCase();
  return email ? [email] : [];
}

function emailFilter(column: AnyPgColumn, emails: string[]) {
  if (emails.length === 0) return sql`false`;
  if (emails.length === 1) return sql`lower(${column}) = ${emails[0]}`;
  return or(...emails.map((e) => sql`lower(${column}) = ${e}`))!;
}

// Saved checkout contact details for the signed-in user, used to pre-fill
// the checkout form. Prefers the explicit checkout profile (upserted on every
// order placement); falls back to the customer's most recent order so users
// who ordered before the profile table existed still get pre-fill.
router.get("/account/me/checkout-details", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const [profile] = await db
      .select({
        fullName: checkoutProfiles.fullName,
        phone: checkoutProfiles.phone,
        address: checkoutProfiles.address,
        city: checkoutProfiles.city,
      })
      .from(checkoutProfiles)
      .where(eq(checkoutProfiles.userId, userId))
      .limit(1);
    if (profile) {
      return res.json({ details: profile });
    }
    const [lastOrder] = await db
      .select({
        fullName: orders.fullName,
        phone: orders.phone,
        address: orders.address,
        city: orders.city,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    return res.json({ details: lastOrder ?? null });
  } catch (err) {
    req.log.error({ err }, "account checkout details failed");
    return res.status(500).json({ error: "Failed to load checkout details" });
  }
});

router.get("/account/me/academy-registrations", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const emails = getCurrentUserEmails(req);
    if (emails.length === 0) {
      return res.json({ email: null, applications: [], registrations: [] });
    }

    const applications = await db
      .select({
        id: academyApplications.id,
        applyType: academyApplications.applyType,
        contextLabelAr: academyApplications.contextLabelAr,
        contextLabelEn: academyApplications.contextLabelEn,
        organization: academyApplications.organization,
        country: academyApplications.country,
        notes: academyApplications.notes,
        status: academyApplications.status,
        createdAt: academyApplications.createdAt,
      })
      .from(academyApplications)
      .where(emailFilter(academyApplications.email, emails))
      .orderBy(desc(academyApplications.createdAt));

    const registrations = await db
      .select({
        id: courseRegistrations.id,
        courseId: courseRegistrations.courseId,
        courseTitleAr: academyCourses.titleAr,
        courseTitleEn: academyCourses.titleEn,
        organization: courseRegistrations.organization,
        registeredAt: courseRegistrations.registeredAt,
      })
      .from(courseRegistrations)
      .leftJoin(academyCourses, eq(academyCourses.id, courseRegistrations.courseId))
      .where(emailFilter(courseRegistrations.email, emails))
      .orderBy(desc(courseRegistrations.registeredAt));

    return res.json({ email: emails[0], applications, registrations });
  } catch (err) {
    req.log.error({ err }, "account academy registrations failed");
    return res.status(500).json({ error: "Failed to load academy registrations" });
  }
});

router.get("/account/me/service-requests", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const emails = getCurrentUserEmails(req);
    if (emails.length === 0) {
      return res.json({ email: null, requests: [] });
    }
    const rows = await db
      .select({
        id: rfpSubmissions.id,
        submissionType: rfpSubmissions.submissionType,
        organization: rfpSubmissions.organization,
        servicesOfInterest: rfpSubmissions.servicesOfInterest,
        projectDescription: rfpSubmissions.projectDescription,
        desiredStartDate: rfpSubmissions.desiredStartDate,
        estimatedBudget: rfpSubmissions.estimatedBudget,
        projectDuration: rfpSubmissions.projectDuration,
        status: rfpSubmissions.status,
        country: rfpSubmissions.country,
        createdAt: rfpSubmissions.createdAt,
        updatedAt: rfpSubmissions.updatedAt,
      })
      .from(rfpSubmissions)
      .where(emailFilter(rfpSubmissions.email, emails))
      .orderBy(desc(rfpSubmissions.createdAt));
    return res.json({ email: emails[0], requests: rows });
  } catch (err) {
    req.log.error({ err }, "account service requests failed");
    return res.status(500).json({ error: "Failed to load service requests" });
  }
});

export default router;
