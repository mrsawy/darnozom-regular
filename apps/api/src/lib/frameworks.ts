/**
 * Darnozom Consulting — Strategy Frameworks Library
 *
 * Canonical reference of named consulting frameworks the AI agents must
 * use to produce McKinsey/BCG/Bain-grade deliverables. Each framework
 * carries a short definition, when-to-use rules, a prompt template the
 * agents can drop directly into their analysis, and the consulting
 * domain it belongs to so the CEO orchestrator can pick a balanced set.
 */

export type FrameworkDomain =
  | "strategy"
  | "organization"
  | "financial"
  | "marketing"
  | "operations"
  | "innovation"
  | "governance";

export interface Framework {
  id: string;
  name: string;
  domain: FrameworkDomain;
  whenToUse: string;
  definition: string;
  promptTemplate: string;
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "porters_five_forces",
    name: "Porter's Five Forces",
    domain: "strategy",
    whenToUse:
      "Industry attractiveness, competitive intensity, market entry / exit decisions, pricing power analysis.",
    definition:
      "Analyzes industry competitiveness across five forces: rivalry, threat of new entrants, threat of substitutes, supplier power, buyer power.",
    promptTemplate:
      "Apply Porter's Five Forces to the client's industry. For EACH of the 5 forces (rivalry, new entrants, substitutes, supplier power, buyer power) state: (a) Strength rating Low/Medium/High with 1-line justification grounded in the client context; (b) the strategic implication for THIS client. End with a 2-3 sentence verdict on overall industry attractiveness and where the client should compete.",
  },
  {
    id: "bcg_matrix",
    name: "BCG Growth-Share Matrix",
    domain: "strategy",
    whenToUse:
      "Portfolio prioritization across products, business units or service lines; capital allocation.",
    definition:
      "Plots each business unit / product on relative market share (x) vs market growth (y) into Stars, Cash Cows, Question Marks, Dogs.",
    promptTemplate:
      "Use the BCG Growth-Share Matrix to classify the client's main products / service lines / business units. For each, state quadrant (Star / Cash Cow / Question Mark / Dog), the rationale (relative share + market growth), and the recommended action (invest, hold, harvest, divest).",
  },
  {
    id: "mckinsey_7s",
    name: "McKinsey 7S",
    domain: "organization",
    whenToUse:
      "Organization design, post-merger integration, culture & alignment diagnostics, change readiness.",
    definition:
      "Diagnoses organizational alignment across 7 elements: Strategy, Structure, Systems, Shared Values, Style, Staff, Skills.",
    promptTemplate:
      "Apply McKinsey 7S. For each of the 7 elements (Strategy, Structure, Systems, Shared Values, Style, Staff, Skills) describe the client's current state in 1-2 sentences and flag any misalignments between elements. End with the top 3 alignment gaps that must be closed.",
  },
  {
    id: "value_chain",
    name: "Porter's Value Chain",
    domain: "operations",
    whenToUse:
      "Cost optimization, operational excellence, identifying differentiation sources, outsourcing decisions.",
    definition:
      "Decomposes the firm into primary activities (inbound logistics, operations, outbound logistics, marketing & sales, service) and support activities (firm infrastructure, HR, technology, procurement) to find margin sources.",
    promptTemplate:
      "Map the client's value chain. For each primary activity (inbound, operations, outbound, marketing & sales, service) and support activity, identify (a) the main cost / value driver and (b) one specific improvement opportunity for THIS client.",
  },
  {
    id: "mece_issue_tree",
    name: "MECE Issue Tree",
    domain: "strategy",
    whenToUse:
      "Hypothesis-driven problem structuring before any recommendation. Required as the first step of every Specialist analysis.",
    definition:
      "Decomposes the client's core question into mutually exclusive, collectively exhaustive sub-issues, each with a testable hypothesis.",
    promptTemplate:
      "Build a MECE Issue Tree for the client problem. Level 1 = the single core question. Level 2 = 3-5 mutually exclusive, collectively exhaustive sub-issues. Level 3 (under each L2) = the testable hypothesis you will validate. Render as an indented bullet tree.",
  },
  {
    id: "swot",
    name: "SWOT Analysis",
    domain: "strategy",
    whenToUse:
      "Quick strategic posture diagnosis; pairs well with PESTEL for an external lens.",
    definition:
      "Categorizes Strengths, Weaknesses (internal), Opportunities, Threats (external) and links them into TOWS strategic options.",
    promptTemplate:
      "Run a SWOT for the client (3-5 items each), then translate it into 4 TOWS strategic options: SO (use strengths to capture opportunities), ST (use strengths to mitigate threats), WO (fix weaknesses to capture opportunities), WT (defensive moves).",
  },
  {
    id: "pestel",
    name: "PESTEL Analysis",
    domain: "strategy",
    whenToUse:
      "External environment scan, market entry, regulatory/macroeconomic risk assessment.",
    definition:
      "Scans the external environment across Political, Economic, Social, Technological, Environmental, Legal factors.",
    promptTemplate:
      "Apply PESTEL to the client's operating environment. For each of P, E, S, T, E, L state the 1-2 most material factors and the implication for the client (opportunity or risk).",
  },
  {
    id: "blue_ocean",
    name: "Blue Ocean Strategy (ERRC)",
    domain: "innovation",
    whenToUse:
      "Differentiation strategy, escaping commoditized markets, value innovation, new business model design.",
    definition:
      "Uses the Eliminate-Reduce-Raise-Create grid to make competition irrelevant by reconstructing market boundaries.",
    promptTemplate:
      "Apply Blue Ocean's ERRC grid. For the client's offering list factors to Eliminate, Reduce, Raise, and Create. Conclude with the differentiated value proposition that opens a blue ocean.",
  },
  {
    id: "jobs_to_be_done",
    name: "Jobs-to-be-Done (JTBD)",
    domain: "marketing",
    whenToUse:
      "Customer-centric innovation, product-market fit, segmentation by underlying job rather than demographics.",
    definition:
      "Identifies the functional, emotional, and social jobs customers hire a product / service to do.",
    promptTemplate:
      "Define the top 2-3 customer jobs the client serves. For each: functional job, emotional job, social job, current alternatives, and unmet outcomes the client could solve better.",
  },
  {
    id: "three_horizons",
    name: "Three Horizons of Growth",
    domain: "innovation",
    whenToUse:
      "Balancing core / adjacent / transformational growth bets; innovation portfolio.",
    definition:
      "H1 = defend & extend core; H2 = build emerging businesses; H3 = create viable options for the future.",
    promptTemplate:
      "Place the client's growth initiatives into Horizon 1 (core), Horizon 2 (emerging), Horizon 3 (transformational). Recommend the % of resource allocation across the 3 horizons and 1-2 specific bets per horizon.",
  },
  {
    id: "ansoff",
    name: "Ansoff Growth Matrix",
    domain: "strategy",
    whenToUse:
      "Choosing among market penetration, market development, product development, diversification.",
    definition:
      "2x2 of existing/new markets vs existing/new products yielding 4 growth strategies of escalating risk.",
    promptTemplate:
      "Plot the client's growth options on the Ansoff matrix (penetration / market development / product development / diversification). Recommend which quadrant to prioritize and 2 concrete moves within it.",
  },
  {
    id: "vrio",
    name: "VRIO Resource Analysis",
    domain: "strategy",
    whenToUse:
      "Identifying sources of sustainable competitive advantage; capability assessment.",
    definition:
      "Tests each resource on Valuable, Rare, Inimitable, Organized — only resources scoring on all four yield sustained advantage.",
    promptTemplate:
      "List the client's 4-6 most important resources / capabilities and run each through VRIO (V/R/I/O = Yes/No). Conclude which resource is the true source of sustained competitive advantage.",
  },
  {
    id: "balanced_scorecard",
    name: "Balanced Scorecard",
    domain: "operations",
    whenToUse:
      "Translating strategy into KPIs across 4 perspectives; performance management system design.",
    definition:
      "Tracks Financial, Customer, Internal Process, and Learning & Growth KPIs to balance leading and lagging indicators.",
    promptTemplate:
      "Design a Balanced Scorecard for the client with 2-3 KPIs per perspective (Financial, Customer, Internal Process, Learning & Growth). For each KPI give a target and frequency.",
  },
];

