import { Router } from "express";
import { db, conversations as conversationsTable, messages as messagesTable, documentsTable, conversationAttachments } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import attachmentsRouter from "./attachments";
import { openai } from "@workspace/ai-server";
import { ObjectStorageService } from "@workspace/object-store";
import {
  CreateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
  ListMessagesParams,
  SendMessageBody,
  SendMessageParams,
} from "@workspace/api-zod";

const router = Router();

router.use(attachmentsRouter);

router.get("/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));
    const result = await Promise.all(
      convs.map(async (c) => {
        const [cnt] = await db
          .select({ count: count() })
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, c.id));
        return { ...c, messageCount: cnt?.count ?? 0 };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const parsed = CreateConversationBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [conv] = await db.insert(conversationsTable).values({
      title: parsed.data.title,
      mode: parsed.data.mode ?? "customer_qa",
      updatedAt: new Date(),
    }).returning();
    res.status(201).json({ ...conv, messageCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const { id } = GetConversationParams.parse({ id: Number(req.params.id) });
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json({ ...conv, messageCount: msgs.length, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const { id } = DeleteConversationParams.parse({ id: Number(req.params.id) });
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = ListMessagesParams.parse({ id: Number(req.params.id) });
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { id } = SendMessageParams.parse({ id: Number(req.params.id) });
    const parsed = SendMessageBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid message" }); return; }

    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

    // Save user message
    await db.insert(messagesTable).values({ conversationId: id, role: "user", content: parsed.data.content });

    // Fetch all knowledge base content for context
    const docs = await db.select().from(documentsTable);
    const knowledgeContext = docs
      .filter(d => d.extractedText && d.extractedText.trim().length > 0)
      .map(d => `[${d.title} (${d.category} - ${d.type})]\n${d.extractedText?.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    // Fetch this conversation's attachments for context
    const attachments = await db
      .select()
      .from(conversationAttachments)
      .where(eq(conversationAttachments.conversationId, id))
      .orderBy(conversationAttachments.createdAt);
    const attachmentsContext = attachments
      .map(a => {
        const header = `[${a.fileName} (${a.contentType}, ${a.fileSize} bytes)]`;
        if (a.extractedText && a.extractedText.trim().length > 0) {
          return `${header}\n${a.extractedText.slice(0, 4000)}`;
        }
        if (a.contentType.startsWith("image/")) {
          return `${header}\n(Image attached. Its visual content is provided to you below as an inline image input — analyze it directly.)`;
        }
        return `${header}\n(No text could be extracted from this file.)`;
      })
      .join("\n\n---\n\n");

    // Build vision content parts for image attachments (gpt-5.2 supports image_url inputs).
    // Budget: cap count, per-image size, and total payload to keep request small.
    const MAX_IMAGES_PER_REQUEST = 4;
    const MAX_IMAGE_BYTES_PER_FILE = 2 * 1024 * 1024; // 2 MB raw per image
    const MAX_TOTAL_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB total raw across all images
    const imageParts: Array<{
      type: "image_url";
      image_url: { url: string };
    }> = [];
    const objectStorageService = new ObjectStorageService();
    // Prefer most-recent image attachments and within per-file size cap.
    const candidateImages = attachments
      .filter(
        a =>
          a.contentType.startsWith("image/") &&
          a.fileSize <= MAX_IMAGE_BYTES_PER_FILE,
      )
      .slice(-MAX_IMAGES_PER_REQUEST);
    let totalImageBytes = 0;
    for (const a of candidateImages) {
      if (totalImageBytes + a.fileSize > MAX_TOTAL_IMAGE_BYTES) {
        req.log.info(
          { attachmentId: a.id, totalImageBytes },
          "Skipping image attachment to stay within vision budget",
        );
        continue;
      }
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(a.objectPath);
        const [buf] = await objectFile.download();
        const dataUrl = `data:${a.contentType};base64,${buf.toString("base64")}`;
        imageParts.push({ type: "image_url", image_url: { url: dataUrl } });
        totalImageBytes += buf.length;
      } catch (err) {
        req.log.warn({ err, attachmentId: a.id }, "Failed to load image attachment for vision");
      }
    }

    // Get conversation history
    const history = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);

    const systemPrompt = `You are a Senior Management and Governance Consultant at Dar Nozom, a specialized consulting firm focused on Shariah Governance & Compliance Systems, Management Excellence, and Digital Transformation. You operate at McKinsey/BCG/Bain rigor: every answer is hypothesis-driven, applies named consulting frameworks explicitly, and quantifies recommendations with stated assumptions.

When responding to any non-trivial business query, always structure your response as follows:

1. **MECE Issue Tree** — Decompose the question into mutually exclusive, collectively exhaustive sub-issues with the testable hypothesis under each leaf (indented bullets).
2. **Strategic Framework Analysis** — Explicitly apply 1-3 named frameworks chosen from this canonical set: Porter's Five Forces, BCG Growth-Share Matrix, McKinsey 7S, Porter's Value Chain, SWOT/TOWS, PESTEL, Blue Ocean ERRC, Jobs-to-be-Done, Three Horizons, Ansoff Matrix, VRIO, Balanced Scorecard. Label each application with the framework name as a heading.
3. **Problem Analysis** — Define and scope the issue and its business impact.
4. **Root Causes** — Underlying drivers behind the problem.
5. **Strategic Recommendations** — Concrete actionable options ranked by priority. Each recommendation MUST include a numeric estimate of impact with the assumption stated (e.g. "≈ 15-20% productivity gain — assumes 60% process automation coverage").
6. **Governance Recommendations** — Governance structures, policies, oversight mechanisms.
7. **Sharia Compliance Notes** — When relevant, Sharia considerations and Islamic finance / governance principles.
8. **Quantitative Snapshot** — A small markdown table covering ROI, payback (months), and a Best/Base/Worst sensitivity for the top recommendation. Use defensible order-of-magnitude estimates with assumptions. Never write "TBD".
9. **Action Plan** — Step-by-step implementation roadmap with owners, timelines, and success metrics.

For brief / conversational follow-up questions, you may collapse this structure but still apply at least one named framework and one quantified estimate.

Begin each response with a brief one-line consultant identity statement, e.g.: "As a Senior Management and Governance Consultant at Dar Nozom, here is my analysis:"

Keep your advice practical, specific, and grounded in real-world applicability. Avoid vague generalities — every recommendation should be actionable. When Sharia compliance is not directly relevant to a query, briefly note that no specific Sharia considerations apply and proceed.

${knowledgeContext.length > 0 ? `KNOWLEDGE BASE:\n${knowledgeContext.slice(0, 15000)}` : "No documents have been added to the knowledge base yet. Please answer based on your general expertise in management, governance, and Sharia-compliant business practices."}

${attachmentsContext.length > 0 ? `CONVERSATION ATTACHMENTS (files the user attached to this conversation; treat these as the primary, most relevant source for client-specific questions):\n${attachmentsContext.slice(0, 20000)}` : ""}`;

    const trimmedHistory = history.slice(-20);
    const chatMessages: Array<
      | { role: "system" | "assistant"; content: string }
      | {
          role: "user";
          content:
            | string
            | Array<
                | { type: "text"; text: string }
                | { type: "image_url"; image_url: { url: string } }
              >;
        }
    > = [{ role: "system", content: systemPrompt }];

    for (let i = 0; i < trimmedHistory.length; i++) {
      const m = trimmedHistory[i];
      const role = m.role as "user" | "assistant";
      const isLastUser =
        role === "user" &&
        i === trimmedHistory.length - 1 &&
        imageParts.length > 0;
      if (isLastUser) {
        chatMessages.push({
          role: "user",
          content: [{ type: "text", text: m.content }, ...imageParts],
        });
      } else {
        chatMessages.push({ role, content: m.content });
      }
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant message
    await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: fullResponse });
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;
