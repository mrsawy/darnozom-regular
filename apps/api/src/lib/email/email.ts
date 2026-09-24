const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Darnozom Consulting <noreply@darnozom.com>";
function resolvePlatformUrl(): string {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const withProtocol = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withProtocol.replace(/\/+$/, "");
  }
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (domains) return `https://${domains}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (devDomain) return `https://${devDomain}`;
  return "http://localhost:80";
}

export const PLATFORM_URL = resolvePlatformUrl();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { ok: false, error: "Email service not configured" };
  }

  const body: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
  };

  if (payload.replyTo) {
    body.reply_to = [payload.replyTo];
  }

  if (payload.attachments?.length) {
    body.attachments = payload.attachments.map(a => ({
      filename: a.filename,
      content: a.content,
      type: a.contentType,
    }));
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend API error:", res.status, text);
      return { ok: false, error: `Email send failed: ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] Network error sending email:", err);
    return { ok: false, error: "Network error sending email" };
  }
}

function reportReadyHtml(params: {
  reportTitle: string;
  clientName: string;
  reportType: string;
  reportLink: string;
}): string {
  const { reportTitle, clientName, reportType, reportLink } = params;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Consulting</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">AI Consulting Platform</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 20px;">Your Report Is Ready</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0;">A new report has been generated and saved to the platform.</p>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 28px;">
        <p style="margin: 0 0 6px 0; color: #333; font-size: 14px;"><strong>Report:</strong> ${reportTitle}</p>
        <p style="margin: 0 0 6px 0; color: #333; font-size: 14px;"><strong>Client:</strong> ${clientName}</p>
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>Type:</strong> ${reportType}</p>
      </div>
      <a href="${reportLink}" style="display: inline-block; background: #0D1B3E; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 14px; font-weight: bold;">View Report</a>
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Consulting AI Platform — Confidential &amp; Proprietary</p>
    </div>
  </div>
</body>
</html>`;
}

function sendToClientHtml(params: {
  reportTitle: string;
  clientName: string;
  executiveSummary: string;
  platformLink: string;
}): string {
  const { reportTitle, clientName, executiveSummary, platformLink } = params;
  const summarySnippet = executiveSummary.slice(0, 400).replace(/[#*`]/g, "").trim();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Consulting</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">AI Consulting Platform</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 20px;">Your Consulting Report</h2>
      <p style="color: #555; font-size: 14px; margin: 0 0 24px 0;">Dear ${clientName},<br/><br/>Please find your consulting report attached to this email.</p>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 28px;">
        <p style="margin: 0 0 6px 0; color: #333; font-size: 14px;"><strong>${reportTitle}</strong></p>
        ${summarySnippet ? `<p style="margin: 12px 0 0 0; color: #555; font-size: 13px; line-height: 1.6;">${summarySnippet}…</p>` : ""}
      </div>
      <p style="color: #555; font-size: 13px; margin: 0 0 20px 0;">The full report is attached as a PDF. You can also access your reports through the client portal.</p>
      <a href="${platformLink}" style="display: inline-block; background: #0D1B3E; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 14px; font-weight: bold;">View Client Portal</a>
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Consulting AI Platform — Confidential &amp; Proprietary</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendReportReadyNotification(params: {
  consultantEmail: string;
  reportId: number;
  reportTitle: string;
  clientName: string;
  reportType: string;
  isAssessment?: boolean;
}): Promise<void> {
  const reportPath = params.isAssessment
    ? `/darnozom-agent/assessment/${params.reportId}/report`
    : `/darnozom-agent/reports`;
  const reportLink = `${PLATFORM_URL}${reportPath}`;

  await sendEmail({
    to: params.consultantEmail,
    subject: `Report Ready: ${params.reportTitle}`,
    html: reportReadyHtml({
      reportTitle: params.reportTitle,
      clientName: params.clientName,
      reportType: params.reportType,
      reportLink,
    }),
  });
}

export async function sendContactNotification(params: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}): Promise<void> {
  const { name, email, subject, message } = params;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);
  const displaySubject = escapeHtml(subject || "(No subject)");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Consulting</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">رسالة جديدة من نموذج التواصل · New Contact Form Message</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #0D1B3E; margin: 0 0 20px 0; font-size: 18px;">New Message from Website</h2>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${safeEmail}" style="color: #0D1B3E;">${safeEmail}</a></p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>Subject:</strong> ${displaySubject}</p>
      </div>
      <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold;">Message:</p>
        <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${safeMessage}</p>
      </div>
      <p style="margin: 24px 0 0 0; color: #999; font-size: 12px;">
        Reply directly to this email or use <a href="mailto:${safeEmail}" style="color: #0D1B3E;">${safeEmail}</a> to respond.
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Consulting — darnozom.com</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: "info@darnozom.com",
    subject: `[Website Contact] ${displaySubject} — from ${name}`,
    replyTo: email,
    html,
  });
}

