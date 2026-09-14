import { Router } from "express";
import { db } from "@workspace/db";
import { books } from "@workspace/db";
import { eq, and, ilike, or, desc } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { requireAdmin } from "../../middlewares/adminAuth";
import { scrapeBookUrl, BROWSER_HEADERS, DATA_IMAGE_RE, sniffImageMime } from "./scrapeUrl";
import { savePrivateObject } from "../../lib/storage/objectStore";

const router = Router();

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});

const PDF_MAX_SIZE = 50 * 1024 * 1024;
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const requireBooksAdmin = requireAdmin;

const COVER_FETCH_MAX_BYTES = 10 * 1024 * 1024;
const COVER_FETCH_TIMEOUT_MS = 15_000;
const COVER_STORE_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const m = mime.split(";")[0].trim().toLowerCase();
  if (m === "image/jpg") return "image/jpeg";
  return m;
}

async function loadCoverBytes(
  imageUrl: string,
  refererUrl: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (DATA_IMAGE_RE.test(imageUrl)) {
    const m = imageUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!m) return null;
    const ct = normalizeMime(m[1]);
    if (!ct || !COVER_STORE_ALLOWED_MIME.has(ct)) return null;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(m[2], "base64");
    } catch {
      return null;
    }
    if (buffer.length === 0 || buffer.length > COVER_FETCH_MAX_BYTES) return null;
    return { buffer, contentType: ct };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": BROWSER_HEADERS["Accept-Language"],
        Referer: refererUrl,
      },
    });
    if (!res.ok) return null;
    const declaredLen = res.headers.get("content-length");
    if (declaredLen) {
      const n = parseInt(declaredLen, 10);
      if (Number.isFinite(n) && n > COVER_FETCH_MAX_BYTES) return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > COVER_FETCH_MAX_BYTES) return null;
    const sniffed = sniffImageMime(bytes);
    const headerMime = normalizeMime(res.headers.get("content-type"));
    let contentType = sniffed && COVER_STORE_ALLOWED_MIME.has(sniffed)
      ? sniffed
      : headerMime && COVER_STORE_ALLOWED_MIME.has(headerMime)
        ? headerMime
        : null;
    if (!contentType) return null;
    return { buffer: Buffer.from(bytes), contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function storeCover(
  imageUrl: string,
  refererUrl: string,
): Promise<string | null> {
  const loaded = await loadCoverBytes(imageUrl, refererUrl);
  if (!loaded) return null;
  try {
    const objectId = randomUUID();
    await savePrivateObject(`book-covers/${objectId}`, loaded.buffer, loaded.contentType, {
      cacheControl: "public, max-age=31536000",
    });
    return `/api/storage/objects/book-covers/${objectId}`;
  } catch {
    return null;
  }
}

// Derive *effective* per-format availability and price for a book row,
// falling back to the legacy single `format`/`price` fields when the new
// per-format fields are unset. This keeps pre-existing books usable on the
// storefront and during checkout until an admin opts them into the new
// fields explicitly.
//
// Rules:
//   - Effective paper:   new `paperAvailable` OR legacy format ∈ {hardcopy, both}
//   - Effective digital: new `digitalAvailable` OR legacy format ∈ {online, both}
//   - Effective price per format: new field if present, else legacy `price`
export function computeFormats<T extends {
  paperAvailable?: boolean | null;
  paperPrice?: string | null;
  digitalAvailable?: boolean | null;
  digitalPrice?: string | null;
  format?: string | null;
  price?: string | null;
  digitalFileUrl?: string | null;
}>(b: T): {
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
  hasDigitalFile: boolean;
} {
  const legacy = String(b.format ?? "").toLowerCase();
  const legacyHasPaper = legacy === "hardcopy" || legacy === "both";
  const legacyHasDigital = legacy === "online" || legacy === "both";
  const legacyPrice = b.price ?? null;

  const paperAvailable = Boolean(b.paperAvailable) || legacyHasPaper;
  const paperPrice = b.paperPrice ?? (legacyHasPaper ? legacyPrice : null);
  const digitalAvailable = Boolean(b.digitalAvailable) || legacyHasDigital;
  const digitalPrice = b.digitalPrice ?? (legacyHasDigital ? legacyPrice : null);
  const hasDigitalFile = !!b.digitalFileUrl;
  return { paperAvailable, paperPrice, digitalAvailable, digitalPrice, hasDigitalFile };
}

function publicBook<T extends {
  digitalFileUrl?: string | null;
  paperAvailable?: boolean | null;
  paperPrice?: string | null;
  digitalAvailable?: boolean | null;
  digitalPrice?: string | null;
  format?: string | null;
  price?: string | null;
}>(b: T) {
  // The digital file URL is an internal storage handle. Expose only an
  // existence flag publicly so admin tooling can know one is uploaded
  // without leaking the storage path to anonymous visitors.
  const { digitalFileUrl: _df, ...rest } = b;
  const eff = computeFormats(b);
  return {
    ...rest,
    paperAvailable: eff.paperAvailable,
    paperPrice: eff.paperPrice,
    digitalAvailable: eff.digitalAvailable,
    digitalPrice: eff.digitalPrice,
    hasDigitalFile: eff.hasDigitalFile,
  };
}

// Public listing/detail always go through publicBook() so the raw digital
// file URL is never exposed. Admins use the dedicated /admin/books routes
// below to read the full record.
router.get("/books", async (req, res) => {
  try {
    const { category, search } = req.query as Record<string, string>;

    const conditions = [];
    if (category && category !== "all") {
      conditions.push(eq(books.category, category as typeof books.$inferSelect["category"]));
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(books.title, term), ilike(books.author, term))!);
    }

    let result;
    if (conditions.length > 0) {
      result = await db.select().from(books).where(and(...conditions)).orderBy(desc(books.isFeatured), books.createdAt);
    } else {
      result = await db.select().from(books).orderBy(desc(books.isFeatured), books.createdAt);
    }
    res.json(result.map(publicBook));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list books" });
  }
});

