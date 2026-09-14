import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { db, conversations as conversationsTable, conversationAttachments } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ObjectStorageService, objectStorageClient } from "../../lib/storage/objectStorage";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

const router = Router();
const objectStorageService = new ObjectStorageService();

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

function parseConversationId(req: Request): number | null {
  const id = Number(req.params.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function ensureConversationExists(id: number): Promise<boolean> {
  const [conv] = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
  return !!conv;
}

async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string,
  fileName: string,
): Promise<string | null> {
  try {
    if (mime === "application/pdf") {
      const result = await pdfParse(buffer);
      return (result?.text ?? "").trim() || null;
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return (result?.value ?? "").trim() || null;
    }
    if (
      mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mime === "application/vnd.ms-excel"
    ) {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const parts: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim().length > 0) {
          parts.push(`# Sheet: ${sheetName}\n${csv}`);
        }
      }
      return parts.join("\n\n").trim() || null;
    }
    if (mime === "text/csv" || mime === "text/plain") {
      return buffer.toString("utf-8").trim() || null;
    }
    if (mime.startsWith("image/")) {
      // Images: no OCR; we just record their presence so the model knows.
      return null;
    }
    return null;
  } catch (err) {
    // Surface extraction failures as null but log
    console.error(`extractTextFromBuffer failed for ${fileName} (${mime})`, err);
    return null;
  }
}

router.post(
  "/conversations/:id/attachments",
  (req: Request, res: Response, next: NextFunction) => {
    upload.array("files", 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large (max 15 MB)" });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: (err as Error).message });
      }
      return next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const conversationId = parseConversationId(req);
      if (!conversationId) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }
      const exists = await ensureConversationExists(conversationId);
      if (!exists) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const created: Array<typeof conversationAttachments.$inferSelect> = [];

      for (const file of files) {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          return res.status(400).json({ error: `Unsupported file type: ${file.mimetype}` });
        }
        const objectId = randomUUID();
        const fullPath = `${privateObjectDir}/conversation-attachments/${conversationId}/${objectId}`;
        const pathParts = fullPath.replace(/^\//, "").split("/");
        const bucketName = pathParts[0];
        const objectName = pathParts.slice(1).join("/");

        const bucket = objectStorageClient.bucket(bucketName);
        const storedFile = bucket.file(objectName);
        await storedFile.save(file.buffer, {
          contentType: file.mimetype,
          metadata: { cacheControl: "private, max-age=3600" },
        });

        const extractedText = await extractTextFromBuffer(
          file.buffer,
          file.mimetype,
          file.originalname,
        );

        const objectPath = `/objects/conversation-attachments/${conversationId}/${objectId}`;

        const [row] = await db
          .insert(conversationAttachments)
          .values({
            conversationId,
            fileName: file.originalname,
            contentType: file.mimetype,
            fileSize: file.size,
            objectPath,
            extractedText: extractedText ?? null,
          })
          .returning();
        if (row) created.push(row);
      }

      // Bump conversation updatedAt
      await db
        .update(conversationsTable)
        .set({ updatedAt: new Date() })
        .where(eq(conversationsTable.id, conversationId));

      return res.status(201).json(created);
    } catch (err) {
      req.log?.error?.({ err }, "Failed to upload conversation attachments");
      console.error("Failed to upload conversation attachments", err);
      return res.status(500).json({ error: "Failed to upload attachments" });
    }
  },
);

router.get("/conversations/:id/attachments", async (req: Request, res: Response) => {
  try {
    const conversationId = parseConversationId(req);
    if (!conversationId) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }
    const rows = await db
      .select()
      .from(conversationAttachments)
      .where(eq(conversationAttachments.conversationId, conversationId))
      .orderBy(conversationAttachments.createdAt);
    return res.json(rows);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to list conversation attachments");
    return res.status(500).json({ error: "Failed to list attachments" });
  }
});

router.delete(
  "/conversations/:id/attachments/:attachmentId",
  async (req: Request, res: Response) => {
    try {
      const conversationId = parseConversationId(req);
      const attachmentId = Number(req.params.attachmentId);
      if (!conversationId || !Number.isFinite(attachmentId) || attachmentId <= 0) {
        return res.status(400).json({ error: "Invalid id" });
      }
      const [row] = await db
        .select()
        .from(conversationAttachments)
        .where(
          and(
            eq(conversationAttachments.id, attachmentId),
            eq(conversationAttachments.conversationId, conversationId),
          ),
        );
      if (!row) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      // Best-effort deletion of object
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(row.objectPath);
        await objectFile.delete({ ignoreNotFound: true });
      } catch (storageErr) {
        req.log?.warn?.({ err: storageErr }, "Failed to delete attachment object (continuing)");
      }

      await db
        .delete(conversationAttachments)
        .where(eq(conversationAttachments.id, attachmentId));
      return res.status(204).end();
    } catch (err) {
      req.log?.error?.({ err }, "Failed to delete conversation attachment");
      return res.status(500).json({ error: "Failed to delete attachment" });
    }
  },
);

export default router;