const SERVICE_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  "islamic-systems": { ar: "أنظمة ومعايير الحوكمة الشرعية", en: "Shariah Governance Systems" },
  "management-systems": { ar: "أنظمة التميز الإداري", en: "Management Excellence Systems" },
  "digital-transformation": { ar: "التحول الرقمي", en: "Digital Transformation" },
  academy: { ar: "الأكاديمية", en: "Academy" },
  research: { ar: "البحوث والدراسات", en: "Research & Studies" },
  publishing: { ar: "النشر", en: "Publishing" },
  store: { ar: "المتجر", en: "Store" },
  other: { ar: "أخرى", en: "Other" },
};

export async function sendServiceRequestNotification(params: {
  submissionId: number;
  fullName: string;
  jobTitle?: string | null;
  organization: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  serviceType: string;
  comments?: string | null;
}): Promise<void> {
  const {
    submissionId,
    fullName,
    jobTitle,
    organization,
    email,
    phone,
    country,
    serviceType,
    comments,
  } = params;

  const label = SERVICE_TYPE_LABELS[serviceType] ?? { ar: serviceType, en: serviceType };
  const serviceLabel = escapeHtml(`${label.ar} · ${label.en}`);
  const cleanComments = escapeHtml((comments || "").trim());
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeOrg = escapeHtml(organization);
  const safePhone = phone ? escapeHtml(phone) : null;
  const safeJobTitle = jobTitle ? escapeHtml(jobTitle) : null;
  const safeCountry = country ? escapeHtml(country) : null;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 640px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Consulting</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">طلب خدمة جديد · New Service Request</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 18px;">طلب خدمة جديد · New Service Request</h2>
      <p style="margin: 0 0 16px 0; color: #C9A84C; font-size: 16px; font-weight: bold;">${serviceLabel}</p>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الاسم / Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>البريد / Email:</strong> <a href="mailto:${safeEmail}" style="color: #0D1B3E;">${safeEmail}</a></p>
        ${safePhone ? `<p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الهاتف / Phone:</strong> ${safePhone}</p>` : ""}
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الجهة / Organization:</strong> ${safeOrg}</p>
        ${safeJobTitle ? `<p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>المسمى الوظيفي / Job Title:</strong> ${safeJobTitle}</p>` : ""}
        ${safeCountry ? `<p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الدولة / Country:</strong> ${safeCountry}</p>` : ""}
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>رقم الطلب / Request #:</strong> ${submissionId}</p>
      </div>
      ${cleanComments ? `<div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold;">ملاحظات / Comments:</p>
        <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${cleanComments}</p>
      </div>` : ""}
      <p style="margin: 24px 0 0 0; color: #999; font-size: 12px;">
        للرد على العميل: <a href="mailto:${safeEmail}" style="color: #0D1B3E;">${safeEmail}</a>
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Consulting — darnozom.com</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: "info@darnozom.com",
    subject: `[Service Request #${submissionId}] ${label.en} — ${fullName}`,
    replyTo: email,
    html,
  });
}

export async function sendJobApplicationNotification(params: {
  applicationId: number;
  jobTitleAr: string;
  jobTitleEn: string;
  fullName: string;
  email: string;
  phone: string;
  yearsExperience: number | null;
  coverLetter: string | null;
  resumeUrl: string;
  resumeFileName: string;
  adminUrl: string;
}): Promise<void> {
  const {
    applicationId,
    jobTitleAr,
    jobTitleEn,
    fullName,
    email,
    phone,
    yearsExperience,
    coverLetter,
    resumeUrl,
    resumeFileName,
    adminUrl,
  } = params;

  const cover = (coverLetter || "").trim();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 640px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Consulting</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">طلب توظيف جديد · New Job Application</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 18px;">طلب توظيف جديد على وظيفة:</h2>
      <p style="margin: 0 0 16px 0; color: #C9A84C; font-size: 16px; font-weight: bold;">${jobTitleAr} — ${jobTitleEn}</p>
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الاسم / Name:</strong> ${fullName}</p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>البريد / Email:</strong> <a href="mailto:${email}" style="color: #0D1B3E;">${email}</a></p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الهاتف / Phone:</strong> ${phone}</p>
        ${yearsExperience !== null ? `<p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>سنوات الخبرة / Years of Experience:</strong> ${yearsExperience}</p>` : ""}
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>رقم الطلب / Application #:</strong> ${applicationId}</p>
      </div>
      ${cover ? `<div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold;">رسالة التغطية / Cover Letter:</p>
        <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${cover}</p>
      </div>` : ""}
      <div style="margin-top: 24px;">
        <a href="${resumeUrl}" style="display: inline-block; background: #C9A84C; color: #0D1B3E; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-size: 14px; font-weight: bold; margin-inline-end: 10px;">تحميل السيرة الذاتية / Download CV (${resumeFileName})</a>
        <a href="${adminUrl}" style="display: inline-block; background: #0D1B3E; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-size: 14px; font-weight: bold;">عرض في لوحة التحكم / Open in Admin</a>
      </div>
      <p style="margin: 24px 0 0 0; color: #999; font-size: 12px;">
        للرد على المتقدم: <a href="mailto:${email}" style="color: #0D1B3E;">${email}</a>
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Consulting — darnozom.com</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: "info@darnozom.com",
    subject: `[Job Application #${applicationId}] ${jobTitleEn} — ${fullName}`,
    replyTo: email,
    html,
  });
}