export const FRAMEWORKS_BY_ID: Record<string, Framework> = Object.fromEntries(
  FRAMEWORKS.map((f) => [f.id, f]),
);

/**
 * Compact catalog the CEO orchestrator gets injected into its prompt so it
 * can pick the 2-3 best-fit frameworks without re-listing every detail.
 */
export function frameworksCatalogForPrompt(): string {
  return FRAMEWORKS.map(
    (f) =>
      `- ${f.id} | ${f.name} (${f.domain}) — when to use: ${f.whenToUse}`,
  ).join("\n");
}

/**
 * Produces the prompt block specialist agents receive: each selected
 * framework with its definition AND its application template so the
 * agent must explicitly apply it.
 */
export function frameworksApplicationBlock(ids: string[]): string {
  const found = ids
    .map((id) => FRAMEWORKS_BY_ID[id])
    .filter((f): f is Framework => Boolean(f));
  if (found.length === 0) return "";
  return found
    .map(
      (f) =>
        `### Framework: ${f.name}\nDefinition: ${f.definition}\nApplication instructions: ${f.promptTemplate}`,
    )
    .join("\n\n");
}

export interface SelectedFramework {
  id: string;
  name: string;
  why: string;
}

/**
 * Robustly extract the FRAMEWORKS_JSON marker the CEO emits. Falls back to
 * a sensible default mix so downstream agents never receive an empty list.
 */
