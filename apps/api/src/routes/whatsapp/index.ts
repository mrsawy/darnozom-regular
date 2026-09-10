import { Router } from "express";
import { db } from "@workspace/db";
import { whatsappDeliveryLogs, clients, reports } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { AuthRequest } from "../../middlewares/authMiddleware";

const router = Router();

router.get("/whatsapp/logs", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const logs = await db
      .select({
        log: whatsappDeliveryLogs,
        clientName: clients.name,
        reportTitle: reports.title,
      })
      .from(whatsappDeliveryLogs)
      .leftJoin(clients, eq(whatsappDeliveryLogs.clientId, clients.id))
      .leftJoin(reports, eq(whatsappDeliveryLogs.reportId, reports.id))
      .orderBy(desc(whatsappDeliveryLogs.sentAt))
      .limit(200);

    return res.json(
      logs.map(({ log, clientName, reportTitle }) => ({
        ...log,
        clientName: clientName ?? null,
        reportTitle: reportTitle ?? null,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch WhatsApp logs" });
  }
});

router.post("/whatsapp/log", async (req: AuthRequest, res) => {
  try {
    if (req.userRole === "client") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const body = req.body as Record<string, unknown>;
    const { clientId, reportId, assessmentId, recipient, method, note } = body;

    if (!recipient || typeof recipient !== "string") {
      return res.status(400).json({ error: "recipient is required" });
    }

    const [log] = await db
      .insert(whatsappDeliveryLogs)
      .values({
        clientId: typeof clientId === "number" ? clientId : null,
        reportId: typeof reportId === "number" ? reportId : null,
        assessmentId: typeof assessmentId === "number" ? assessmentId : null,
        recipient: recipient as string,
        method: (method === "auto" ? "auto" : "manual") as "manual" | "auto",
        note: typeof note === "string" ? note : null,
      })
      .returning();

    return res.status(201).json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to log WhatsApp send" });
  }
});

export default router;