export async function sendAcademyApplicationNotification(params: {
  applicationId: number;
  applyType: string;
  contextLabelAr: string | null;
  contextLabelEn: string | null;
  fullName: string;
  email: string;
  phone: string;
  organization: string | null;
  country: string | null;
  notes: string | null;
  adminUrl: string;
}): Promise<void> {
  const {
    applicationId,
    applyType,
    contextLabelAr,
    contextLabelEn,
    fullName,
    email,
    phone,
    organization,
    country,
    notes,
    adminUrl,
  } = params;

  const typeMap: Record<string, { ar: string; en: string }> = {
    program: { ar: "تقديم على برنامج", en: "Program application" },
    level: { ar: "تقديم على مستوى", en: "Level application" },
    diploma: { ar: "تقديم على دبلوم", en: "Diploma application" },
    course: { ar: "تقديم على كورس", en: "Course application" },
    exec: { ar: "تقديم على برنامج تنفيذي", en: "Executive program application" },
    general: { ar: "تقديم عام", en: "General application" },
  };
  const typeLabels = typeMap[applyType] ?? typeMap.general;
  const cleanNotes = (notes || "").trim();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
  <div style="max-width: 640px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0D1B3E; padding: 32px 40px;">
      <p style="color: #C9A84C; font-size: 20px; margin: 0; font-weight: bold;">دار نظم | Darnozom Academy</p>
      <p style="color: #ffffff; font-size: 13px; margin: 8px 0 0 0;">طلب التحاق جديد · New Academy Application</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #0D1B3E; margin: 0 0 8px 0; font-size: 18px;">${typeLabels.ar} · ${typeLabels.en}</h2>
      ${(contextLabelAr || contextLabelEn) ? `<p style="margin: 0 0 16px 0; color: #C9A84C; font-size: 16px; font-weight: bold;">${contextLabelAr || ""}${contextLabelAr && contextLabelEn ? " — " : ""}${contextLabelEn || ""}</p>` : ""}
      <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الاسم / Name:</strong> ${fullName}</p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>البريد / Email:</strong> <a href="mailto:${email}" style="color: #0D1B3E;">${email}</a></p>
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الهاتف / Phone:</strong> ${phone}</p>
        ${organization ? `<p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الجهة / Organization:</strong> ${organization}</p>` : ""}
        ${country ? `<p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>الدولة / Country:</strong> ${country}</p>` : ""}
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>رقم الطلب / Application #:</strong> ${applicationId}</p>
      </div>
      ${cleanNotes ? `<div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px; font-weight: bold;">ملاحظات / Notes:</p>
        <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${cleanNotes}</p>
      </div>` : ""}
      <div style="margin-top: 24px;">
        <a href="${adminUrl}" style="display: inline-block; background: #0D1B3E; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-size: 14px; font-weight: bold;">عرض في لوحة التحكم / Open in Admin</a>
      </div>
      <p style="margin: 24px 0 0 0; color: #999; font-size: 12px;">
        للرد على المتقدم: <a href="mailto:${email}" style="color: #0D1B3E;">${email}</a>
      </p>
    </div>
    <div style="background: #f9f9f9; padding: 20px 40px; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px; margin: 0;">© Darnozom Academy — darnozom.com</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: "info@darnozom.com",
    subject: `[Academy Application #${applicationId}] ${typeLabels.en}${contextLabelEn ? ` — ${contextLabelEn}` : ""} — ${fullName}`,
    replyTo: email,
    html,
  });
}

interface OrderReceiptItem {
  id: number;
  productTitle: string;
  quantity: number;
  unitPrice: string;
  format: "paper" | "digital" | null;
  isDigital: boolean;
}

