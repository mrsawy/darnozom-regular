import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { clients, reports, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/ai-server";
import type { AuthRequest } from "../../middlewares/authMiddleware";
import { sendReportReadyNotification } from "../../lib/email/email";
import {
  frameworksCatalogForPrompt,
  parseSelectedFrameworks,
  selectedFrameworksSummary,
  specialistRigorBlock,
  stripFrameworksMarker,
  synthesisRigorBlock,
} from "../../lib/frameworks";

const router = Router();

async function runAgentStreaming(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
  maxTokens = 3000,
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      full += delta;
      onChunk(delta);
    }
  }
  return full;
}

async function getKnowledgeContext(): Promise<string> {
  const docs = await db.select().from(documentsTable);
  return docs
    .filter((d) => d.extractedText && d.extractedText.trim())
    .map((d) => `[${d.title} (${d.category})]\n${d.extractedText?.slice(0, 2000)}`)
    .join("\n\n---\n\n")
    .slice(0, 10000);
}

const SERVICE_LABELS: Record<string, string> = {
  management: "Management Consulting",
  sharia: "Sharia Compliance",
  digital: "Digital Transformation",
  full: "Full Integrated Assessment",
};

router.post("/orchestrator/analyze", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const clientId = typeof body.clientId === "number" ? body.clientId : null;
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "AI Orchestrated Analysis";
    const rawServiceType = typeof body.serviceType === "string" ? body.serviceType : "full";
    const VALID_SERVICE_TYPES = ["management", "sharia", "digital", "full"] as const;
    type ServiceType = (typeof VALID_SERVICE_TYPES)[number];
    if (!VALID_SERVICE_TYPES.includes(rawServiceType as ServiceType)) {
      res.status(400).json({ error: `Invalid serviceType. Must be one of: ${VALID_SERVICE_TYPES.join(", ")}` });
      return;
    }
    const serviceType = rawServiceType as ServiceType;

    if (!query) {
      res.status(400).json({ error: "query is required" });
      return;
    }
    if (!clientId) {
      res.status(400).json({ error: "clientId is required" });
      return;
    }

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const emit = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const clientInfo = `Client: ${client.name}
Organization: ${client.organization}
Industry: ${client.industry}${client.country ? `\nCountry: ${client.country}` : ""}
Challenges: ${client.challenges}
Goals: ${client.goals}${client.context ? `\nContext: ${client.context}` : ""}`;

    const knowledgeContext = await getKnowledgeContext();
    const kbSection = knowledgeContext
      ? `\n\nFIRM KNOWLEDGE BASE (use as primary reference):\n${knowledgeContext}`
      : "";

    const serviceLabel = SERVICE_LABELS[serviceType] ?? "Full Integrated Assessment";

    const runManagement = serviceType === "management" || serviceType === "full";
    const runSharia = serviceType === "sharia" || serviceType === "full";
    const runDigital = serviceType === "digital" || serviceType === "full";

    // ── AGENT 1: CEO ORCHESTRATOR (sets scope + selects frameworks) ──────────
    emit({ agent: "ceo", type: "start" });
    let ceoOut = "";
    await runAgentStreaming(
      `You are the CEO Orchestrator AI for Darnozom Consulting — a senior executive intelligence that frames the engagement, selects the canonical strategy frameworks the specialists must apply, and orchestrates their work to a top-tier consulting standard.${kbSection}

CONSULTING FRAMEWORKS LIBRARY (you MUST select 2-3 best-fit frameworks from this list — at minimum include "mece_issue_tree" plus 1-2 of the most relevant strategic / org / financial / operations frameworks for the client's problem):
${frameworksCatalogForPrompt()}`,
      `CLIENT INFORMATION:\n${clientInfo}\n\nSELECTED SERVICE: ${serviceLabel}\n\nCLIENT QUERY:\n${query}\n\nProduce TWO things:\n\n1) A structured orchestration brief (3-4 paragraphs) that summarizes the core challenge, the consulting dimensions in scope, the priority order, and what each active specialist must focus on.\n\n2) On its OWN line at the very end, emit the selected frameworks in this exact JSON format (no prose around it):\nFRAMEWORKS_JSON:[{"id":"<framework_id>","why":"<why this framework fits this client in 1 sentence>"}, ...]\n\nRules:\n- Pick 2-3 frameworks total.\n- ALWAYS include "mece_issue_tree" as one of them.\n- Choose the others to give a balanced lens (e.g. one strategy + one ops / org / financial).`,
      (chunk) => {
        ceoOut += chunk;
        emit({ agent: "ceo", type: "content", content: chunk });
      },
    );

    const selectedFrameworks = parseSelectedFrameworks(ceoOut);
    const ceoOutClean = stripFrameworksMarker(ceoOut);
    const frameworksSummary = selectedFrameworksSummary(selectedFrameworks);
    const rigorBlock = specialistRigorBlock(selectedFrameworks);

    emit({
      agent: "ceo",
      type: "frameworks",
      frameworks: selectedFrameworks,
    });
    emit({ agent: "ceo", type: "done" });

    const sharedSpecialistContext = `CLIENT:\n${clientInfo}\n\nCEO ORCHESTRATOR CONTEXT:\n${ceoOutClean}\n\nFRAMEWORKS THE CEO ASSIGNED YOU (you MUST apply each by name):\n${frameworksSummary}\n\nQUERY: ${query}\n\n${rigorBlock}`;

    // ── AGENT 2: MANAGEMENT CONSULTING AGENT ─────────────────────────────────
    let managementOut = "";
    if (runManagement) {
      emit({ agent: "management", type: "start" });
      await runAgentStreaming(
        `You are the Management Consulting Agent at Darnozom Consulting. You specialize in three focus areas: (1) Strategy & Growth — market analysis, competitive positioning, strategic planning, growth roadmaps; (2) Organization Design — org structure, governance design, talent strategy, operational efficiency; (3) Performance & Operations — KPI frameworks, process improvement, performance diagnostics, operational excellence. You ALWAYS work hypothesis-first using a MECE issue tree, apply named consulting frameworks explicitly, and quantify recommendations.${kbSection}`,
        `${sharedSpecialistContext}\n\nProduce a complete Management Consulting analysis. Use the mandatory section structure (## MECE Issue Tree, ## Framework Application, ## Findings & Hypotheses Tested, ## Quantified Recommendations) and additionally include the domain-specific subsections inside Findings & Quantified Recommendations:\n- Strategy & Growth\n- Organization Design\n- Performance & Operations\n- Key Issues Identified (top 3-5 with root cause)\n- Improvement Opportunities (with quantified expected impact)`,
        (chunk) => {
          managementOut += chunk;
          emit({ agent: "management", type: "content", content: chunk });
        },
      );
      emit({ agent: "management", type: "done" });
    }

    // ── AGENT 3: SHARIA COMPLIANCE AGENT ─────────────────────────────────────
    let shariaOut = "";
    if (runSharia) {
      emit({ agent: "sharia", type: "start" });
      await runAgentStreaming(
        `You are the Sharia Compliance Agent at Darnozom Consulting. You specialize in Governance & Compliance, Islamic Financial Systems (Murabaha, Ijara, Musharakah, Sukuk), and Legal & Contracts. You ALWAYS work hypothesis-first with a MECE issue tree, apply named consulting frameworks explicitly, and quantify the financial/risk impact of compliance gaps.${kbSection}`,
        `${sharedSpecialistContext}\n\nProduce a complete Sharia Compliance analysis. Use the mandatory section structure (## MECE Issue Tree, ## Framework Application, ## Findings & Hypotheses Tested, ## Quantified Recommendations) and inside Findings & Recommendations cover:\n- Governance & Compliance Assessment\n- Islamic Financial Systems Review (with quantified riba exposure / restructuring cost where possible)\n- Legal & Contracts Analysis\n- Risk Flags (severity + estimated financial / regulatory impact)\n- Halal Alternatives & Recommendations (with cost / payback estimates)`,
        (chunk) => {
          shariaOut += chunk;
          emit({ agent: "sharia", type: "content", content: chunk });
        },
      );
      emit({ agent: "sharia", type: "done" });
    }

    // ── AGENT 4: DIGITAL TRANSFORMATION AGENT ────────────────────────────────
    let digitalOut = "";
    if (runDigital) {
      emit({ agent: "digital", type: "start" });
      await runAgentStreaming(
        `You are the Digital Transformation Agent at Darnozom Consulting. You specialize in Digital Maturity Assessment, Transformation Strategy, and Systems & Data (architecture, governance, AI/automation). You ALWAYS work hypothesis-first with a MECE issue tree, apply named consulting frameworks explicitly, and quantify ROI / automation savings.${kbSection}`,
        `${sharedSpecialistContext}\n\nProduce a complete Digital Transformation analysis. Use the mandatory section structure (## MECE Issue Tree, ## Framework Application, ## Findings & Hypotheses Tested, ## Quantified Recommendations) and inside Findings & Recommendations cover:\n- Digital Maturity Assessment (score 1-5 per capability with justification)\n- Transformation Strategy (3-horizon roadmap)\n- Systems & Data Architecture\n- Key Issues Identified\n- Improvement Opportunities (each with quantified efficiency gain, cost saving, or revenue impact)`,
        (chunk) => {
          digitalOut += chunk;
          emit({ agent: "digital", type: "content", content: chunk });
        },
      );
      emit({ agent: "digital", type: "done" });
    }

    // ── QUANT MODELING SUB-STEP ──────────────────────────────────────────────
    emit({ agent: "quant", type: "start" });
    const activeAgentSummaries: string[] = [];
    if (runManagement && managementOut) activeAgentSummaries.push(`MANAGEMENT:\n${managementOut.slice(0, 4000)}`);
    if (runSharia && shariaOut) activeAgentSummaries.push(`SHARIA:\n${shariaOut.slice(0, 4000)}`);
    if (runDigital && digitalOut) activeAgentSummaries.push(`DIGITAL:\n${digitalOut.slice(0, 4000)}`);

    let quantOut = "";
    await runAgentStreaming(
      `You are the Quantitative Modeling agent at Darnozom Consulting. Your job is to convert qualitative specialist findings into defensible numbers a CFO would accept. You produce market sizing, ROI / NPV / payback, cost-benefit tables, and a 3-scenario sensitivity table. Estimates may be order-of-magnitude but you must always state assumptions explicitly. Never write "TBD" — produce a defensible number and label its assumption.${kbSection}`,
      `CLIENT:\n${clientInfo}\n\nQUERY: ${query}\n\nSPECIALIST FINDINGS (use these as the basis for your numbers):\n${activeAgentSummaries.join("\n\n")}\n\nProduce a Quantitative Analysis using EXACTLY these subsections and markdown tables:\n\n### Market Sizing (TAM / SAM / SOM)\nA markdown table with columns: Layer | Definition | Estimate | Method | Key Assumption.\n\n### ROI, Payback & NPV — Top Recommendations\nA markdown table with columns: Recommendation | Investment ($) | Annual Benefit ($) | Payback (months) | 3-yr NPV @ 10% ($) | ROI (%). Cover the top 2-3 recommendations only.\n\n### Cost-Benefit Summary\nA markdown table: Item | Cost ($) | Benefit ($) | Net ($).\n\n### Sensitivity / Scenario Analysis\nA markdown table: Scenario | Key Driver Change | Revenue Impact ($) | Cost Impact ($) | Net Value ($). Rows = Best Case, Base Case, Worst Case.\n\nClose with a 2-sentence interpretation of which assumption matters most.`,
      (chunk) => {
        quantOut += chunk;
        emit({ agent: "quant", type: "content", content: chunk });
      },
      2500,
    );
    emit({ agent: "quant", type: "done" });

    // ── AGENT 5: CEO SYNTHESIS — EXECUTIVE REPORT ────────────────────────────
    emit({ agent: "report", type: "start" });

    const activeAgentOutputs: string[] = [];
    if (runManagement && managementOut) {
      activeAgentOutputs.push(`=== MANAGEMENT CONSULTING ANALYSIS ===\n${managementOut}`);
    }
    if (runSharia && shariaOut) {
      activeAgentOutputs.push(`=== SHARIA COMPLIANCE ANALYSIS ===\n${shariaOut}`);
    }
    if (runDigital && digitalOut) {
      activeAgentOutputs.push(`=== DIGITAL TRANSFORMATION ANALYSIS ===\n${digitalOut}`);
    }

    const synthesisPrompt = `You are the CEO Orchestrator AI for Darnozom Consulting. Synthesize the domain agent outputs and the quantitative model into a McKinsey-grade executive report. Be concise, executive-level, action-oriented.

CLIENT:\n${clientInfo}
SELECTED SERVICE: ${serviceLabel}
ORIGINAL QUERY: ${query}

CEO ORCHESTRATION BRIEF:\n${ceoOutClean}

FRAMEWORKS THE SPECIALISTS APPLIED (use these EXACT names in the Strategic Framework Analysis section):\n${frameworksSummary}

DOMAIN AGENT OUTPUTS:\n${activeAgentOutputs.join("\n\n")}

QUANTITATIVE MODEL (incorporate the tables verbatim into the Quantitative Analysis section):\n${quantOut}

${synthesisRigorBlock(selectedFrameworks)}

Generate the final executive report using EXACTLY these section headers in this order:

## 1. Executive Summary
(Pyramid Principle + SCQA. Open with 1 governing recommendation in a single assertive sentence, then the 3 supporting key-line arguments. Then a 2-paragraph SCQA narrative: Situation, Complication, Question, Answer.)

## 2. Strategic Framework Analysis
(For EACH selected framework, a labeled subsection ### Framework: <Name> with how it was applied, key insight, strategic implication. Required.)

## 3. Quantitative Analysis
(Required. Embed the TAM/SAM/SOM table, ROI/NPV/Payback table, Cost-Benefit table, and Best/Base/Worst Sensitivity table from the quantitative model. Add 2-3 sentences of interpretation.)

## 4. Selected Service Analysis
(Brief overview of the consulting domain(s) engaged and methodology applied.)

## 5. Diagnostic Results
(Structured findings from all active specialists — current state assessment.)

## 6. Key Issues Identified
(Top 5-7 prioritized issues with severity and root cause.)

## 7. Improvement Opportunities
(Ranked opportunities with potential impact (numeric where possible) and feasibility.)

## 8. Strategic Recommendations
(5-8 specific, actionable recommendations with rationale and quantified expected impact.)

## 9. 30-90 Day Action Plan
(Concrete actions: 30-day quick wins, 60-day initiatives, 90-day milestones.)

## 10. Priority Ranking
(Ranked list of all recommendations by priority.)`;

    let synthesisOut = "";
    await runAgentStreaming(
      `You are the CEO Orchestrator AI for Darnozom Consulting — the final synthesis intelligence that produces executive-grade strategic reports following the Pyramid Principle and SCQA narrative structure.${kbSection}`,
      synthesisPrompt,
      (chunk) => {
        synthesisOut += chunk;
        emit({ agent: "report", type: "content", content: chunk });
      },
      4000,
    );

    const agentSections: string[] = [];
    if (runManagement && managementOut) {
      agentSections.push(`## Management Consulting Analysis\n\n${managementOut}`);
    }
    if (runSharia && shariaOut) {
      agentSections.push(`## Sharia Compliance Analysis\n\n${shariaOut}`);
    }
    if (runDigital && digitalOut) {
      agentSections.push(`## Digital Transformation Analysis\n\n${digitalOut}`);
    }

    const frameworksHeader = selectedFrameworks
      .map((f) => `- **${f.name}** — ${f.why}`)
      .join("\n");

    const combinedContent = `# ${title}

**Client:** ${client.name} | ${client.organization}
**Industry:** ${client.industry}
**Selected Service:** ${serviceLabel}
**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Type:** AI Multi-Agent Orchestration Report
**Frameworks Applied:**
${frameworksHeader}

---

${synthesisOut}

---

## Appendix: Domain Agent Outputs

${agentSections.join("\n\n---\n\n")}

---

## Appendix: Quantitative Model (raw)

${quantOut}

---

*This report was generated by Darnozom Consulting AI Platform using a multi-agent orchestration system with mandatory framework rigor and quantitative modeling. Service: ${serviceLabel}.*`;

    const execSummary = synthesisOut.slice(0, 2000);

    const [saved] = await db
      .insert(reports)
      .values({
        clientId,
        title,
        reportType: "combined",
        content: combinedContent,
        executiveSummary: execSummary,
      })
      .returning();

    const consultantEmail = (req as AuthRequest).userEmail;
    if (consultantEmail) {
      try {
        void sendReportReadyNotification({
          consultantEmail,
          reportId: saved.id,
          reportTitle: title,
          clientName: client.name,
          reportType: serviceLabel,
        });
      } catch (notifyErr) {
        console.error("Report notification error:", notifyErr);
      }
    }

    emit({ agent: "report", type: "done", reportId: saved.id });
    res.end();
  } catch (err) {
    console.error("Orchestrator error:", err);
    res.write(`data: ${JSON.stringify({ agent: "ceo", type: "error", error: "Analysis failed. Please try again." })}\n\n`);
    res.end();
  }
});

