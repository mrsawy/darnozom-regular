import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { clients, reports, reportAttachments, users } from "@workspace/db";
import { eq, desc, and, isNull } from "drizzle-orm";
import { openai } from "@workspace/ai-server";
import type { AuthRequest } from "../../middlewares/authMiddleware";
import { sendReportReadyNotification } from "../../lib/email";
import attachmentsRouter from "./attachments";

const router = Router();
router.use(attachmentsRouter);

const VALID_REPORT_TYPES = ["strategy", "governance", "sharia", "combined"] as const;
type ReportType = typeof VALID_REPORT_TYPES[number];

function validateGenerateReport(body: Record<string, unknown>): { valid: boolean; error?: string } {
  if (!body.clientId || typeof body.clientId !== "number") return { valid: false, error: "clientId is required" };
  if (!body.reportType || !VALID_REPORT_TYPES.includes(body.reportType as ReportType)) return { valid: false, error: "Invalid reportType" };
  if (!body.title || typeof body.title !== "string" || !body.title.trim()) return { valid: false, error: "title is required" };
  return { valid: true };
}

async function getAllKnowledgeContext(tenantId: number | null): Promise<string> {
  const where = tenantId != null ? eq(documentsTable.tenantId, tenantId) : isNull(documentsTable.tenantId);
  const docs = await db.select().from(documentsTable).where(where);
  const relevant = docs.filter(d => d.extractedText && d.extractedText.trim().length > 0);
  return relevant
    .map(d => `[${d.title} (${d.category})]\n${d.extractedText?.slice(0, 3000)}`)
    .join("\n\n---\n\n");
}

const reportTypeDescriptions: Record<string, string> = {
  strategy: "Strategic Consulting Report focused on business strategy, growth, competitive positioning, and organizational development",
  governance: "Governance Advisory Report covering corporate governance, risk management, compliance frameworks, and board effectiveness",
  sharia: "Sharia Compliance Report examining Islamic principles, Sharia-compliant structures, and religious governance in the context of business operations",
  combined: "Comprehensive Consulting Report integrating Strategy, Governance, and Sharia compliance perspectives into a unified advisory framework",
};

function tenantFilter(req: AuthRequest) {
  if (req.isSuperAdmin && !req.userTenantId) return null;
  return req.userTenantId ?? null;
}