function orderReceiptHtml(params: {
  orderId: number;
  customerName: string;
  items: OrderReceiptItem[];
  currency: string;
  subtotal: string;
  shippingTotal: string;
  totalAmount: string;
  accountLink: string;
  headerSubtitle: string;
  heading: string;
  intro: string;
  note?: string;
  readerLinkFor?: (itemId: number) => string;
}): string {
  const {
    orderId,
    customerName,
    items,
    currency,
    subtotal,
    shippingTotal,
    totalAmount,
    accountLink,
    headerSubtitle,
    heading,
    intro,
    note,
    readerLinkFor,
  } = params;

  const formatLabel = (fmt: "paper" | "digital" | null): string => {
    if (fmt === "paper") return "نسخة ورقية";
    if (fmt === "digital") return "نسخة رقمية";
    return "";
  };

  const itemRows = items
    .map((it) => {
      const title = escapeHtml(it.productTitle);
      const fmt = formatLabel(it.format);
      const fmtBadge = fmt
        ? `<span style="display:inline-block;background:#f0ece0;color:#7a5b00;font-size:11px;padding:2px 8px;border-radius:10px;margin-inline-start:6px;">${fmt}</span>`
        : "";
      const lineTotal = (parseFloat(it.unitPrice || "0") * it.quantity).toFixed(2);
      const readBlock =
        it.isDigital && readerLinkFor
          ? `<div style="margin-top:8px;"><a href="${readerLinkFor(it.id)}" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:bold;">قراءة / تحميل النسخة الرقمية</a></div>`
          : "";
      return `<tr>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;color:#333;font-size:14px;">
          ${title}${fmtBadge}
          ${readBlock}
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;color:#555;font-size:14px;text-align:center;white-space:nowrap;">${it.quantity}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;color:#555;font-size:14px;text-align:left;white-space:nowrap;">${lineTotal} ${escapeHtml(currency)}</td>
      </tr>`;
    })
    .join("");

  const shippingNum = parseFloat(shippingTotal || "0");
  const shippingRow =
    shippingNum > 0
      ? `<tr>
          <td colspan="2" style="padding:8px;color:#555;font-size:14px;text-align:right;">الشحن:</td>
          <td style="padding:8px;color:#555;font-size:14px;text-align:left;white-space:nowrap;">${shippingNum.toFixed(2)} ${escapeHtml(currency)}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"/></head>
<body style="font-family: Arial, 'Tahoma', sans-serif; background:#f5f5f5; margin:0; padding:0;">
  <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0D1B3E; padding:28px 32px;">
      <p style="color:#C9A84C; font-size:20px; margin:0; font-weight:bold;">دار نظم | Darnozom Consulting</p>
      <p style="color:#fff; font-size:13px; margin:6px 0 0;">${headerSubtitle}</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px; color:#0D1B3E;">${heading} ${escapeHtml(customerName)}،</h2>
      <p style="margin:0 0 20px; color:#333; font-size:15px; line-height:1.7;">
        ${intro}
      </p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <thead>
          <tr>
            <th style="padding:8px;border-bottom:2px solid #0D1B3E;color:#0D1B3E;font-size:13px;text-align:right;">المنتج</th>
            <th style="padding:8px;border-bottom:2px solid #0D1B3E;color:#0D1B3E;font-size:13px;text-align:center;">الكمية</th>
            <th style="padding:8px;border-bottom:2px solid #0D1B3E;color:#0D1B3E;font-size:13px;text-align:left;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          ${shippingRow}
          <tr>
            <td colspan="2" style="padding:12px 8px;color:#0D1B3E;font-size:16px;font-weight:bold;text-align:right;">المبلغ الإجمالي:</td>
            <td style="padding:12px 8px;color:#0D1B3E;font-size:16px;font-weight:bold;text-align:left;white-space:nowrap;">${parseFloat(totalAmount || "0").toFixed(2)} ${escapeHtml(currency)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin:24px 0 0; color:#555; font-size:13px; line-height:1.7;">
        ${note ?? 'يمكنك عرض طلباتك والوصول إلى نسخك الرقمية في أي وقت من صفحة "حسابي".'}
      </p>
      <p style="margin:16px 0;">
        <a href="${accountLink}" style="display:inline-block;background:#0D1B3E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;font-size:14px;">عرض طلباتي</a>
      </p>
    </div>
    <div style="background:#f5f5f5; padding:16px 32px; text-align:center; color:#888; font-size:11px;">
      © Darnozom Consulting — darnozom.com
    </div>
  </div>
</body></html>`;
}

