import { Router } from "express";
import { db, conversations as conversationsTable, messages as messagesTable, documentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/ai-server";

const router = Router();

router.post("/mobile/chat/conversations", async (req, res) => {
  try {
    const title = req.body?.title || "Mobile Chat";
    const mode = req.body?.mode || "customer_qa";
    const [conv] = await db.insert(conversationsTable).values({
      title,
      mode,
      updatedAt: new Date(),
    }).returning();
    res.status(201).json({ ...conv, messageCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create mobile conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.post("/mobile/chat/conversations/:id/messages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid conversation ID" }); return; }

    const content = req.body?.content;
    if (!content || typeof content !== "string") { res.status(400).json({ error: "Invalid message" }); return; }

    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

    await db.insert(messagesTable).values({ conversationId: id, role: "user", content });

    const docs = await db.select().from(documentsTable);
    const knowledgeContext = docs
      .filter(d => d.extractedText && d.extractedText.trim().length > 0)
      .map(d => `[${d.title} (${d.category} - ${d.type})]\n${d.extractedText?.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const history = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);

    const systemPrompt = `You are a Senior Management and Governance Consultant at Dar Nozom, a specialized consulting firm focused on Shariah Governance & Compliance Systems, Management Excellence, and Digital Transformation. You bring deep expertise in organizational governance, strategic management, regulatory compliance, and Sharia-compliant business practices.

When responding to any query, always structure your response using the following six-section consulting format:

1. **Problem Analysis** — Clearly define and scope the issue or situation presented, identifying its nature and business impact.
2. **Root Causes** — Identify the underlying drivers or contributing factors behind the problem.
3. **Strategic Recommendations** — Provide concrete, actionable strategic options ranked by priority and feasibility.
4. **Governance Recommendations** — Outline governance structures, policies, oversight mechanisms, or accountability frameworks relevant to the issue.
5. **Sharia Compliance Notes** — When relevant, highlight Sharia compliance considerations, applicable Islamic finance or governance principles, and any areas requiring Sharia board review.
6. **Action Plan** — Provide a clear, step-by-step implementation roadmap with owners, timelines, and success metrics.

Begin each response with a brief one-line consultant identity statement, e.g.: "As a Senior Management and Governance Consultant at Dar Nozom, here is my analysis:"

Keep your advice practical, specific, and grounded in real-world applicability. Avoid vague generalities — every recommendation should be actionable. When Sharia compliance is not directly relevant to a query, briefly note that no specific Sharia considerations apply and proceed.

${knowledgeContext.length > 0 ? `KNOWLEDGE BASE:\n${knowledgeContext.slice(0, 15000)}` : "No documents have been added to the knowledge base yet. Please answer based on your general expertise in management, governance, and Sharia-compliant business practices."}`;

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-20).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

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
      const c = chunk.choices[0]?.delta?.content;
      if (c) {
        fullResponse += c;
        res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: fullResponse });
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send mobile message");
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

export default router;