router.get("/books/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [book] = await db.select().from(books).where(eq(books.id, id));
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    return res.json(publicBook(book));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get book" });
  }
});

// Admin-only listing including the raw digital file URL — used by the
// admin Books page to render the "current PDF" indicator on edit.
router.get("/admin/books", requireBooksAdmin, async (_req, res) => {
  try {
    const result = await db.select().from(books).orderBy(desc(books.isFeatured), books.createdAt);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list books" });
  }
});

router.get("/admin/books/:id", requireBooksAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [book] = await db.select().from(books).where(eq(books.id, id));
    if (!book) return res.status(404).json({ error: "Book not found" });
    return res.json(book);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get book" });
  }
});

router.post(
  "/books/upload-cover",
  requireBooksAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large (max 10 MB)" });
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
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
        return res.status(400).json({ error: "Only JPG, PNG, and WebP images are allowed" });
      }

      const objectId = randomUUID();
      await savePrivateObject(`book-covers/${objectId}`, req.file.buffer, req.file.mimetype, {
        cacheControl: "public, max-age=31536000",
      });

      const objectPath = `/objects/book-covers/${objectId}`;
      const coverUrl = `/api/storage/objects/book-covers/${objectId}`;

      return res.json({ coverUrl, objectPath });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to upload image" });
    }
  }
);

router.post("/books/scrape-url", requireBooksAdmin, async (req, res) => {
  try {
    const { url } = req.body as { url: string };
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const result = await scrapeBookUrl(url);

    // If the scraper found a cover, persist it in our object storage so the
    // admin preview and shop page get a stable internal URL that doesn't
    // depend on the source site allowing hotlinking. Fall back to the
    // external URL when the download fails.
    if (result.image) {
      const internal = await storeCover(result.image, result.finalUrl || url);
      if (internal) {
        result.image = internal;
        result.warnings.push("تم رفع صورة الغلاف تلقائياً إلى التخزين الداخلي.");
      } else {
        result.warnings.push(
          "تعذّر تنزيل صورة الغلاف وحفظها داخلياً، تم الإبقاء على الرابط الخارجي. قد لا تظهر إذا منع الموقع الأصلي العرض الخارجي.",
        );
      }
    }

    return res.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return res.status(408).json({ error: "انتهت مهلة جلب الصفحة" });
    }
    console.error(err);
    return res.status(500).json({ error: "تعذّر جلب بيانات الرابط" });
  }
});

