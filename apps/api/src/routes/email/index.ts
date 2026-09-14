import { Router } from "express";
import { db } from "@workspace/db";
import { clients, reports, assessments } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendReportToClient } from "../../lib/email/email";
import type { AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

router.post("/reports/:id/send-to-client", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const reportId = parseInt(String(req.params.id), 10);
    if (isNaN(reportId)) {
      res.status(400).json({ error: "Invalid report ID" });
      return;
    }

    const [row] = await db
      .select({ report: reports, client: clients })
      .from(reports)
      .leftJoin(clients, eq(reports.clientId, clients.id))
      .where(eq(reports.id, reportId));

    if (!row) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (!row.client) {
      res.status(400).json({ error: "Report has no associated client" });
      return;
    }

    if (!row.client.contactEmail) {
      res.status(400).json({ error: "Client has no email address on file. Please add a contact email to the client profile first." });
      return;
    }

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 55, size: "A4" });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

      const NAVY = "#0D1B3E";
      const GOLD = "#C9A84C";
      const GREY = "#555555";
      const LIGHT = "#888888";

      const content = row.report.content;
      const serviceMatch = content.match(/\*\*Selected Service:\*\*\s*(.+)/);
      const serviceLabel = serviceMatch ? serviceMatch[1].trim() : "AI Consulting Report";

      doc.rect(0, 0, doc.page.width, 160).fill(NAVY);
      doc.fontSize(24).fillColor(GOLD).text("دار نظم | Darnozom Consulting", 55, 50, { align: "center" });
      doc.fontSize(11).fillColor("#ffffff").text(serviceLabel, { align: "center" });

      doc.moveDown(2);
      doc.fontSize(18).fillColor(NAVY).text(row.report.title, { align: "center" });
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor(GREY).text(
        `${row.client?.name ?? ""} · ${row.client?.organization ?? ""}`,
        { align: "center" },
      );
      doc.fontSize(10).fillColor(LIGHT).text(
        `Generated: ${new Date(row.report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        { align: "center" },
      );

      doc.moveDown(1.5);
      doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
      doc.moveDown(1);

      const lines = content.split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (line.startsWith("# ")) {
          doc.moveDown(0.5);
          doc.fontSize(16).fillColor(NAVY).text(line.slice(2).trim());
          doc.moveDown(0.3);
        } else if (line.startsWith("## ")) {
          doc.moveDown(0.8);
          doc.fontSize(13).fillColor(GOLD).text(line.slice(3).trim());
          doc.moveTo(55, doc.y + 2).lineTo(540, doc.y + 2).strokeColor(GOLD).lineWidth(0.6).stroke();
          doc.moveDown(0.4);
        } else if (line.startsWith("### ")) {
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor(NAVY).text(line.slice(4).trim());
          doc.moveDown(0.2);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          const clean = line.slice(2).replace(/\*\*/g, "").replace(/\*/g, "");
          doc.fontSize(9).fillColor(GREY).text(`  •  ${clean}`, { indent: 10 });
        } else if (/^---+$/.test(line.trim())) {
          doc.moveDown(0.5);
          doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#dddddd").lineWidth(0.5).stroke();
          doc.moveDown(0.5);
        } else if (line.trim() === "") {
          doc.moveDown(0.25);
        } else if (line.startsWith("**") && line.endsWith("**")) {
          doc.fontSize(10).fillColor(NAVY).text(line.replace(/\*\*/g, "").trim(), { continued: false });
        } else {
          const clean = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "");
          if (clean.trim()) {
            doc.fontSize(10).fillColor(GREY).text(clean, { continued: false });
          }
        }
      }

      doc.moveDown(2);
      doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(0.8).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor(LIGHT).text("© Darnozom Consulting AI Platform — Confidential & Proprietary", { align: "center" });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    const result = await sendReportToClient({
      clientEmail: row.client.contactEmail,
      clientName: row.client.name,
      reportId,
      reportTitle: row.report.title,
      executiveSummary: row.report.executiveSummary ?? "",
      pdfBuffer,
    });

    if (!result.ok) {
      if (result.error === "Email service not configured") {
        res.status(503).json({ error: "Email service not configured. Please add a RESEND_API_KEY to enable email delivery." });
        return;
      }
      res.status(500).json({ error: result.error ?? "Failed to send email" });
      return;
    }

    res.json({ ok: true, sentTo: row.client.contactEmail });
  } catch (err) {
    console.error("Send to client error:", err);
    res.status(500).json({ error: "Failed to send report to client" });
  }
});

router.post("/assessments/:id/send-to-client", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const assessmentId = parseInt(String(req.params.id), 10);
    if (isNaN(assessmentId)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, assessmentId));
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    if (assessment.status !== "complete" || !assessment.reportContent) {
      res.status(400).json({ error: "Assessment report is not ready yet" });
      return;
    }

    if (!assessment.clientId) {
      res.status(400).json({ error: "This assessment is not linked to a client. Link a client first to send the report." });
      return;
    }

    const [client] = await db.select().from(clients).where(eq(clients.id, assessment.clientId));
    if (!client) {
      res.status(404).json({ error: "Associated client not found" });
      return;
    }

    if (!client.contactEmail) {
      res.status(400).json({ error: "Client has no email address on file. Please add a contact email to the client profile first." });
      return;
    }

    const answers = (assessment.answers ?? {}) as Record<string, unknown>;
    const general = (answers.general ?? {}) as Record<string, string>;
    const serviceType = assessment.serviceType ?? "full";
    const SERVICE_LABELS: Record<string, string> = {
      management: "Management Consulting",
      sharia: "Sharia Compliance",
      digital: "Digital Transformation",
      full: "Full Integrated Assessment",
    };
    const reportTitle = `${SERVICE_LABELS[serviceType] ?? serviceType} Assessment — ${general.company ?? client.name}`;

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 55, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);

      const NAVY = "#0D1B3E";
      const GOLD = "#C9A84C";
      const GREY = "#555555";
      const LIGHT = "#888888";

      doc.rect(0, 0, doc.page.width, 160).fill(NAVY);
      doc.fontSize(24).fillColor(GOLD).text("دار نظم | Darnozom Consulting", 55, 50, { align: "center" });
      doc.fontSize(11).fillColor("#ffffff").text(SERVICE_LABELS[serviceType] ?? serviceType, { align: "center" });

      doc.moveDown(2);
      doc.fontSize(18).fillColor(NAVY).text(reportTitle, { align: "center" });
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor(GREY).text(`${client.name} · ${client.organization}`, { align: "center" });
      doc.fontSize(10).fillColor(LIGHT).text(
        `Generated: ${new Date(assessment.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        { align: "center" },
      );

      doc.moveDown(1.5);
      doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
      doc.moveDown(1);

      const content = assessment.reportContent!;
      const lines = content.split("\n");
      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (line.startsWith("# ")) {
          doc.moveDown(0.5);
          doc.fontSize(16).fillColor(NAVY).text(line.slice(2).trim());
          doc.moveDown(0.3);
        } else if (line.startsWith("## ")) {
          doc.moveDown(0.8);
          doc.fontSize(13).fillColor(GOLD).text(line.slice(3).trim());
          doc.moveTo(55, doc.y + 2).lineTo(540, doc.y + 2).strokeColor(GOLD).lineWidth(0.6).stroke();
          doc.moveDown(0.4);
        } else if (line.startsWith("### ")) {
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor(NAVY).text(line.slice(4).trim());
          doc.moveDown(0.2);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          const clean = line.slice(2).replace(/\*\*/g, "").replace(/\*/g, "");
          doc.fontSize(9).fillColor(GREY).text(`  •  ${clean}`, { indent: 10 });
        } else if (/^---+$/.test(line.trim())) {
          doc.moveDown(0.5);
          doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor("#dddddd").lineWidth(0.5).stroke();
          doc.moveDown(0.5);
        } else if (line.trim() === "") {
          doc.moveDown(0.25);
        } else if (line.startsWith("**") && line.endsWith("**")) {
          doc.fontSize(10).fillColor(NAVY).text(line.replace(/\*\*/g, "").trim(), { continued: false });
        } else {
          const clean = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "");
          if (clean.trim()) {
            doc.fontSize(10).fillColor(GREY).text(clean, { continued: false });
          }
        }
      }

      doc.moveDown(2);
      doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(0.8).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor(LIGHT).text("© Darnozom Consulting AI Platform — Confidential & Proprietary", { align: "center" });
      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    const result = await sendReportToClient({
      clientEmail: client.contactEmail,
      clientName: client.name,
      reportId: assessmentId,
      reportTitle,
      executiveSummary: assessment.executiveSummary ?? "",
      pdfBuffer,
    });

    if (!result.ok) {
      if (result.error === "Email service not configured") {
        res.status(503).json({ error: "Email service not configured. Please add a RESEND_API_KEY to enable email delivery." });
        return;
      }
      res.status(500).json({ error: result.error ?? "Failed to send email" });
      return;
    }

    res.json({ ok: true, sentTo: client.contactEmail });
  } catch (err) {
    console.error("Assessment send to client error:", err);
    res.status(500).json({ error: "Failed to send assessment report to client" });
  }
});

export default router;