export async function sendOrderReceipt(params: {
  to: string;
  orderId: number;
  customerName: string;
  items: OrderReceiptItem[];
  currency: string;
  subtotal: string;
  shippingTotal: string;
  totalAmount: string;
}): Promise<{ ok: boolean; error?: string }> {
  const accountLink = `${PLATFORM_URL}/account`;
  const readerLinkFor = (itemId: number) =>
    `${PLATFORM_URL}/account/orders/${params.orderId}/items/${itemId}/read`;

  const hasDigital = params.items.some((it) => it.isDigital);

  return sendEmail({
    to: params.to,
    subject: `إيصال طلبك #${params.orderId} | Darnozom Consulting`,
    html: orderReceiptHtml({
      orderId: params.orderId,
      customerName: params.customerName,
      items: params.items,
      currency: params.currency,
      subtotal: params.subtotal,
      shippingTotal: params.shippingTotal,
      totalAmount: params.totalAmount,
      accountLink,
      readerLinkFor,
      headerSubtitle: "إيصال الطلب · Order Receipt",
      heading: "شكراً لك",
      intro: `تم استلام دفعتك بنجاح وتأكيد طلبك رقم <strong>#${params.orderId}</strong>. فيما يلي تفاصيل طلبك:`,
      note: hasDigital
        ? 'يمكنك قراءة أو تحميل نسخك الرقمية فوراً من الأزرار أعلاه أو من صفحة "حسابي" في أي وقت.'
        : 'يمكنك متابعة حالة طلبك في أي وقت من صفحة "حسابي". سنقوم بتجهيز وشحن طلبك في أقرب وقت.',
    }),
  });
}

// Customer confirmation for a cash-on-delivery order (payment collected on
// delivery, so no digital access and no receipt of payment yet).
type ManualInstructionsParams = {
  to: string;
  orderId: number;
  customerName: string;
  paymentMethod: "vodafone_cash" | "instapay";
  totalAmount: string;
  currency: string;
};

export function sendManualPaymentInstructionsHtml(params: ManualInstructionsParams): string {
  const methodAr = params.paymentMethod === "vodafone_cash" ? "فودافون كاش" : "إنستاباي";
  const proofAr =
    params.paymentMethod === "vodafone_cash"
      ? "أرسل صورة إيصال التحويل على واتساب"
      : "أرسل رمز تأكيد التحويل على واتساب";
  // Carries the email so a guest can reopen the page from another browser.
  const link = `${PLATFORM_URL}/checkout/manual?orderId=${params.orderId}&email=${encodeURIComponent(params.to)}`;
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8">
  <h2>تم استلام طلبك #${params.orderId}</h2>
  <p>مرحباً ${escapeHtml(params.customerName)}،</p>
  <p>لإتمام الطلب، حوّل مبلغ <strong>${escapeHtml(params.totalAmount)} ${escapeHtml(params.currency)}</strong> عبر <strong>${methodAr}</strong>، ثم ${proofAr}.</p>
  <p><a href="${escapeHtml(link)}">عرض بيانات الدفع</a></p>
  <p>سيتم تفعيل طلبك (والوصول إلى الكتب الرقمية) فور تأكيد الدفع.</p>
</div>`;
}

export async function sendManualPaymentInstructions(
  params: ManualInstructionsParams,
): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to: params.to,
    subject: `أكمل الدفع لطلبك #${params.orderId} | Darnozom Consulting`,
    html: sendManualPaymentInstructionsHtml(params),
  });
}

export async function sendOrderPlacedConfirmation(params: {
  to: string;
  orderId: number;
  customerName: string;
  items: OrderReceiptItem[];
  currency: string;
  subtotal: string;
  shippingTotal: string;
  totalAmount: string;
}): Promise<{ ok: boolean; error?: string }> {
  const accountLink = `${PLATFORM_URL}/account`;

  return sendEmail({
    to: params.to,
    subject: `تأكيد استلام طلبك #${params.orderId} | Darnozom Consulting`,
    html: orderReceiptHtml({
      orderId: params.orderId,
      customerName: params.customerName,
      items: params.items,
      currency: params.currency,
      subtotal: params.subtotal,
      shippingTotal: params.shippingTotal,
      totalAmount: params.totalAmount,
      accountLink,
      headerSubtitle: "تأكيد الطلب · Order Confirmation",
      heading: "شكراً لك",
      intro: `تم استلام طلبك رقم <strong>#${params.orderId}</strong> بنجاح وهو الآن قيد المراجعة. الدفع عند الاستلام. فيما يلي تفاصيل طلبك:`,
      note: 'سنتواصل معك لتأكيد موعد التسليم. المبلغ الإجمالي (شامل الشحن) يُدفع نقداً عند الاستلام. يمكنك متابعة حالة طلبك من صفحة "حسابي".',
    }),
  });
}