router.get("/orchestrator/report/:id/pdf", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid report ID" });
      return;
    }

    const [row] = await db
      .select({ report: reports, client: { name: clients.name, organization: clients.organization } })
      .from(reports)
      .leftJoin(clients, eq(reports.clientId, clients.id))
      .where(eq(reports.id, id));

    if (!row) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    if (req.userRole === "client") {
      if (!req.userClientId || row.report.clientId !== req.userClientId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 55, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="darnozom-report-${id}.pdf"`,
    );
    doc.pipe(res);

    const NAVY = "#0D1B3E";
    const GOLD = "#C9A84C";
    const GREY = "#555555";
    const LIGHT = "#888888";

    const content = row.report.content;
    const serviceMatch = content.match(/\*\*Selected Service:\*\*\s*(.+)/);
    const serviceLabel = serviceMatch ? serviceMatch[1].trim() : "AI Multi-Agent Consulting Report";

    // ── Cover page ────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 160).fill(NAVY);
    doc.fontSize(24).fillColor(GOLD).text("دار نظم | Darnozom Consulting", 55, 50, {
      align: "center",
    });
    doc.fontSize(11).fillColor("#ffffff").text(serviceLabel, {
      align: "center",
    });

    doc.moveDown(2);
    doc
      .fontSize(18)
      .fillColor(NAVY)
      .text(row.report.title, { align: "center" });
    doc.moveDown(0.6);
    doc
      .fontSize(10)
      .fillColor(GREY)
      .text(
        `${row.client?.name ?? ""} · ${row.client?.organization ?? ""}`,
        { align: "center" },
      );
    doc
      .fontSize(10)
      .fillColor(LIGHT)
      .text(
        `Generated: ${new Date(row.report.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "center" },
      );

    doc.moveDown(1.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
    doc.moveDown(1);

    // ── Content ───────────────────────────────────────────────────────────
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
      } else if (line.startsWith("|")) {
        // Render markdown table rows as monospaced lines so columns align in the PDF.
        const clean = line.replace(/\*\*/g, "").replace(/`/g, "");
        doc.font("Courier").fontSize(8).fillColor(GREY).text(clean);
        doc.font("Helvetica");
      } else if (/^---+$/.test(line.trim())) {
        doc.moveDown(0.5);
        doc
          .moveTo(55, doc.y)
          .lineTo(540, doc.y)
          .strokeColor("#dddddd")
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(0.5);
      } else if (line.trim() === "") {
        doc.moveDown(0.25);
      } else if (line.startsWith("**") && line.endsWith("**")) {
        doc
          .fontSize(10)
          .fillColor(NAVY)
          .text(line.replace(/\*\*/g, "").trim(), { continued: false });
      } else {
        const clean = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "");
        if (clean.trim()) {
          doc.fontSize(10).fillColor(GREY).text(clean, { continued: false });
        }
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(0.8).stroke();
    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .fillColor(LIGHT)
      .text(
        "© Darnozom Consulting AI Platform — Confidential & Proprietary",
        { align: "center" },
      );

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "PDF generation failed" });
    }
  }
});

export default router;
