import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db, reportAttachments, reports } from "@workspace/db";
import { and, eq, isNull, desc } from "drizzle-orm";
import { openai } from "@workspace/ai-server";
import type { AuthRequest } from "../../middlewares/authMiddleware";
import { ObjectStorageService } from "@workspace/object-store";
import { extractTextFromFile, isSupportedAttachmentType } from "../../lib/extract";

const router = Router();
const objectStorage = new ObjectStorageService();

function tenantFilter(req: AuthRequest) {
  if (req.isSuperAdmin && !req.userTenantId) return null;
  return req.userTenantId ?? null;
}

async function downloadObjectBuffer(objectPath: string): Promise<Buffer> {
  const file = await objectStorage.getObjectEntityFile(objectPath);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = file.createReadStream();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/** POST /api/reports/draft  → returns a server-issued draftId for staging attachments. */
router.post("/reports/draft", (req: AuthRequest, res) => {
  if (req.userRole === "client") {
    return res.status(403).json({ error: "Forbidden" });
  }
  return res.json({ draftId: randomUUID() });
});

/**
 * POST /api/reports/draft/:draftId/attachments
 * Body: { objectPath, fileName, contentType, fileSize }
 * Downloads the uploaded file, runs text extraction, persists attachment row.
 */
router.post("/reports/draft/:draftId/attachments", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const draftId = String(req.params.draftId);
    const body = req.body as Record<string, unknown>;
    const objectPath = typeof body.objectPath === "string" ? body.objectPath : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : null;
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : null;

    if (!draftId || !objectPath || !fileName) {
      return res.status(400).json({ error: "draftId, objectPath, and fileName are required" });
    }
    if (!isSupportedAttachmentType(fileName, contentType)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    let extractedText = "";
    try {
      const buf = await downloadObjectBuffer(objectPath);
      extractedText = await extractTextFromFile({ buffer: buf, fileName, contentType });
    } catch (err) {
      req.log.warn({ err }, "Failed to extract text from attachment");
    }

    const tid = tenantFilter(req);
    const [row] = await db.insert(reportAttachments).values({
      draftId,
      tenantId: tid ?? undefined,
      fileName,
      contentType: contentType ?? undefined,
      fileSize: fileSize ?? undefined,
      objectPath,
      extractedText: extractedText || null,
    }).returning();

    return res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to attach file to draft report");
    return res.status(500).json({ error: "Failed to attach file" });
  }
});

/** GET /api/reports/draft/:draftId/attachments */
router.get("/reports/draft/:draftId/attachments", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const draftId = String(req.params.draftId);
    const tid = tenantFilter(req);
    const rows = await db
      .select()
      .from(reportAttachments)
      .where(
        tid != null
          ? and(eq(reportAttachments.draftId, draftId), eq(reportAttachments.tenantId, tid))
          : and(eq(reportAttachments.draftId, draftId), isNull(reportAttachments.tenantId))
      )
      .orderBy(desc(reportAttachments.createdAt));
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list draft attachments");
    return res.status(500).json({ error: "Failed to list attachments" });
  }
});

/** DELETE /api/reports/draft/:draftId/attachments/:id */
router.delete("/reports/draft/:draftId/attachments/:id", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const draftId = String(req.params.draftId);
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    const [row] = await db
      .select()
      .from(reportAttachments)
      .where(eq(reportAttachments.id, id));
    if (!row || row.draftId !== draftId) {
      return res.status(404).json({ error: "Not found" });
    }
    if (tid != null && row.tenantId !== tid) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await db.delete(reportAttachments).where(eq(reportAttachments.id, id));
    return res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete draft attachment");
    return res.status(500).json({ error: "Failed to delete attachment" });
  }
});

/**
 * POST /api/reports/draft/:draftId/auto-map
 * Reads all attachments for the draft, asks the model to fill out an intake schema.
 */
router.post("/reports/draft/:draftId/auto-map", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const draftId = String(req.params.draftId);
    const tid = tenantFilter(req);
    const rows = await db
      .select()
      .from(reportAttachments)
      .where(
        tid != null
          ? and(eq(reportAttachments.draftId, draftId), eq(reportAttachments.tenantId, tid))
          : and(eq(reportAttachments.draftId, draftId), isNull(reportAttachments.tenantId))
      );

    const usable = rows.filter(r => r.extractedText && r.extractedText.trim().length > 0);
    if (usable.length === 0) {
      return res.json({
        mapped: {},
        sourceFiles: rows.map(r => r.fileName),
        note: "No text could be extracted from the uploaded files.",
      });
    }

    const corpus = usable
      .map(r => `=== FILE: ${r.fileName} ===\n${(r.extractedText ?? "").slice(0, 8000)}`)
      .join("\n\n")
      .slice(0, 30000);

    const systemPrompt = `You are an intake assistant for a consulting firm. Read the client's uploaded documents and extract a structured intake JSON.

Return ONLY a valid JSON object with these keys (use null when unknown):
{
  "name": string|null,            // primary contact / responsible person, if mentioned
  "organization": string|null,    // company / organization name
  "industry": string|null,        // sector / industry
  "country": string|null,
  "size": string|null,            // headcount, revenue band, or "Small/Medium/Large/Enterprise"
  "challenges": string|null,      // 1–3 sentences summarizing key pain points / challenges
  "goals": string|null,           // 1–3 sentences summarizing strategic goals / desired outcomes
  "context": string|null,         // any additional relevant context (markets, regulators, board structure, etc.)
  "suggestedTitle": string|null,  // a short, professional title for an advisory report
  "suggestedReportType": "strategy"|"governance"|"sharia"|"combined"|null
}
Do not include any prose — output JSON only.`;

    const userPrompt = `Documents:\n\n${corpus}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let mapped: Record<string, unknown> = {};
    try {
      mapped = JSON.parse(raw);
    } catch {
      mapped = {};
    }

    return res.json({
      mapped,
      sourceFiles: usable.map(r => r.fileName),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to auto-map intake from attachments");
    return res.status(500).json({ error: "Failed to auto-map intake" });
  }
});

/** GET /api/reports/:id/attachments — list attachments for a finished report. */
router.get("/reports/:id/attachments", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const tid = tenantFilter(req);
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    if (!report) {
      return res.status(404).json({ error: "Not found" });
    }
    if (req.userRole === "client" && report.clientId !== req.userClientId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const rows = await db
      .select()
      .from(reportAttachments)
      .where(eq(reportAttachments.reportId, id));
    if (tid != null) {
      const filtered = rows.filter(r => r.tenantId === null || r.tenantId === tid);
      return res.json(filtered);
    }
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list report attachments");
    return res.status(500).json({ error: "Failed to list attachments" });
  }
});

export default router;