router.post(
  "/books/upload-pdf",
  requireBooksAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    pdfUpload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "PDF file too large (max 50 MB)" });
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
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file provided" });
      }
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }

      const objectId = randomUUID();
      await savePrivateObject(`book-pdfs/${objectId}`, req.file.buffer, "application/pdf", {
        cacheControl: "private, max-age=0",
      });

      // Internal opaque URL — never served directly from public storage.
      const fileUrl = `internal://book-pdfs/${objectId}`;
      const fileName = req.file.originalname || `${objectId}.pdf`;
      return res.json({ fileUrl, fileName, size: req.file.size });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to upload PDF" });
    }
  },
);

function normalizePriceField(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s;
}

function validateBookFormatPayload(body: Record<string, unknown>): {
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
  digitalFileUrl: string | null;
  error?: string;
} {
  const paperAvailable = Boolean(body.paperAvailable);
  const digitalAvailable = Boolean(body.digitalAvailable);
  const paperPrice = normalizePriceField(body.paperPrice);
  const digitalPrice = normalizePriceField(body.digitalPrice);
  const digitalFileUrl = body.digitalFileUrl ? String(body.digitalFileUrl) : null;

  if (!paperAvailable && !digitalAvailable) {
    return {
      paperAvailable, paperPrice, digitalAvailable, digitalPrice, digitalFileUrl,
      error: "At least one format (paper or digital) must be available",
    };
  }
  if (paperAvailable && !paperPrice) {
    return {
      paperAvailable, paperPrice, digitalAvailable, digitalPrice, digitalFileUrl,
      error: "Paper price is required when paper edition is available",
    };
  }
  if (digitalAvailable && !digitalPrice) {
    return {
      paperAvailable, paperPrice, digitalAvailable, digitalPrice, digitalFileUrl,
      error: "Digital price is required when digital edition is available",
    };
  }
  if (digitalAvailable && !digitalFileUrl) {
    return {
      paperAvailable, paperPrice, digitalAvailable, digitalPrice, digitalFileUrl,
      error: "PDF file is required when digital edition is available",
    };
  }
  return { paperAvailable, paperPrice, digitalAvailable, digitalPrice, digitalFileUrl };
}

function deriveLegacyFormat(paperAvailable: boolean, digitalAvailable: boolean): "online" | "hardcopy" | "both" {
  if (paperAvailable && digitalAvailable) return "both";
  if (paperAvailable) return "hardcopy";
  return "online";
}

function deriveLegacyPrice(
  paperAvailable: boolean,
  paperPrice: string | null,
  digitalAvailable: boolean,
  digitalPrice: string | null,
): string | null {
  // Legacy `price` is used as a fallback for the storefront.
  // Prefer the cheaper of the two (so "starting from" stays accurate).
  const candidates: number[] = [];
  if (paperAvailable && paperPrice) {
    const n = Number.parseFloat(String(paperPrice).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) candidates.push(n);
  }
  if (digitalAvailable && digitalPrice) {
    const n = Number.parseFloat(String(digitalPrice).replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) candidates.push(n);
  }
  if (candidates.length === 0) return null;
  return String(Math.min(...candidates));
}

