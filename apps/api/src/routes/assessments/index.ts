import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { assessments, clients, users, proposals } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { openai } from "@workspace/ai-server";
import type { AuthRequest } from "../../middlewares/authMiddleware";
import { sendReportReadyNotification } from "../../lib/email";
import {
  frameworksCatalogForPrompt,
  parseSelectedFrameworks,
  selectedFrameworksSummary,
  specialistRigorBlock,
  stripFrameworksMarker,
  synthesisRigorBlock,
} from "../../lib/frameworks";

const router = Router();

type ServiceType = "management" | "sharia" | "digital" | "full";

interface AssessmentAnswers {
  serviceType: ServiceType;
  clientId?: number | null;
  general: {
    company: string;
    industry: string;
    employees: string;
    revenue: string;
    country: string;
  };
  management: {
    strategy: string;
    organization: string;
    performance: string;
    growth: string;
  };
  sharia: {
    financing: string;
    advisor: string;
    contracts: string;
    interest: string;
    disputes: string;
  };
  digital: {
    systems: string;
    manualProcesses: string;
    dataUse: string;
    automationGoals: string;
  };
  pain: {
    biggestProblem: string;
    oneFix: string;
    consequence: string;
  };
  priorities: string[];
}

async function getKnowledgeContext(tenantId: number | null): Promise<string> {
  const where = tenantId != null ? eq(documentsTable.tenantId, tenantId) : isNull(documentsTable.tenantId);
  const docs = await db.select().from(documentsTable).where(where);
  return docs
    .filter((d) => d.extractedText && d.extractedText.trim())
    .map((d) => `[${d.title} (${d.category})]\n${d.extractedText?.slice(0, 2000)}`)
    .join("\n\n---\n\n")
    .slice(0, 10000);
}