const ORDER_STATUS_LABELS: Record<string, { title: string; message: string }> = {
  pending: {
    title: "قيد الانتظار",
    message: "طلبك قيد الانتظار وسنبدأ بتجهيزه قريباً.",
  },
  confirmed: {
    title: "تم التأكيد",
    message: "تم تأكيد طلبك وسنبدأ بتجهيزه.",
  },
  processing: {
    title: "قيد التجهيز",
    message: "نقوم حالياً بتجهيز طلبك استعداداً للشحن.",
  },
  completed: {
    title: "تم التسليم / الاكتمال",
    message: "تم إكمال طلبك بنجاح. نشكرك على ثقتك بنا.",
  },
  cancelled: {
    title: "تم الإلغاء",
    message: "تم إلغاء طلبك. إذا كان لديك أي استفسار يرجى التواصل معنا.",
  },
};

// Notifies the customer when an admin changes their order status.
export async function sendOrderStatusUpdate(params: {
  to: string;
  orderId: number;
  customerName: string;
  status: string;
  adminNote?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const accountLink = `${PLATFORM_URL}/account`;
  const label = ORDER_STATUS_LABELS[params.status] ?? {
    title: params.status,
    message: "تم تحديث حالة طلبك.",
  };
  const noteBlock = params.adminNote
    ? `<div style="margin:16px 0; padding:14px; background:#f9f9f9; border:1px solid #e5e5e5; border-radius:6px; color:#555; font-size:14px; line-height:1.7;"><strong>ملاحظة:</strong><br/>${escapeHtml(params.adminNote)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"/></head>
<body style="font-family: Arial, 'Tahoma', sans-serif; background:#f5f5f5; margin:0; padding:0;">
  <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0D1B3E; padding:28px 32px;">
      <p style="color:#C9A84C; font-size:20px; margin:0; font-weight:bold;">دار نظم | Darnozom Consulting</p>
      <p style="color:#fff; font-size:13px; margin:6px 0 0;">تحديث حالة الطلب · Order Update</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px; color:#0D1B3E;">مرحباً ${escapeHtml(params.customerName)}،</h2>
      <p style="margin:0 0 20px; color:#333; font-size:15px; line-height:1.7;">
        تم تحديث حالة طلبك رقم <strong>#${params.orderId}</strong>.
      </p>
      <div style="border:1px solid #eee; border-right:4px solid #C9A84C; padding:16px; background:#fafafa; margin:16px 0;">
        <p style="margin:0; color:#0D1B3E; font-size:16px; font-weight:bold;">الحالة الجديدة: ${label.title}</p>
        <p style="margin:8px 0 0; color:#555; font-size:14px; line-height:1.7;">${label.message}</p>
      </div>
      ${noteBlock}
      <p style="margin:16px 0;">
        <a href="${accountLink}" style="display:inline-block;background:#0D1B3E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;font-size:14px;">عرض طلباتي</a>
      </p>
    </div>
    <div style="background:#f5f5f5; padding:16px 32px; text-align:center; color:#888; font-size:11px;">
      © Darnozom Consulting — darnozom.com
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: params.to,
    subject: `تحديث طلبك #${params.orderId}: ${label.title} | Darnozom Consulting`,
    html,
  });
}