router.get("/reports", async (req: AuthRequest, res) => {
  try {
    const tid = tenantFilter(req);

    if (req.userRole === "client") {
      if (!req.userClientId) {
        return res.json([]);
      }
      const clientReports = await db.select({
        report: reports,
        client: {
          name: clients.name,
          organization: clients.organization,
        },
      })
        .from(reports)
        .leftJoin(clients, eq(reports.clientId, clients.id))
        .where(
          tid != null
            ? and(eq(reports.clientId, req.userClientId), eq(clients.tenantId, tid))
            : eq(reports.clientId, req.userClientId)
        )
        .orderBy(desc(reports.createdAt));
      return res.json(clientReports.map(({ report, client }) => ({
        ...report,
        clientName: client?.name ?? "Unknown",
        clientOrganization: client?.organization ?? "",
      })));
    }

    const allReports = await db.select({
      report: reports,
      client: {
        name: clients.name,
        organization: clients.organization,
        tenantId: clients.tenantId,
      },
    })
      .from(reports)
      .leftJoin(clients, eq(reports.clientId, clients.id))
      .where(
        tid != null ? eq(clients.tenantId, tid) : isNull(clients.tenantId)
      )
      .orderBy(desc(reports.createdAt));

    return res.json(allReports.map(({ report, client }) => ({
      ...report,
      clientName: client?.name ?? "Unknown",
      clientOrganization: client?.organization ?? "",
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list reports" });
  }
});

router.post("/reports/generate", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const body = req.body as Record<string, unknown>;
    const check = validateGenerateReport(body);
    if (!check.valid) { res.status(400).json({ error: check.error }); return; }

    const clientId = body.clientId as number;
    const reportType = body.reportType as ReportType;
    const title = body.title as string;
    const additionalInstructions = typeof body.additionalInstructions === "string" ? body.additionalInstructions : undefined;
    const draftId = typeof body.draftId === "string" ? body.draftId : undefined;
    const intakeOverrides = (body.mappedIntake && typeof body.mappedIntake === "object")
      ? (body.mappedIntake as Record<string, unknown>)
      : undefined;
    const tid = tenantFilter(req);

    const clientWhere = tid != null
      ? and(eq(clients.id, clientId), eq(clients.tenantId, tid))
      : eq(clients.id, clientId);
    const [client] = await db.select().from(clients).where(clientWhere);
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    const knowledgeContext = await getAllKnowledgeContext(tid);
    const reportDescription = reportTypeDescriptions[reportType];

    let attachmentsForDraft: Array<typeof reportAttachments.$inferSelect> = [];
    if (draftId) {
      attachmentsForDraft = await db
        .select()
        .from(reportAttachments)
        .where(
          tid != null
            ? and(eq(reportAttachments.draftId, draftId), eq(reportAttachments.tenantId, tid))
            : and(eq(reportAttachments.draftId, draftId), isNull(reportAttachments.tenantId))
        );
    }

    const finalIntake = {
      name: (intakeOverrides?.name as string) ?? client.name,
      organization: (intakeOverrides?.organization as string) ?? client.organization,
      industry: (intakeOverrides?.industry as string) ?? client.industry,
      country: (intakeOverrides?.country as string) ?? client.country ?? "",
      size: (intakeOverrides?.size as string) ?? "",
      challenges: (intakeOverrides?.challenges as string) ?? client.challenges,
      goals: (intakeOverrides?.goals as string) ?? client.goals,
      context: (intakeOverrides?.context as string) ?? client.context ?? "",
    };

    const documentExcerpts = attachmentsForDraft
      .filter(a => a.extractedText && a.extractedText.trim().length > 0)
      .map(a => `--- FILE: ${a.fileName} ---\n${(a.extractedText ?? "").slice(0, 6000)}`)
      .join("\n\n")
      .slice(0, 25000);

    const sourceFileNames = attachmentsForDraft.map(a => a.fileName);

    const systemPrompt = `You are a senior consultant at Darnozom Consulting AI Platform, an elite advisory firm specializing in Strategy, Governance, and Sharia-compliant business systems.

Your role is to produce authoritative, structured consulting reports that blend rigorous analysis with practical recommendations grounded in the firm's proprietary knowledge base.

Report Type: ${reportDescription}

${knowledgeContext.length > 0 ? `FIRM KNOWLEDGE BASE (use this as your primary reference):\n${knowledgeContext.slice(0, 12000)}` : ""}

${documentExcerpts.length > 0 ? `CLIENT-PROVIDED DOCUMENTS (cite concrete numbers and themes from these where relevant):\n${documentExcerpts}` : ""}

Instructions:
- Write in a professional consulting tone
- Structure the report clearly with numbered sections
- Ground all recommendations in the knowledge base and the client-provided documents where applicable
- Be specific, actionable, and insightful — quote concrete figures or themes from the client's documents when possible
- Conclude with a prioritized recommendation roadmap
${sourceFileNames.length > 0 ? `- End with a "## Sources" section that lists each client document used: ${sourceFileNames.map(f => `"${f}"`).join(", ")}` : ""}`;

    const userPrompt = `Generate a professional consulting report with the following details:

CLIENT: ${finalIntake.name}
ORGANIZATION: ${finalIntake.organization}
INDUSTRY: ${finalIntake.industry}
${finalIntake.country ? `COUNTRY: ${finalIntake.country}` : ""}
${finalIntake.size ? `ORGANIZATION SIZE: ${finalIntake.size}` : ""}
REPORT TYPE: ${reportType.toUpperCase()}
REPORT TITLE: ${title}

CLIENT CHALLENGES:
${finalIntake.challenges}

CLIENT GOALS:
${finalIntake.goals}

${finalIntake.context ? `ADDITIONAL CLIENT CONTEXT:\n${finalIntake.context}` : ""}
${additionalInstructions ? `SPECIAL INSTRUCTIONS: ${additionalInstructions}` : ""}

Format the report as follows:

# ${title}

## Executive Summary
(3-4 paragraphs summarizing the situation, key findings, and top recommendations)

## 1. Current Situation Analysis
(Analysis of the client's challenges, environment, and baseline)

## 2. Key Findings
(Structured findings based on the analysis)

## 3. Strategic Recommendations
(Specific, prioritized recommendations with rationale)

## 4. Implementation Roadmap
(Phased action plan with timelines and responsibilities)

## 5. Risk Considerations
(Key risks and mitigation strategies)

## 6. Conclusion
(Summary and next steps)`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullContent = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 10000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const execSummaryMatch = fullContent.match(/## Executive Summary\n([\s\S]*?)(?=\n## )/);
    const executiveSummary = execSummaryMatch ? execSummaryMatch[1].trim().slice(0, 2000) : null;

    const [saved] = await db.insert(reports).values({
      clientId,
      title,
      reportType,
      content: fullContent,
      executiveSummary,
      mappedIntake: intakeOverrides ? (intakeOverrides as any) : null,
      draftId: draftId ?? null,
    }).returning();

    if (draftId) {
      try {
        await db
          .update(reportAttachments)
          .set({ reportId: saved.id })
          .where(eq(reportAttachments.draftId, draftId));
      } catch (linkErr) {
        req.log.warn({ err: linkErr }, "Failed to link draft attachments to report");
      }
    }

    const clerkId = req.clerkUserId;
    if (clerkId) {
      try {
        const [consultant] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
        if (consultant?.email) {
          void sendReportReadyNotification({
            consultantEmail: consultant.email,
            reportId: saved.id,
            reportTitle: title,
            clientName: client.name,
            reportType: reportTypeDescriptions[reportType] ?? reportType,
          });
        }
      } catch (notifyErr) {
        console.error("Report notification error:", notifyErr);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, reportId: saved.id, sourceFiles: sourceFileNames })}\n\n`);
    res.end();
    return;
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: "Failed to generate report" })}\n\n`);
    res.end();
    return;
  }
});

router.get("/reports/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    const [row] = await db.select({
      report: reports,
      client: {
        name: clients.name,
        organization: clients.organization,
        tenantId: clients.tenantId,
      },
    })
      .from(reports)
      .leftJoin(clients, eq(reports.clientId, clients.id))
      .where(eq(reports.id, id));

    if (!row) { res.status(404).json({ error: "Report not found" }); return; }

    if (req.userRole === "client" && row.report.clientId !== req.userClientId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (tid != null && row.client?.tenantId !== tid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      ...row.report,
      clientName: row.client?.name ?? "Unknown",
      clientOrganization: row.client?.organization ?? "",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get report" });
  }
});

router.delete("/reports/:id", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);

    const [row] = await db.select({
      report: reports,
      client: { tenantId: clients.tenantId },
    })
      .from(reports)
      .leftJoin(clients, eq(reports.clientId, clients.id))
      .where(eq(reports.id, id));

    if (!row) { res.status(404).json({ error: "Report not found" }); return; }
    if (tid != null && row.client?.tenantId !== tid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(reports).where(eq(reports.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete report" });
  }
});

export default router;