async function runAgentStreaming(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4000,
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

const SERVICE_LABELS: Record<ServiceType, string> = {
  management: "Management Consulting",
  sharia: "Sharia Compliance",
  digital: "Digital Transformation",
  full: "Full Integrated Assessment",
};

function buildClientContext(answers: AssessmentAnswers): string {
  const g = answers.general;
  return `Company: ${g.company}
Industry: ${g.industry}
Employees: ${g.employees}
Annual Revenue: ${g.revenue}
Country: ${g.country}`;
}

function buildAssessmentContext(answers: AssessmentAnswers): string {
  const g = answers.general;
  const m = answers.management;
  const sh = answers.sharia;
  const d = answers.digital;
  const p = answers.pain;
  const prio = answers.priorities;

  const serviceType = answers.serviceType;
  const runManagement = serviceType === "management" || serviceType === "full";
  const runSharia = serviceType === "sharia" || serviceType === "full";
  const runDigital = serviceType === "digital" || serviceType === "full";

  let context = `COMPANY: ${g.company} | INDUSTRY: ${g.industry} | EMPLOYEES: ${g.employees} | REVENUE: ${g.revenue} | COUNTRY: ${g.country}\n\n`;

  if (runManagement) {
    context += `MANAGEMENT & STRATEGY:
- Strategy clarity: ${m.strategy}
- Organizational structure: ${m.organization}
- Performance tracking: ${m.performance}
- Growth ambition: ${m.growth}\n\n`;
  }

  if (runSharia) {
    context += `SHARIA COMPLIANCE:
- Financing methods: ${sh.financing}
- Sharia advisor status: ${sh.advisor}
- Contract types: ${sh.contracts}
- Interest/riba exposure: ${sh.interest}
- Dispute resolution: ${sh.disputes}\n\n`;
  }

  if (runDigital) {
    context += `DIGITAL TRANSFORMATION:
- Core systems in use: ${d.systems}
- Manual processes: ${d.manualProcesses}
- Data utilization: ${d.dataUse}
- Automation goals: ${d.automationGoals}\n\n`;
  }

  context += `PAIN & PRIORITIES:
- Biggest problem: ${p.biggestProblem}
- Most urgent fix: ${p.oneFix}
- Consequence of inaction: ${p.consequence}
- Priority areas: ${prio.join(", ")}`;

  return context;
}

function tenantFilter(req: AuthRequest) {
  if (req.isSuperAdmin && !req.userTenantId) return null;
  return req.userTenantId ?? null;
}

router.post("/assessments", async (req: AuthRequest, res) => {
  let createdAssessmentId: number | null = null;
  try {
    const authReq = req as import("../../middlewares/authMiddleware").AuthRequest;
    const body = req.body as AssessmentAnswers & { clientId?: unknown };
    const answers = body;

    if (!answers || !answers.serviceType || !answers.general?.company) {
      res.status(400).json({ error: "Invalid assessment payload" });
      return;
    }

    const VALID_SERVICE_TYPES: ServiceType[] = ["management", "sharia", "digital", "full"];
    if (!VALID_SERVICE_TYPES.includes(answers.serviceType)) {
      res.status(400).json({ error: "Invalid serviceType" });
      return;
    }

    let validClientId: number | null = null;

    if (authReq.userRole === "client") {
      if (!authReq.userClientId) {
        res.status(403).json({ error: "No client record found for your account. Please contact support." });
        return;
      }
      validClientId = authReq.userClientId;
    } else {
      const rawClientId = body.clientId;
      const clientId = typeof rawClientId === "number" ? rawClientId : (typeof rawClientId === "string" && rawClientId ? parseInt(rawClientId, 10) : null);
      validClientId = clientId && !isNaN(clientId) ? clientId : null;
    }

    const tid = tenantFilter(req);

    let linkedClient: { id: number; name: string; organization: string; industry: string; country: string | null; challenges: string; goals: string; context: string | null } | null = null;
    if (validClientId) {
      const clientWhere = tid != null
        ? and(eq(clients.id, validClientId), eq(clients.tenantId, tid))
        : eq(clients.id, validClientId);
      const [found] = await db.select().from(clients).where(clientWhere);
      if (!found) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
      linkedClient = found;
    }

    const [assessment] = await db
      .insert(assessments)
      .values({
        tenantId: tid ?? undefined,
        clientId: validClientId,
        serviceType: answers.serviceType,
        answers: answers as unknown as Record<string, unknown>,
        status: "processing",
      })
      .returning();

    createdAssessmentId = assessment.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const emit = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    emit({ type: "created", assessmentId: assessment.id });

    const serviceType = answers.serviceType;
    const serviceLabel = SERVICE_LABELS[serviceType];
    const clientContext = linkedClient
      ? `Client: ${linkedClient.name}\nOrganization: ${linkedClient.organization}\nIndustry: ${linkedClient.industry}${linkedClient.country ? `\nCountry: ${linkedClient.country}` : ""}\nChallenges: ${linkedClient.challenges}\nGoals: ${linkedClient.goals}${linkedClient.context ? `\nContext: ${linkedClient.context}` : ""}`
      : buildClientContext(answers);
    const assessmentContext = buildAssessmentContext(answers);
    const knowledgeContext = await getKnowledgeContext(tid);
    const kbSection = knowledgeContext
      ? `\n\nFIRM KNOWLEDGE BASE (use as primary reference):\n${knowledgeContext}`
      : "";

    const runManagement = serviceType === "management" || serviceType === "full";
    const runSharia = serviceType === "sharia" || serviceType === "full";
    const runDigital = serviceType === "digital" || serviceType === "full";

    emit({ type: "agent_start", agent: "ceo" });
    let ceoOut = "";
    await runAgentStreaming(
      `You are the CEO Orchestrator AI for Darnozom Consulting — a senior executive intelligence that sets the strategic context for all specialist domain agents AND selects the named consulting frameworks the specialists must apply.${kbSection}

CONSULTING FRAMEWORKS LIBRARY (select 2-3 best-fit; ALWAYS include "mece_issue_tree"):
${frameworksCatalogForPrompt()}`,
      `CLIENT ASSESSMENT:\n${assessmentContext}\n\nSELECTED SERVICE: ${serviceLabel}\n\nProduce TWO things:\n\n1) A structured orchestration brief (2-3 paragraphs) covering core challenge, critical dimensions, and priority scope.\n\n2) On its OWN line at the end, emit:\nFRAMEWORKS_JSON:[{"id":"<framework_id>","why":"<1 sentence>"}, ...]\n(2-3 items; always include "mece_issue_tree".)`,
      (chunk) => {
        ceoOut += chunk;
        emit({ type: "agent_content", agent: "ceo", content: chunk });
      },
    );

    const selectedFrameworks = parseSelectedFrameworks(ceoOut);
    const ceoOutClean = stripFrameworksMarker(ceoOut);
    const frameworksSummary = selectedFrameworksSummary(selectedFrameworks);
    const rigorBlock = specialistRigorBlock(selectedFrameworks);

    emit({ type: "frameworks", agent: "ceo", frameworks: selectedFrameworks });
    emit({ type: "agent_done", agent: "ceo" });

    const sharedSpecialistContext = `CLIENT:\n${clientContext}\n\nASSESSMENT ANSWERS:\n${assessmentContext}\n\nCEO CONTEXT:\n${ceoOutClean}\n\nFRAMEWORKS THE CEO ASSIGNED YOU (apply each by name):\n${frameworksSummary}\n\n${rigorBlock}`;

    let managementOut = "";
    if (runManagement) {
      emit({ type: "agent_start", agent: "management" });
      await runAgentStreaming(
        `You are the Management Consulting Agent at Darnozom Consulting. You specialize in Strategy & Growth, Organization Design, and Performance & Operations. You ALWAYS work hypothesis-first with a MECE issue tree, apply named frameworks explicitly, and quantify every recommendation.${kbSection}`,
        `${sharedSpecialistContext}\n\nProduce the analysis using the mandatory section structure (## MECE Issue Tree, ## Framework Application, ## Findings & Hypotheses Tested, ## Quantified Recommendations) and inside Findings cover:\n- Strategy & Growth\n- Organization Design\n- Performance & Operations\n- Key Issues Identified\n- Improvement Opportunities (with quantified expected impact)`,
        (chunk) => {
          managementOut += chunk;
          emit({ type: "agent_content", agent: "management", content: chunk });
        },
      );
      emit({ type: "agent_done", agent: "management" });
    }

    let shariaOut = "";
    if (runSharia) {
      emit({ type: "agent_start", agent: "sharia" });
      await runAgentStreaming(
        `You are the Sharia Compliance Agent at Darnozom Consulting. You specialize in Governance & Compliance, Islamic Financial Systems, and Legal & Contracts. You ALWAYS work hypothesis-first with a MECE issue tree, apply named frameworks explicitly, and quantify financial / risk impact.${kbSection}`,
        `${sharedSpecialistContext}\n\nProduce the analysis using the mandatory section structure (## MECE Issue Tree, ## Framework Application, ## Findings & Hypotheses Tested, ## Quantified Recommendations) and inside Findings cover:\n- Governance & Compliance Assessment\n- Islamic Financial Systems Review (quantify riba exposure / restructuring cost)\n- Legal & Contracts Analysis\n- Risk Flags (severity + estimated impact)\n- Halal Alternatives & Recommendations`,
        (chunk) => {
          shariaOut += chunk;
          emit({ type: "agent_content", agent: "sharia", content: chunk });
        },
      );
      emit({ type: "agent_done", agent: "sharia" });
    }

    let digitalOut = "";
    if (runDigital) {
      emit({ type: "agent_start", agent: "digital" });
      await runAgentStreaming(
        `You are the Digital Transformation Agent at Darnozom Consulting. You specialize in Digital Maturity, Transformation Strategy, and Systems & Data. You ALWAYS work hypothesis-first with a MECE issue tree, apply named frameworks explicitly, and quantify ROI / automation savings.${kbSection}`,
        `${sharedSpecialistContext}\n\nProduce the analysis using the mandatory section structure (## MECE Issue Tree, ## Framework Application, ## Findings & Hypotheses Tested, ## Quantified Recommendations) and inside Findings cover:\n- Digital Maturity Assessment (1-5 score per capability)\n- Transformation Strategy (3-horizon roadmap)\n- Systems & Data Architecture\n- Key Issues Identified\n- Improvement Opportunities (each with quantified efficiency / cost / revenue impact)`,
        (chunk) => {
          digitalOut += chunk;
          emit({ type: "agent_content", agent: "digital", content: chunk });
        },
      );
      emit({ type: "agent_done", agent: "digital" });
    }

    // ── QUANT MODELING SUB-STEP ──────────────────────────────────────────────
    emit({ type: "agent_start", agent: "quant" });
    const quantSummaries: string[] = [];
    if (runManagement && managementOut) quantSummaries.push(`MANAGEMENT:\n${managementOut.slice(0, 4000)}`);
    if (runSharia && shariaOut) quantSummaries.push(`SHARIA:\n${shariaOut.slice(0, 4000)}`);
    if (runDigital && digitalOut) quantSummaries.push(`DIGITAL:\n${digitalOut.slice(0, 4000)}`);

    let quantOut = "";
    await runAgentStreaming(
      `You are the Quantitative Modeling agent at Darnozom Consulting. You translate qualitative findings into defensible CFO-grade numbers: market sizing, ROI/NPV/payback, cost-benefit and 3-scenario sensitivity tables. Always state assumptions; never write "TBD".${kbSection}`,
      `CLIENT:\n${clientContext}\n\nASSESSMENT ANSWERS:\n${assessmentContext}\n\nSPECIALIST FINDINGS:\n${quantSummaries.join("\n\n")}\n\nProduce a Quantitative Analysis using EXACTLY these markdown subsections and tables:\n\n### Market Sizing (TAM / SAM / SOM)\nTable columns: Layer | Definition | Estimate | Method | Key Assumption.\n\n### ROI, Payback & NPV — Top Recommendations\nTable columns: Recommendation | Investment ($) | Annual Benefit ($) | Payback (months) | 3-yr NPV @ 10% ($) | ROI (%). Top 2-3 only.\n\n### Cost-Benefit Summary\nTable columns: Item | Cost ($) | Benefit ($) | Net ($).\n\n### Sensitivity / Scenario Analysis\nTable columns: Scenario | Key Driver Change | Revenue Impact ($) | Cost Impact ($) | Net Value ($). Rows = Best / Base / Worst Case.\n\nClose with a 2-sentence interpretation of which assumption matters most.`,
      (chunk) => {
        quantOut += chunk;
        emit({ type: "agent_content", agent: "quant", content: chunk });
      },
    );
    emit({ type: "agent_done", agent: "quant" });

    emit({ type: "agent_start", agent: "report" });

    const activeAgentOutputs: string[] = [];
    if (runManagement && managementOut) activeAgentOutputs.push(`=== MANAGEMENT CONSULTING ANALYSIS ===\n${managementOut}`);
    if (runSharia && shariaOut) activeAgentOutputs.push(`=== SHARIA COMPLIANCE ANALYSIS ===\n${shariaOut}`);
    if (runDigital && digitalOut) activeAgentOutputs.push(`=== DIGITAL TRANSFORMATION ANALYSIS ===\n${digitalOut}`);

    const reportPrompt = `You are the CEO Orchestrator AI for Darnozom Consulting. Synthesize the domain agent outputs and the quantitative model into a McKinsey-grade executive report following the Pyramid Principle and SCQA narrative structure.

CLIENT ASSESSMENT:\n${assessmentContext}
SELECTED SERVICE: ${serviceLabel}

CEO ORCHESTRATION BRIEF:\n${ceoOutClean}

FRAMEWORKS THE SPECIALISTS APPLIED (use these EXACT names in the Strategic Framework Analysis section):\n${frameworksSummary}

DOMAIN AGENT OUTPUTS:\n${activeAgentOutputs.join("\n\n")}

QUANTITATIVE MODEL (incorporate the tables verbatim into the Quantitative Analysis section):\n${quantOut}

${synthesisRigorBlock(selectedFrameworks)}

Generate a structured executive report using EXACTLY these sections in this order:

## Executive Summary
(Pyramid Principle + SCQA. Open with 1 governing recommendation in a single assertive sentence, then the 3 supporting key-line arguments. Then a 2-paragraph SCQA narrative: Situation, Complication, Question, Answer.)

## Score Dashboard
Provide scores out of 100 for each dimension in EXACTLY this JSON format on a single line:
SCORES_JSON:{"strategy":XX,"governance":XX,"compliance":XX,"digital":XX}

## Strategic Framework Analysis
(Required. For EACH selected framework write a labeled subsection ### Framework: <Name> with how it was applied, key insight, strategic implication.)

## Quantitative Analysis
(Required. Embed the TAM/SAM/SOM, ROI/NPV/Payback, Cost-Benefit, and Best/Base/Worst Sensitivity tables from the quantitative model. Add 2-3 sentences of interpretation.)

## Management & Strategy Insights
**Problem:** (key issue identified)
**Analysis:** (root cause and context)
**Recommendation:** (specific, actionable recommendation)

## Sharia Compliance Insights
**Problem:** (key issue identified)
**Analysis:** (root cause and context)
**Recommendation:** (specific, actionable recommendation)

## Digital Transformation Insights
**Problem:** (key issue identified)
**Analysis:** (root cause and context)
**Recommendation:** (specific, actionable recommendation)

## 30-Day Action Plan
(3–5 immediate quick wins and actions)

## 60-Day Action Plan
(3–5 medium-term initiatives)

## 90-Day Action Plan
(3–5 strategic milestones)

Note: Include all sections even for single-domain assessments — mark non-applicable domains as "Not in scope for this assessment."`;

    let synthesisOut = "";
    await runAgentStreaming(
      `You are the CEO Orchestrator AI for Darnozom Consulting — the final synthesis intelligence that produces executive-grade strategic reports.${kbSection}`,
      reportPrompt,
      (chunk) => {
        synthesisOut += chunk;
        emit({ type: "agent_content", agent: "report", content: chunk });
      },
    );

    const scoresMatch = synthesisOut.match(/SCORES_JSON:\s*(\{[^}]+\})/);
    let scores: Record<string, number> | null = null;
    if (scoresMatch) {
      try {
        scores = JSON.parse(scoresMatch[1]);
      } catch {
        scores = null;
      }
    }

    const cleanedReport = synthesisOut.replace(/SCORES_JSON:\s*\{[^}]+\}\n?/g, "");

    const frameworksHeader = selectedFrameworks
      .map((f) => `- **${f.name}** — ${f.why}`)
      .join("\n");

    const fullReport = `# Darnozom Consulting Assessment Report

**Company:** ${answers.general.company}
**Industry:** ${answers.general.industry}
**Service:** ${serviceLabel}
**Generated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
**Frameworks Applied:**
${frameworksHeader}

---

${cleanedReport}

---

## Appendix: Quantitative Model (raw)

${quantOut}

---

*This report was generated by Darnozom Consulting AI Platform using a multi-agent assessment system with mandatory framework rigor and quantitative modeling.*`;

    const execSummary = cleanedReport.slice(0, 2000);

    await db
      .update(assessments)
      .set({
        reportContent: fullReport,
        executiveSummary: execSummary,
        scores: scores as unknown as Record<string, unknown>,
        status: "complete",
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, assessment.id));

    const consultantEmail = (req as AuthRequest).userEmail;
    if (consultantEmail) {
      try {
        const companyName = answers.general.company;
        void sendReportReadyNotification({
          consultantEmail,
          reportId: assessment.id,
          reportTitle: `${serviceLabel} Assessment — ${companyName}`,
          clientName: linkedClient?.name ?? companyName,
          reportType: serviceLabel,
          isAssessment: true,
        });
      } catch (notifyErr) {
        console.error("Assessment notification error:", notifyErr);
      }
    }

    emit({ type: "agent_done", agent: "report" });
    emit({ type: "complete", assessmentId: assessment.id });
    res.end();
  } catch (err) {
    console.error("Assessment error:", err);
    if (createdAssessmentId !== null) {
      try {
        await db
          .update(assessments)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(assessments.id, createdAssessmentId));
      } catch (dbErr) {
        console.error("Failed to mark assessment as failed:", dbErr);
      }
    }
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Assessment failed. Please try again." })}\n\n`);
      res.end();
    }
  }
});