// Tells the customer their unpaid order was auto-cancelled (checkout expired)
// or that its payment terminally failed. Best-effort — callers must not treat
// failures as fatal.
export async function sendOrderAutoCancelledEmail(params: {
  to: string;
  orderId: number;
  customerName: string;
  reason: "expired" | "payment_failed";
  /** Optional payment failure code (e.g. COMPLIANCE_VIOLATION) shown to the customer. */
  failureCode?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const accountLink = `${PLATFORM_URL}/account`;
  const storeLink = `${PLATFORM_URL}/services/store`;

  const isExpired = params.reason === "expired";
  const title = isExpired
    ? "طلبك أُلغي تلقائياً — لم يكتمل الدفع"
    : "تعذّر إتمام الدفع — تم إلغاء طلبك";
  const explanation = isExpired
    ? `لم نستلم الدفع الخاص بطلبك رقم <strong>#${params.orderId}</strong> خلال المهلة المحددة، لذا تم إلغاء الطلب تلقائياً. لم يتم خصم أي مبلغ منك.`
    : `للأسف فشل تحصيل الدفع الخاص بطلبك رقم <strong>#${params.orderId}</strong> بشكل نهائي، لذا تم إيقاف الطلب. <strong>إذا تم خصم أي مبلغ منك فسيُعاد إليك تلقائياً من مزوّد الدفع.</strong>`;
  const codeBlock =
    !isExpired && params.failureCode
      ? `<p style="margin:8px 0 0; color:#888; font-size:12px;">رمز الخطأ: ${escapeHtml(params.failureCode)}</p>`
      : "";

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"/></head>
<body style="font-family: Arial, 'Tahoma', sans-serif; background:#f5f5f5; margin:0; padding:0;">
  <div style="max-width:600px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0D1B3E; padding:28px 32px;">
      <p style="color:#C9A84C; font-size:20px; margin:0; font-weight:bold;">دار نظم | Darnozom Consulting</p>
      <p style="color:#fff; font-size:13px; margin:6px 0 0;">إلغاء الطلب · Order Cancelled</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px; color:#0D1B3E;">مرحباً ${escapeHtml(params.customerName)}،</h2>
      <div style="border:1px solid #eee; border-right:4px solid #b02a37; padding:16px; background:#fafafa; margin:16px 0;">
        <p style="margin:0; color:#0D1B3E; font-size:16px; font-weight:bold;">${title}</p>
        <p style="margin:8px 0 0; color:#555; font-size:14px; line-height:1.7;">${explanation}</p>
        ${codeBlock}
      </div>
      <p style="margin:16px 0 20px; color:#333; font-size:14px; line-height:1.7;">
        إذا كنت لا تزال ترغب في الشراء، يمكنك إنشاء طلب جديد من المتجر في أي وقت. وإذا كان لديك أي استفسار يرجى التواصل معنا على
        <a href="mailto:info@darnozom.com" style="color:#0D1B3E;">info@darnozom.com</a>.
      </p>
      <p style="margin:16px 0;">
        <a href="${storeLink}" style="display:inline-block;background:#C9A84C;color:#0D1B3E;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;margin-inline-end:10px;">العودة إلى المتجر</a>
        <a href="${accountLink}" style="display:inline-block;background:#0D1B3E;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">عرض طلباتي</a>
      </p>
    </div>
    <div style="background:#f5f5f5; padding:16px 32px; text-align:center; color:#888; font-size:11px;">
      © Darnozom Consulting — darnozom.com
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: params.to,
    subject: isExpired
      ? `طلبك #${params.orderId} أُلغي تلقائياً — لم يكتمل الدفع | Darnozom Consulting`
      : `تعذّر إتمام الدفع لطلبك #${params.orderId} | Darnozom Consulting`,
    html,
  });
}

const ADMIN_SALES_EMAIL = "admin@darnozom.com";

type SaleStage = "in_progress" | "complete" | "failed";

const SALE_STAGE_LABELS: Record<SaleStage, { ar: string; en: string; color: string }> = {
  in_progress: { ar: "قيد المعالجة", en: "In Progress", color: "#C9A84C" },
  complete: { ar: "مكتملة", en: "Complete", color: "#1e7e34" },
  failed: { ar: "فشلت", en: "Failed", color: "#b02a37" },
};

