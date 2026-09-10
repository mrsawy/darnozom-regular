import { Router } from "express";
import { db } from "@workspace/db";
import { rfpSubmissions } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { requireAdmin } from "../../middlewares/adminAuth";
import { sendServiceRequestNotification } from "../../lib/email";

const router = Router();

// Topic categories accepted as the parent group portion of a composite
// "<category>:<topic>" id sent from the unified RFP form. AI Consulting Agent
// is intentionally excluded — it is a separate platform, not a consultable
// service offering.
const RFP_TOPIC_CATEGORIES = new Set([
  "islamic-systems",
  "management-systems",
  "digital-transformation",
]);

function validateRfpBody(body: Record<string, unknown>) {
  const required = ["fullName", "organization", "email", "servicesOfInterest", "projectDescription"];
  for (const field of required) {
    if (field === "servicesOfInterest") {
      if (!Array.isArray(body[field]) || (body[field] as unknown[]).length === 0) {
        return { valid: false, error: "At least one sub-topic must be selected" };
      }
      const arr = body[field] as unknown[];
      for (const item of arr) {
        if (typeof item !== "string" || !item.trim()) {
          return { valid: false, error: "Invalid sub-topic value" };
        }
      }
    } else {
      if (!body[field] || typeof body[field] !== "string" || !(body[field] as string).trim()) {
        return { valid: false, error: `Field '${field}' is required` };
      }
    }
  }
  const email = body.email as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: "Invalid email address" };
  }
  return { valid: true };
}

/**
 * Normalise the services_of_interest array. The unified RFP form sends entries
 * as composite ids ("<category>:<topic>"). We:
 *   - drop any entry whose category portion is not one of the allowed
 *     consulting categories (e.g. legacy "ai-agent" entries are filtered out
 *     so the AI agent is never recorded as a requested consulting service);
 *   - keep legacy flat ids as-is for backward compatibility with older
 *     submissions still being replayed.
 */
function normaliseServicesOfInterest(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    const sep = value.indexOf(":");
    if (sep > 0) {
      const cat = value.slice(0, sep);
      if (!RFP_TOPIC_CATEGORIES.has(cat)) continue;
    } else if (value === "ai-agent") {
      // Hard-block legacy ai-agent flat id from being persisted as a request.
      continue;
    }
    seen.add(value);
    out.push(value);
  }
  return out;
}

router.post("/rfp", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const check = validateRfpBody(body);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const {
      fullName,
      jobTitle,
      organization,
      email,
      phone,
      servicesOfInterest,
      projectDescription,
      desiredStartDate,
      estimatedBudget,
      projectDuration,
      howDidYouHear,
      attachmentUrl,
      attachmentName,
    } = body as {
      fullName: string;
      jobTitle?: string;
      organization: string;
      email: string;
      phone?: string;
      servicesOfInterest: string[];
      projectDescription: string;
      desiredStartDate?: string;
      estimatedBudget?: string;
      projectDuration?: string;
      howDidYouHear?: string;
      attachmentUrl?: string;
      attachmentName?: string;
    };

    const cleanedServices = normaliseServicesOfInterest(servicesOfInterest);
    if (cleanedServices.length === 0) {
      return res.status(400).json({ error: "At least one valid sub-topic must be selected" });
    }

    const [submission] = await db
      .insert(rfpSubmissions)
      .values({
        fullName: fullName.trim(),
        jobTitle: jobTitle?.trim() || null,
        organization: organization.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        servicesOfInterest: cleanedServices,
        projectDescription: projectDescription.trim(),
        desiredStartDate: desiredStartDate?.trim() || null,
        estimatedBudget: estimatedBudget?.trim() || null,
        projectDuration: projectDuration?.trim() || null,
        howDidYouHear: howDidYouHear?.trim() || null,
        attachmentUrl: attachmentUrl?.trim() || null,
        attachmentName: attachmentName?.trim() || null,
        submissionType: "rfp",
        status: "new",
      })
      .returning();

    return res.status(201).json({ success: true, id: submission.id });
  } catch (err) {
    console.error("RFP submission error:", err);
    return res.status(500).json({ error: "Failed to save RFP submission" });
  }
});

router.get("/rfp", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const submissions = await db
      .select()
      .from(rfpSubmissions)
      .orderBy(desc(rfpSubmissions.createdAt));
    res.json(submissions);
  } catch (err) {
    console.error("RFP list error:", err);
    res.status(500).json({ error: "Failed to list RFP submissions" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Service Registration — a shorter, lower-friction first-contact form used on
// the three consulting service detail pages (Islamic, Management, Digital).
// Stored in the same rfp_submissions table with submissionType="service_registration".
// ─────────────────────────────────────────────────────────────────────────────

// AI Consulting Agent ("ai-agent") is intentionally excluded — it is a
// standalone platform, not a service that can be registered for here.
const ALLOWED_SERVICE_REGISTRATION_TYPES = new Set([
  "islamic-systems",
  "management-systems",
  "digital-transformation",
  "academy",
  "research",
  "publishing",
  "store",
  "other",
]);

function validateServiceRegistrationBody(body: Record<string, unknown>) {
  const required = ["fullName", "organization", "email", "serviceType"];
  for (const field of required) {
    if (!body[field] || typeof body[field] !== "string" || !(body[field] as string).trim()) {
      return { valid: false, error: `Field '${field}' is required` };
    }
  }
  const email = body.email as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: "Invalid email address" };
  }
  const serviceType = (body.serviceType as string).trim();
  if (!ALLOWED_SERVICE_REGISTRATION_TYPES.has(serviceType)) {
    return { valid: false, error: "Invalid service type" };
  }
  return { valid: true };
}

router.post("/service-registrations", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const check = validateServiceRegistrationBody(body);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    const {
      fullName,
      jobTitle,
      organization,
      email,
      phone,
      country,
      serviceType,
      comments,
    } = body as {
      fullName: string;
      jobTitle?: string;
      organization: string;
      email: string;
      phone?: string;
      country?: string;
      serviceType: string;
      comments?: string;
    };

    const [submission] = await db
      .insert(rfpSubmissions)
      .values({
        fullName: fullName.trim(),
        jobTitle: jobTitle?.trim() || null,
        organization: organization.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        servicesOfInterest: [serviceType.trim()],
        projectDescription: comments?.trim() || "",
        submissionType: "service_registration",
        status: "new",
      })
      .returning();

    sendServiceRequestNotification({
      submissionId: submission.id,
      fullName: fullName.trim(),
      jobTitle: jobTitle?.trim() || null,
      organization: organization.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      country: country?.trim() || null,
      serviceType: serviceType.trim(),
      comments: comments?.trim() || null,
    }).catch(err => console.error("[service-registration] Email notification failed:", err));

    return res.status(201).json({ success: true, id: submission.id });
  } catch (err) {
    console.error("Service registration submission error:", err);
    return res.status(500).json({ error: "Failed to save service registration" });
  }
});

router.get("/service-registrations", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const submissions = await db
      .select()
      .from(rfpSubmissions)
      .where(eq(rfpSubmissions.submissionType, "service_registration"))
      .orderBy(desc(rfpSubmissions.createdAt));
    res.json(submissions);
  } catch (err) {
    console.error("Service registration list error:", err);
    res.status(500).json({ error: "Failed to list service registrations" });
  }
});

export default router;