router.get("/assessments", async (req: AuthRequest, res) => {
  try {
    const tid = tenantFilter(req);
    if (req.userRole === "client") {
      if (!req.userClientId) {
        res.json([]);
        return;
      }
      const where = tid != null
        ? and(eq(assessments.clientId, req.userClientId), eq(assessments.tenantId, tid))
        : eq(assessments.clientId, req.userClientId);
      const rows = await db
        .select()
        .from(assessments)
        .where(where)
        .orderBy(assessments.createdAt);
      res.json(rows);
      return;
    }
    const rows = tid != null
      ? await db.select().from(assessments).where(eq(assessments.tenantId, tid)).orderBy(assessments.createdAt)
      : await db.select().from(assessments).orderBy(assessments.createdAt);
    res.json(rows);
  } catch (err) {
    console.error("List assessments error:", err);
    res.status(500).json({ error: "Failed to list assessments" });
  }
});

router.get("/assessments/:id", async (req: AuthRequest, res) => {
  try {
    const authReq = req as import("../../middlewares/authMiddleware").AuthRequest;
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const tid = tenantFilter(req);
    const where = tid != null
      ? and(eq(assessments.id, id), eq(assessments.tenantId, tid))
      : eq(assessments.id, id);

    const [row] = await db
      .select()
      .from(assessments)
      .where(where);

    if (!row) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    if (authReq.userRole === "client") {
      if (!authReq.userClientId || row.clientId !== authReq.userClientId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    res.json(row);
  } catch (err) {
    console.error("Get assessment error:", err);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
});

router.post("/assessments/:id/proposals/generate", async (req: AuthRequest, res) => {
  if (req.userRole === "client") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const tid = tenantFilter(req);
    const where = tid != null
      ? and(eq(assessments.id, id), eq(assessments.tenantId, tid))
      : eq(assessments.id, id);

    const [assessment] = await db.select().from(assessments).where(where);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    if (assessment.status !== "complete") {
      res.status(400).json({ error: "Assessment must be complete before generating a proposal" });
      return;
    }

    const answers = assessment.answers as unknown as AssessmentAnswers;
    const scores = assessment.scores as Record<string, number> | null;
    const g = answers?.general ?? {};

    const scoresSummary = scores
      ? `Strategy: ${scores.strategy ?? "N/A"}/100 | Governance: ${scores.governance ?? "N/A"}/100 | Compliance: ${scores.compliance ?? "N/A"}/100 | Digital: ${scores.digital ?? "N/A"}/100`
      : "Scores not available";

    const serviceLabel = SERVICE_LABELS[answers.serviceType] ?? answers.serviceType;
    const kbContext = await getKnowledgeContext(tid);
    const kbSection = kbContext ? `\n\nFIRM KNOWLEDGE BASE:\n${kbContext}` : "";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const emit = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const proposalPrompt = `You are a senior consultant at Darnozom Consulting producing a formal engagement proposal based on a completed client assessment. Write in a professional, executive tone suitable for a business decision-maker.${kbSection}

ASSESSMENT DETAILS:
Company: ${g.company ?? "Unknown"}
Industry: ${g.industry ?? "Unknown"}
Employees: ${g.employees ?? "Unknown"}
Annual Revenue: ${g.revenue ?? "Unknown"}
Country: ${g.country ?? "Unknown"}
Service: ${serviceLabel}

ASSESSMENT SCORES:
${scoresSummary}

ASSESSMENT REPORT EXCERPT:
${(assessment.reportContent ?? "").slice(0, 4000)}

Generate a formal engagement proposal with EXACTLY these sections:

## Executive Summary
(2–3 paragraphs: describe the client's current situation, key findings from the assessment, and why engagement with Darnozom Consulting is the right step forward)

## Engagement Scope
(Describe which domains will be addressed: list the priority areas based on the lowest assessment scores and most critical findings. Be specific about what is included and what is not.)

## Recommended Services
(List 3–5 specific consulting services tailored to this client's needs. For each service, provide a brief description and why it is recommended based on the assessment findings.)

## Proposed Timeline
(Outline a phased engagement timeline: Phase 1 (Weeks 1–4), Phase 2 (Weeks 5–10), Phase 3 (Weeks 11–16). Describe key deliverables for each phase.)

## Estimated Fee Range
(Provide indicative fee ranges per phase and total. Note these are estimates subject to final scoping. Example format: Phase 1: $X,000–$Y,000 | Phase 2: $X,000–$Y,000 | Phase 3: $X,000–$Y,000 | Total Engagement: $X,000–$Y,000)

## Next Steps
(List 3–4 clear next steps: e.g., proposal review meeting, scope confirmation, engagement letter signing, kickoff)`;

    let fullContent = "";
    await runAgentStreaming(
      `You are a senior consultant at Darnozom Consulting. You produce compelling, professional engagement proposals grounded in assessment findings. Your proposals are concise, tailored, and action-oriented.`,
      proposalPrompt,
      (chunk) => {
        fullContent += chunk;
        emit({ type: "content", content: chunk });
      },
    );

    const [savedProposal] = await db
      .insert(proposals)
      .values({
        assessmentId: id,
        content: fullContent,
      })
      .returning();

    emit({ type: "done", proposalId: savedProposal.id });
    res.end();
  } catch (err) {
    console.error("Proposal generation error:", err);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to generate proposal" })}\n\n`);
      res.end();
    }
  }
});

router.get("/assessments/:id/proposals", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid assessment ID" });
      return;
    }

    const tid = tenantFilter(req);
    const where = tid != null
      ? and(eq(assessments.id, id), eq(assessments.tenantId, tid))
      : eq(assessments.id, id);
    const [assessment] = await db.select().from(assessments).where(where);

    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    const allProposals = await db.select().from(proposals).where(eq(proposals.assessmentId, id));

    if (req.userRole === "client") {
      res.json(allProposals.filter((p) => p.sharedWithClient));
      return;
    }

    res.json(allProposals);
  } catch (err) {
    console.error("Get proposals error:", err);
    res.status(500).json({ error: "Failed to fetch proposals" });
  }
});

