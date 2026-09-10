import { Router } from "express";
import { db } from "@workspace/db";
import { contactMessages } from "@workspace/db";
import { sendContactNotification } from "../../lib/email";
import type { Request, Response } from "express";

const router = Router();

router.post("/contact", async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body as Record<string, string>;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject?.trim() || null;
    const trimmedMessage = message.trim();

    await db.insert(contactMessages).values({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    sendContactNotification({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    }).catch(err => console.error("[contact] Email notification failed:", err));

    return res.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Failed to submit contact message" });
  }
});

export default router;