router.post("/books", requireBooksAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    const fmt = validateBookFormatPayload(body);
    if (fmt.error) return res.status(400).json({ error: fmt.error });

    const legacyFormat = deriveLegacyFormat(fmt.paperAvailable, fmt.digitalAvailable);
    const legacyPrice = deriveLegacyPrice(
      fmt.paperAvailable, fmt.paperPrice, fmt.digitalAvailable, fmt.digitalPrice,
    );

    const [book] = await db.insert(books).values({
      title: String(body.title),
      author: body.author ? String(body.author) : null,
      description: body.description ? String(body.description) : null,
      coverImageUrl: body.coverImageUrl ? String(body.coverImageUrl) : null,
      category: (body.category as typeof books.$inferInsert["category"]) || "management",
      format: legacyFormat,
      price: legacyPrice,
      currency: body.currency ? String(body.currency) : "SAR",
      paperAvailable: fmt.paperAvailable,
      paperPrice: fmt.paperPrice,
      digitalAvailable: fmt.digitalAvailable,
      digitalPrice: fmt.digitalPrice,
      digitalFileUrl: fmt.digitalFileUrl,
      status: (body.status as typeof books.$inferInsert["status"]) || "available",
      isFeatured: Boolean(body.isFeatured),
      externalUrl: body.externalUrl ? String(body.externalUrl) : null,
      buyLink: body.buyLink ? String(body.buyLink) : null,
    }).returning();
    return res.status(201).json(book);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create book" });
  }
});

router.put("/books/:id", requireBooksAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const body = req.body as Record<string, unknown>;

    const [existing] = await db.select().from(books).where(eq(books.id, id));
    if (!existing) return res.status(404).json({ error: "Book not found" });

    const hasFormatPayload =
      body.paperAvailable !== undefined ||
      body.paperPrice !== undefined ||
      body.digitalAvailable !== undefined ||
      body.digitalPrice !== undefined ||
      body.digitalFileUrl !== undefined;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = String(body.title);
    if (body.author !== undefined) updates.author = body.author ? String(body.author) : null;
    if (body.description !== undefined) updates.description = body.description ? String(body.description) : null;
    if (body.coverImageUrl !== undefined) updates.coverImageUrl = body.coverImageUrl ? String(body.coverImageUrl) : null;
    if (body.category !== undefined) updates.category = body.category;
    if (body.currency !== undefined) updates.currency = body.currency ? String(body.currency) : "SAR";
    if (body.status !== undefined) updates.status = body.status;
    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.externalUrl !== undefined) updates.externalUrl = body.externalUrl ? String(body.externalUrl) : null;
    if (body.buyLink !== undefined) updates.buyLink = body.buyLink ? String(body.buyLink) : null;

    if (hasFormatPayload) {
      // Merge with current row so partial PATCH-like updates still validate correctly.
      const merged: Record<string, unknown> = {
        paperAvailable: body.paperAvailable !== undefined ? Boolean(body.paperAvailable) : existing.paperAvailable,
        paperPrice: body.paperPrice !== undefined ? body.paperPrice : existing.paperPrice,
        digitalAvailable: body.digitalAvailable !== undefined ? Boolean(body.digitalAvailable) : existing.digitalAvailable,
        digitalPrice: body.digitalPrice !== undefined ? body.digitalPrice : existing.digitalPrice,
        digitalFileUrl: body.digitalFileUrl !== undefined ? body.digitalFileUrl : existing.digitalFileUrl,
      };
      const fmt = validateBookFormatPayload(merged);
      if (fmt.error) return res.status(400).json({ error: fmt.error });
      updates.paperAvailable = fmt.paperAvailable;
      updates.paperPrice = fmt.paperPrice;
      updates.digitalAvailable = fmt.digitalAvailable;
      updates.digitalPrice = fmt.digitalPrice;
      updates.digitalFileUrl = fmt.digitalFileUrl;
      updates.format = deriveLegacyFormat(fmt.paperAvailable, fmt.digitalAvailable);
      updates.price = deriveLegacyPrice(
        fmt.paperAvailable, fmt.paperPrice, fmt.digitalAvailable, fmt.digitalPrice,
      );
    } else if (body.price !== undefined) {
      // Backwards compatibility: allow legacy `price` updates only when no format payload is provided.
      updates.price = body.price ? String(body.price) : null;
    }

    const [book] = await db.update(books).set(updates).where(eq(books.id, id)).returning();
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    return res.json(book);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update book" });
  }
});

router.delete("/books/:id", requireBooksAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(books).where(eq(books.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete book" });
  }
});

export default router;