router.get("/proposals/:proposalId", async (req: AuthRequest, res) => {
  try {
    const proposalId = parseInt(String(req.params.proposalId), 10);
    if (isNaN(proposalId)) {
      res.status(400).json({ error: "Invalid proposal ID" });
      return;
    }

    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    if (req.userRole === "client" && !proposal.sharedWithClient) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(proposal);
  } catch (err) {
    console.error("Get proposal error:", err);
    res.status(500).json({ error: "Failed to fetch proposal" });
  }
});

router.patch("/proposals/:proposalId", async (req: AuthRequest, res) => {
  if (req.userRole === "client") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const proposalId = parseInt(String(req.params.proposalId), 10);
    if (isNaN(proposalId)) {
      res.status(400).json({ error: "Invalid proposal ID" });
      return;
    }

    const body = req.body as { editedContent?: string; sharedWithClient?: boolean };
    const updateData: { editedContent?: string; sharedWithClient?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (typeof body.editedContent === "string") updateData.editedContent = body.editedContent;
    if (typeof body.sharedWithClient === "boolean") updateData.sharedWithClient = body.sharedWithClient;

    const [updated] = await db
      .update(proposals)
      .set(updateData)
      .where(eq(proposals.id, proposalId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("Update proposal error:", err);
    res.status(500).json({ error: "Failed to update proposal" });
  }
});

router.get("/proposals/:proposalId/pdf", async (req: AuthRequest, res) => {
  try {
    const proposalId = parseInt(String(req.params.proposalId), 10);
    if (isNaN(proposalId)) {
      res.status(400).json({ error: "Invalid proposal ID" });
      return;
    }

    const [proposal] = await db
      .select({ proposal: proposals, assessment: assessments })
      .from(proposals)
      .leftJoin(assessments, eq(proposals.assessmentId, assessments.id))
      .where(eq(proposals.id, proposalId));

    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }

    if (req.userRole === "client" && !proposal.proposal.sharedWithClient) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 55, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="darnozom-proposal-${proposalId}.pdf"`);
    doc.pipe(res);

    const NAVY = "#0D1B3E";
    const GOLD = "#C9A84C";
    const GREY = "#555555";
    const LIGHT = "#888888";

    const answers = proposal.assessment?.answers as unknown as AssessmentAnswers | null;
    const companyName = answers?.general?.company ?? "Client";
    const serviceLabel = answers?.serviceType ? (SERVICE_LABELS[answers.serviceType] ?? answers.serviceType) : "Consulting";

    doc.rect(0, 0, doc.page.width, 160).fill(NAVY);
    doc.fontSize(24).fillColor(GOLD).text("دار نظم | Darnozom Consulting", 55, 50, { align: "center" });
    doc.fontSize(11).fillColor("#ffffff").text("Engagement Proposal", { align: "center" });

    doc.moveDown(2);
    doc.fontSize(18).fillColor(NAVY).text(`${serviceLabel} Proposal`, { align: "center" });
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor(GREY).text(companyName, { align: "center" });
    doc.fontSize(10).fillColor(LIGHT).text(
      `Generated: ${new Date(proposal.proposal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      { align: "center" },
    );

    doc.moveDown(1.5);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).strokeColor(GOLD).lineWidth(1.5).stroke();
    doc.moveDown(1);

    const content = proposal.proposal.editedContent ?? proposal.proposal.content;
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
    doc.fontSize(8).fillColor(LIGHT).text(
      "© Darnozom Consulting AI Platform — Confidential & Proprietary",
      { align: "center" },
    );

    doc.end();
  } catch (err) {
    console.error("Proposal PDF error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "PDF generation failed" });
    }
  }
});

export default router;
