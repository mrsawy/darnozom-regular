import { Router } from "express";
import { db, documentsTable, savedContentTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/ai-server";
import {
  GeneratePresentationBody,
  GenerateTrainingBody,
  SaveContentBody,
  DeleteSavedContentParams,
} from "@workspace/api-zod";

const router = Router();

async function getKnowledgeContext(category: string): Promise<string> {
  const docs = await db.select().from(documentsTable);
  const relevant = docs.filter(d =>
    d.extractedText && d.extractedText.trim().length > 0 &&
    (d.category === category || category === "other")
  );
  return relevant
    .map(d => `[${d.title} (${d.category})]\n${d.extractedText?.slice(0, 2000)}`)
    .join("\n\n---\n\n");
}

router.post("/content/generate-presentation", async (req, res) => {
  try {
    const parsed = GeneratePresentationBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

    const { topic, category, audience, slides, additionalInstructions } = parsed.data;
    const knowledgeContext = await getKnowledgeContext(category);

    const systemPrompt = `You are the Darnozom Consulting expert content creator, specialized in ${category} topics. You produce decks at McKinsey/BCG/Bain rigor: every workshop deck must apply named consulting frameworks explicitly and include a numbers slide with defensible estimates.
${knowledgeContext.length > 0 ? `\nKNOWLEDGE BASE:\n${knowledgeContext.slice(0, 10000)}` : ""}`;

    const userPrompt = `Create a detailed professional presentation outline for the following:
Topic: ${topic}
Category: ${category}
Audience: ${audience || "Management professionals"}
Number of slides: ${slides || 10}
${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ""}

Format the output as a structured presentation that MUST include:
1. Title slide
2. Agenda/Overview
3. Core content slides with clear headings, bullet points, and key messages
4. At least 2 framework slides — each titled "Framework: <Name>" applying one of: Porter's Five Forces, BCG Growth-Share Matrix, McKinsey 7S, Value Chain, SWOT/TOWS, PESTEL, Blue Ocean ERRC, Jobs-to-be-Done, Three Horizons, Ansoff Matrix, VRIO, Balanced Scorecard, MECE Issue Tree.
5. A "By the Numbers" quantitative slide that includes a small markdown table of TAM/SAM/SOM (or ROI / payback) with stated assumptions and a Best/Base/Worst sensitivity row.
6. Summary/Key Takeaways
7. Q&A / Next Steps

For each slide provide: Slide title, 4-6 bullet points or key content, speaker notes suggestion.
Make it professional, insightful, and grounded in expertise.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate presentation");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate" })}\n\n`);
    res.end();
  }
});

router.post("/content/generate-training", async (req, res) => {
  try {
    const parsed = GenerateTrainingBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

    const { topic, category, duration, level, objectives } = parsed.data;
    const knowledgeContext = await getKnowledgeContext(category);

    const systemPrompt = `You are the Darnozom Consulting expert training designer, specialized in ${category} topics.
Generate comprehensive training course outlines for professional development.
${knowledgeContext.length > 0 ? `\nKNOWLEDGE BASE:\n${knowledgeContext.slice(0, 10000)}` : ""}`;

    const userPrompt = `Design a detailed training course for the following:
Topic: ${topic}
Category: ${category}
Duration: ${duration || "1 day"}
Level: ${level || "intermediate"}
Learning Objectives: ${objectives || "To be defined based on topic"}

Format as a complete training course outline with:
1. Course Overview and Learning Objectives
2. Target Audience
3. Course Structure (modules/units)
4. For each module: Title, Duration, Learning Outcomes, Content outline, Activities/Exercises
5. Assessment Methods
6. Materials Needed
7. Facilitator Notes

Make it practical, engaging, and grounded in real-world application.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate training");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate" })}\n\n`);
    res.end();
  }
});