// Notifies the store admin (admin@darnozom.com) of every sale event:
// a new order placed (in_progress), a captured payment (complete), or a
// payment failure (failed). Best-effort — callers must not treat failures
// as fatal.
export async function sendAdminSalesNotification(params: {
  orderId: number;
  stage: SaleStage;
  paymentMethod: "paypal" | "card" | "wallet" | "cash_on_delivery" | "vodafone_cash" | "instapay";
  customerName: string;
  customerEmail: string;
  phone: string;
  currency: string;
  totalAmount: string;
  items: { productTitle: string; quantity: number; format: "paper" | "digital" | null }[];
  city?: string | null;
  address?: string | null;
  reason?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const stage = SALE_STAGE_LABELS[params.stage];
  const payLabel =
    params.paymentMethod === "paypal"
      ? "PayPal"
      : params.paymentMethod === "card"
        ? "بطاقة ائتمان / خصم"
        : params.paymentMethod === "wallet"
          ? "محفظة إلكترونية (فودافون كاش / أورنج موني / اتصالات كاش)"
          : params.paymentMethod === "vodafone_cash"
            ? "فودافون كاش (تحويل يدوي)"
            : params.paymentMethod === "instapay"
              ? "إنستاباي (تحويل يدوي)"
              : "الدفع عند الاستلام (COD)";

  const itemRows = params.items
    .map((it) => {
      const fmt =
        it.format === "paper"
          ? "ورقية"
          : it.format === "digital"
            ? "رقمية"
            : "—";
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#333;font-size:13px;">${escapeHtml(it.productTitle)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#555;font-size:13px;text-align:center;">${fmt}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#555;font-size:13px;text-align:center;">${it.quantity}</td>
      </tr>`;
    })
    .join("");

  const shippingBlock =
    params.city || params.address
      ? `<div style="background:#f9f9f9; border:1px solid #e5e5e5; border-radius:6px; padding:16px; margin-bottom:20px;">
          <p style="margin:0 0 6px; color:#333; font-size:13px;"><strong>الشحن / Shipping:</strong></p>
          ${params.city ? `<p style="margin:0 0 4px; color:#555; font-size:13px;">المدينة: ${escapeHtml(params.city)}</p>` : ""}
          ${params.address ? `<p style="margin:0; color:#555; font-size:13px;">العنوان: ${escapeHtml(params.address)}</p>` : ""}
        </div>`
      : "";

  const reasonBlock = params.reason
    ? `<div style="background:#fdecea; border:1px solid #f5c2c7; border-radius:6px; padding:14px; margin-bottom:20px; color:#842029; font-size:13px; line-height:1.7;"><strong>السبب / Reason:</strong> ${escapeHtml(params.reason)}</div>`
    : "";

  const adminLink = `${PLATFORM_URL}/admin/orders`;

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"/></head>
<body style="font-family: Arial, 'Tahoma', sans-serif; background:#f5f5f5; margin:0; padding:0;">
  <div style="max-width:620px; margin:40px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0D1B3E; padding:28px 32px;">
      <p style="color:#C9A84C; font-size:20px; margin:0; font-weight:bold;">دار نظم | Darnozom Consulting</p>
      <p style="color:#fff; font-size:13px; margin:6px 0 0;">إشعار مبيعات · Sales Notification</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;">
        <span style="display:inline-block;background:${stage.color};color:#fff;font-size:13px;padding:4px 14px;border-radius:14px;font-weight:bold;">${stage.ar} · ${stage.en}</span>
      </p>
      <h2 style="margin:12px 0 16px; color:#0D1B3E; font-size:18px;">طلب رقم #${params.orderId}</h2>
      ${reasonBlock}
      <div style="background:#f9f9f9; border:1px solid #e5e5e5; border-radius:6px; padding:16px; margin-bottom:20px;">
        <p style="margin:0 0 6px; color:#333; font-size:13px;"><strong>العميل / Customer:</strong> ${escapeHtml(params.customerName)}</p>
        <p style="margin:0 0 6px; color:#333; font-size:13px;"><strong>البريد / Email:</strong> <a href="mailto:${escapeHtml(params.customerEmail)}" style="color:#0D1B3E;">${escapeHtml(params.customerEmail)}</a></p>
        <p style="margin:0 0 6px; color:#333; font-size:13px;"><strong>الهاتف / Phone:</strong> ${escapeHtml(params.phone)}</p>
        <p style="margin:0 0 6px; color:#333; font-size:13px;"><strong>طريقة الدفع / Payment:</strong> ${payLabel}</p>
        <p style="margin:0; color:#333; font-size:13px;"><strong>الإجمالي / Total:</strong> ${parseFloat(params.totalAmount || "0").toFixed(2)} ${escapeHtml(params.currency)}</p>
      </div>
      ${shippingBlock}
      <table style="width:100%; border-collapse:collapse; margin:8px 0 20px;">
        <thead>
          <tr>
            <th style="padding:8px;border-bottom:2px solid #0D1B3E;color:#0D1B3E;font-size:12px;text-align:right;">المنتج</th>
            <th style="padding:8px;border-bottom:2px solid #0D1B3E;color:#0D1B3E;font-size:12px;text-align:center;">النسخة</th>
            <th style="padding:8px;border-bottom:2px solid #0D1B3E;color:#0D1B3E;font-size:12px;text-align:center;">الكمية</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <a href="${adminLink}" style="display:inline-block;background:#0D1B3E;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;">فتح لوحة الطلبات</a>
    </div>
    <div style="background:#f5f5f5; padding:16px 32px; text-align:center; color:#888; font-size:11px;">
      © Darnozom Consulting — darnozom.com
    </div>
  </div>
</body></html>`;

  return sendEmail({
    to: ADMIN_SALES_EMAIL,
    subject: `[مبيعات · ${stage.en}] طلب #${params.orderId} — ${params.customerName}`,
    replyTo: params.customerEmail,
    html,
  });
}

export async function sendReportToClient(params: {
  clientEmail: string;
  clientName: string;
  reportId: number;
  reportTitle: string;
  executiveSummary: string;
  pdfBuffer: Buffer;
}): Promise<{ ok: boolean; error?: string }> {
  const platformLink = PLATFORM_URL;
  const pdfBase64 = params.pdfBuffer.toString("base64");

  return sendEmail({
    to: params.clientEmail,
    subject: `Your Consulting Report: ${params.reportTitle}`,
    html: sendToClientHtml({
      reportTitle: params.reportTitle,
      clientName: params.clientName,
      executiveSummary: params.executiveSummary,
      platformLink,
    }),
    attachments: [
      {
        filename: `darnozom-report-${params.reportId}.pdf`,
        content: pdfBase64,
        contentType: "application/pdf",
      },
    ],
  });
}