export function parseSelectedFrameworks(text: string): SelectedFramework[] {
  const match = text.match(/FRAMEWORKS_JSON:\s*(\[[\s\S]*?\])/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]) as Array<{
        id?: string;
        name?: string;
        why?: string;
      }>;
      const cleaned = parsed
        .map((p) => {
          const id = typeof p.id === "string" ? p.id : "";
          const fw = FRAMEWORKS_BY_ID[id];
          if (!fw) return null;
          return {
            id: fw.id,
            name: fw.name,
            why: typeof p.why === "string" && p.why ? p.why : fw.whenToUse,
          };
        })
        .filter((f): f is SelectedFramework => f !== null);
      if (cleaned.length > 0) {
        // Hard-enforce MECE Issue Tree as a baseline framework regardless
        // of model output, since the entire downstream synthesis assumes it.
        if (!cleaned.some((f) => f.id === "mece_issue_tree")) {
          cleaned.unshift({
            id: "mece_issue_tree",
            name: FRAMEWORKS_BY_ID["mece_issue_tree"].name,
            why: "Required baseline: structure the problem MECE before recommending.",
          });
        }
        return cleaned.slice(0, 3);
      }
    } catch {
      // fall through to default
    }
  }
  // Default fallback: a balanced strategy + ops + org trio
  return [
    {
      id: "mece_issue_tree",
      name: FRAMEWORKS_BY_ID["mece_issue_tree"].name,
      why: "Required to structure the problem before recommending.",
    },
    {
      id: "porters_five_forces",
      name: FRAMEWORKS_BY_ID["porters_five_forces"].name,
      why: "Diagnose industry attractiveness and competitive position.",
    },
    {
      id: "swot",
      name: FRAMEWORKS_BY_ID["swot"].name,
      why: "Translate diagnosis into actionable strategic options.",
    },
  ];
}

export function stripFrameworksMarker(text: string): string {
  return text.replace(/FRAMEWORKS_JSON:\s*\[[\s\S]*?\]\s*/g, "").trim();
}

export function selectedFrameworksSummary(frameworks: SelectedFramework[]): string {
  return frameworks
    .map((f, i) => `${i + 1}. ${f.name} — ${f.why}`)
    .join("\n");
}

/**
 * Standardized instruction block injected into every Specialist prompt to
 * enforce hypothesis-driven, framework-rigorous, quantified output.
 */
export function specialistRigorBlock(frameworks: SelectedFramework[]): string {
  const apply = frameworksApplicationBlock(frameworks.map((f) => f.id));
  return `MANDATORY ANALYTICAL RIGOR (top-tier consulting standard):

STEP 1 — MECE Issue Tree (required before any recommendation):
Decompose the client problem into a mutually exclusive, collectively exhaustive issue tree. Render as an indented bullet tree with the testable hypothesis under each leaf.

STEP 2 — Apply the assigned frameworks explicitly. Use these EXACT named frameworks selected by the CEO Orchestrator and label each application with its framework name as a heading:

${apply}

STEP 3 — Quantitative grounding. Every recommendation MUST include a numeric estimate with the assumption stated, e.g. "≈ 12-18% revenue uplift over 24 months (assumes 3% market growth + 5pp share gain at current ASP)". Where useful provide order-of-magnitude estimates rather than refusing.

OUTPUT STRUCTURE (use these section headers verbatim):
## MECE Issue Tree
## Framework Application
## Findings & Hypotheses Tested
## Quantified Recommendations`;
}

/**
 * Synthesis instruction block that enforces Pyramid Principle + SCQA in
 * the executive summary and adds the two new mandatory report sections.
 */
export function synthesisRigorBlock(frameworks: SelectedFramework[]): string {
  const list = frameworks
    .map((f, i) => `(${i + 1}) ${f.name}`)
    .join(", ");
  return `NARRATIVE STRUCTURE — MANDATORY:

The Executive Summary MUST follow the Pyramid Principle (governing thought first, then 3 supporting key-line arguments, then evidence) and the SCQA narrative arc:
- S (Situation): the client's stable starting context.
- C (Complication): what changed or what is broken.
- Q (Question): the strategic question this engagement answers.
- A (Answer): the governing recommendation in one assertive sentence, followed by the 3 supporting key-line arguments.

Frameworks selected by the CEO Orchestrator for this engagement (use these exact names): ${list}.

Two NEW dedicated sections are MANDATORY in addition to the standard executive sections:

## Strategic Framework Analysis
For EACH selected framework, write a labeled subsection:
### Framework: <Name>
- How it was applied to this client (2-3 sentences)
- Key insight it revealed (1-2 sentences)
- Strategic implication (1-2 sentences)

## Quantitative Analysis
This section MUST include, with a clear markdown table where appropriate:
1. Market sizing — TAM, SAM, SOM with stated method (top-down or bottom-up) and assumptions.
2. ROI / Payback / NPV — for the top 2-3 recommendations: investment $, annual benefit $, payback (months), 3-yr NPV at 10% discount, ROI %.
3. Cost-Benefit table — line-by-line costs vs benefits for the recommended program.
4. Sensitivity / Scenario table — Best / Base / Worst case for revenue impact, cost, and net value, with the key driver that changes between scenarios.
All figures may be order-of-magnitude estimates with assumptions explicit. Never write "TBD" or "data not available" — provide a defensible estimate and label it as such.`;
}