router.post("/content/generate-presentation-structured", async (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const { topic, category, audience, slides, additionalInstructions } = body;
    if (!topic || !category) { res.status(400).json({ error: "topic and category are required" }); return; }

    const knowledgeContext = await getKnowledgeContext(category);
    const slideCount = parseInt(slides) || 10;

    const systemPrompt = `You are a senior consultant and presentation expert at Darnozom Consulting AI Platform, specialized in ${category}. You operate at McKinsey/BCG/Bain rigor: every deck applies named consulting frameworks explicitly and includes quantitative grounding (market sizing, ROI, sensitivity).
Your task is to produce structured slide content in valid JSON format only. No markdown, no explanation — only pure JSON.
${knowledgeContext.length > 0 ? `\nKNOWLEDGE BASE (use this as reference):\n${knowledgeContext.slice(0, 8000)}` : ""}`;

    const userPrompt = `Create a professional consulting presentation with exactly ${slideCount} content slides (not counting cover and thank-you) for:

Topic: ${topic}
Category: ${category}
Audience: ${audience || "Senior management and executives"}
${additionalInstructions ? `Special instructions: ${additionalInstructions}` : ""}

Return ONLY a JSON object with this exact structure (no text before or after):
{
  "title": "Main presentation title",
  "subtitle": "Subtitle or tagline",
  "category": "${category}",
  "audience": "${audience || "Senior management and executives"}",
  "agenda": ["Section 1 title", "Section 2 title", "Section 3 title"],
  "slides": [
    {
      "type": "content",
      "title": "Slide Title",
      "bullets": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
      "notes": "Speaker notes for this slide"
    },
    {
      "type": "section",
      "title": "Section Divider Title",
      "subtitle": "Brief description of this section"
    },
    {
      "type": "quote",
      "title": "Slide Title",
      "quote": "Impactful quote or key statement",
      "attribution": "Source or context",
      "notes": "Speaker notes"
    }
  ],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"],
  "nextSteps": ["Action item 1", "Action item 2", "Action item 3"]
}

Rules:
- Use "content" type for most slides (has title + bullets + notes)
- Use "section" type for section dividers (has title + subtitle, no bullets)
- Use "quote" type for impactful statements (1-2 per presentation)
- Each bullet point should be concise (max 12 words)
- Include 3-6 bullets per content slide
- MANDATORY: include at least 2 framework slides whose title starts with "Framework: " followed by a named framework (Porter's Five Forces, BCG Matrix, McKinsey 7S, Value Chain, SWOT/TOWS, PESTEL, Blue Ocean ERRC, JTBD, Three Horizons, Ansoff, VRIO, Balanced Scorecard, MECE Issue Tree).
- MANDATORY: include 1 quantitative slide titled "By the Numbers" whose bullets cover TAM/SAM/SOM (or ROI / payback) with a Best/Base/Worst sensitivity row and at least one stated assumption.
- Make it insightful, professional, grounded in consulting expertise.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "AI did not return valid JSON" });
      return;
    }
    const structured = JSON.parse(jsonMatch[0]);
    res.json(structured);
  } catch (err) {
    req.log.error({ err }, "Failed to generate structured presentation");
    res.status(500).json({ error: "Failed to generate presentation" });
  }
});

router.get("/content/saved", async (req, res) => {
  try {
    const items = await db.select().from(savedContentTable).orderBy(savedContentTable.createdAt);
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list saved content");
    res.status(500).json({ error: "Failed to list saved content" });
  }
});

router.post("/content/saved", async (req, res) => {
  try {
    const parsed = SaveContentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [item] = await db.insert(savedContentTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "Failed to save content");
    res.status(500).json({ error: "Failed to save content" });
  }
});

router.delete("/content/saved/:id", async (req, res) => {
  try {
    const { id } = DeleteSavedContentParams.parse({ id: Number(req.params.id) });
    await db.delete(savedContentTable).where(eq(savedContentTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete saved content");
    res.status(500).json({ error: "Failed to delete saved content" });
  }
});

export default router;
