import { Router } from "express";
import { db } from "@workspace/db";
import { assessments, clients, reports } from "@workspace/db";
import { desc } from "drizzle-orm";
import type { AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

function extractKeywords(texts: string[]): { word: string; count: number }[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "not", "no", "we", "our",
    "us", "it", "its", "this", "that", "these", "those", "i", "my", "me",
    "they", "their", "them", "he", "she", "his", "her", "you", "your",
    "as", "if", "so", "than", "then", "when", "where", "who", "which",
    "what", "how", "all", "very", "also", "more", "most", "just", "about",
    "up", "out", "into", "through", "during", "before", "after", "above",
    "below", "between", "each", "other", "such", "same", "own", "few",
    "both", "only", "while", "however", "therefore", "thus", "since",
    "because", "although", "though", "yet", "still", "already", "always",
    "often", "never", "ever", "too", "very", "quite", "rather", "need",
    "make", "made", "get", "got", "take", "taken", "new", "current",
    "within", "across", "well",
  ]);

  const wordCount: Record<string, number> = {};

  for (const text of texts) {
    if (!text) continue;
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    for (const word of words) {
      wordCount[word] = (wordCount[word] ?? 0) + 1;
    }
  }

  return Object.entries(wordCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

router.get("/analytics", async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== "consultant") {
      return res.status(403).json({ error: "Forbidden: consultant or admin access required" });
    }

    const isAdmin = req.isAdmin === true;

    const allAssessments = await db.select().from(assessments).orderBy(desc(assessments.createdAt));
    const allClients = await db.select().from(clients);

    const scopedAssessments = allAssessments;

    const totalAssessments = scopedAssessments.length;

    const industriesMap: Record<string, number> = {};
    for (const assessment of scopedAssessments) {
      const answers = assessment.answers as Record<string, unknown>;
      const general = answers?.general as Record<string, string> | undefined;
      const industry = general?.industry ?? "Unknown";
      industriesMap[industry] = (industriesMap[industry] ?? 0) + 1;
    }
    const byIndustry = Object.entries(industriesMap)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);

    const domainScores: Record<string, number[]> = {
      strategy: [],
      governance: [],
      compliance: [],
      digital: [],
    };
    for (const assessment of scopedAssessments) {
      const scores = assessment.scores as Record<string, number> | null;
      if (scores) {
        for (const domain of Object.keys(domainScores)) {
          if (typeof scores[domain] === "number") {
            domainScores[domain].push(scores[domain]);
          }
        }
      }
    }
    const avgScores = Object.entries(domainScores).map(([domain, vals]) => ({
      domain: domain.charAt(0).toUpperCase() + domain.slice(1),
      avgScore: vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
      count: vals.length,
    }));

    const volumeByMonth: Record<string, number> = {};
    for (const assessment of scopedAssessments) {
      const d = new Date(assessment.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      volumeByMonth[monthKey] = (volumeByMonth[monthKey] ?? 0) + 1;
    }

    const sortedMonths = Object.keys(volumeByMonth).sort();
    const volumeOverTime = sortedMonths.map((key) => {
      const [year, month] = key.split("-");
      const label = getMonthLabel(new Date(parseInt(year), parseInt(month) - 1, 1));
      return { month: label, count: volumeByMonth[key] };
    });

    if (volumeOverTime.length < 2) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = getMonthLabel(d);
        if (!volumeOverTime.find((v) => v.month === label)) {
          volumeOverTime.unshift({ month: label, count: 0 });
        }
      }
      volumeOverTime.sort((a, b) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const [aMonth, aYear] = a.month.split(" ");
        const [bMonth, bYear] = b.month.split(" ");
        if (aYear !== bYear) return parseInt(aYear) - parseInt(bYear);
        return months.indexOf(aMonth) - months.indexOf(bMonth);
      });
    }

    const paintTexts: string[] = [];
    for (const assessment of scopedAssessments) {
      const answers = assessment.answers as Record<string, unknown>;
      const pain = answers?.pain as Record<string, string> | undefined;
      if (pain) {
        if (pain.biggestProblem) paintTexts.push(pain.biggestProblem);
        if (pain.oneFix) paintTexts.push(pain.oneFix);
        if (pain.consequence) paintTexts.push(pain.consequence);
      }
      const priorities = answers?.priorities as string[] | undefined;
      if (priorities) paintTexts.push(...priorities);
    }
    const painPoints = extractKeywords(paintTexts);

    const serviceTypeCount: Record<string, number> = {};
    for (const assessment of scopedAssessments) {
      serviceTypeCount[assessment.serviceType] = (serviceTypeCount[assessment.serviceType] ?? 0) + 1;
    }
    const byServiceType = Object.entries(serviceTypeCount).map(([type, count]) => ({
      type,
      label: type === "full" ? "Full Assessment" : type.charAt(0).toUpperCase() + type.slice(1),
      count,
    }));

    const totalClients = allClients.length;

    const allReports = await db.select().from(reports);
    const totalReports = allReports.length;

    return res.json({
      totalAssessments,
      totalClients,
      totalReports,
      byIndustry,
      avgScores,
      volumeOverTime,
      painPoints,
      byServiceType,
      isAdmin,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
