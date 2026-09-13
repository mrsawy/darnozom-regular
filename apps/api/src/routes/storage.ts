import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import {
  entityKeyFromObjectPath,
  isLocalObjectStorage,
  isPublicObjectKey,
  openPrivateObjectStream,
  privateObjectExists,
  readPrivateObjectMeta,
} from "../lib/objectStore";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload (GCS/Replit only).
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  if (isLocalObjectStorage()) {
    res.status(501).json({
      error:
        "Presigned uploads are not available with local object storage. Use the multipart upload endpoints instead.",
    });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

async function servePrivateObject(req: Request, res: Response) {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const relativeKey = entityKeyFromObjectPath(objectPath);

    if (isLocalObjectStorage()) {
      const exists = await privateObjectExists(relativeKey);
      if (!exists) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      const meta = await readPrivateObjectMeta(relativeKey);
      res.setHeader("Content-Type", meta?.contentType || "application/octet-stream");
      if (meta?.size) res.setHeader("Content-Length", String(meta.size));
      res.setHeader(
        "Cache-Control",
        meta?.cacheControl ||
          (isPublicObjectKey(relativeKey)
            ? "public, max-age=31536000"
            : "private, max-age=3600"),
      );
      openPrivateObjectStream(relativeKey).pipe(res);
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
}

/**
 * GET /storage/objects/*
 *
 * Public prefixes (book covers, site imagery) are open. Everything else
 * requires a signed-in session (digital PDFs, resumes, etc.).
 */
router.get(
  "/storage/objects/*path",
  (req: Request, res: Response, next) => {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    if (isPublicObjectKey(wildcardPath)) {
      return next();
    }
    return requireAuth(req, res, next);
  },
  servePrivateObject,
);

export default router;
