import { Router, type Response } from "express";
import { db, orders, orderItems } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import {
  openPrivateObjectStream,
  privateObjectExists,
  readPrivateObjectMeta,
} from "@workspace/object-store";
import { requireAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import {
  getDigitalFile,
  listDigitalFilesForVariants,
  type DigitalFile,
} from "../../lib/medusa-digital-files";

// "My Library": the signed-in customer's digital books. Files unlock once the
// order's payment is confirmed (paymentStatus = "paid") and the order is not
// cancelled. Files are resolved live from Medusa by the variant bought, so
// files the admin adds later reach earlier buyers too.
const router = Router();

type LibraryFile = {
  id: string;
  title: string;
  fileName: string;
  kind: "pdf" | "epub" | "audio" | "other";
  size: number | null;
  url: string;
};

type LibraryBook = {
  key: string;
  title: string;
  imageUrl: string | null;
  orderId: number;
  status: "available" | "awaiting_payment";
  files: LibraryFile[];
  filesUnavailable?: boolean;
};

function fileKind(mime: string): LibraryFile["kind"] {
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/epub+zip") return "epub";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}

function toLibraryFile(f: DigitalFile): LibraryFile {
  return {
    id: f.id,
    title: f.title,
    fileName: f.file_name,
    kind: fileKind(f.mime_type),
    size: f.size,
    url: `/api/account/me/library/files/${encodeURIComponent(f.id)}`,
  };
}

router.get("/account/me/library", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const rows = await db
    .select({ order: orders, item: orderItems })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        ne(orders.status, "cancelled"),
        eq(orderItems.format, "digital"),
      ),
    );

  // One entry per edition (a book bought twice shows once, paid wins).
  const books = new Map<string, LibraryBook & { variantId: string | null; legacyFile: LibraryFile | null }>();
  for (const { order, item } of rows) {
    const key = item.variantId ?? `item-${item.id}`;
    const paid = order.paymentStatus === "paid";
    const legacyFile: LibraryFile | null =
      !item.variantId && item.digitalFileUrlSnapshot
        ? {
            id: `legacy-${item.id}`,
            title: item.productTitle,
            fileName: `${item.productTitle}.pdf`,
            kind: "pdf",
            size: null,
            url: `/api/account/me/orders/${order.id}/items/${item.id}/file`,
          }
        : null;
    const existing = books.get(key);
    if (existing && (existing.status === "available" || !paid)) continue;
    books.set(key, {
      key,
      title: item.productTitle,
      imageUrl: item.imageUrl ?? null,
      orderId: order.id,
      status: paid ? "available" : "awaiting_payment",
      files: [],
      variantId: item.variantId,
      legacyFile,
    });
  }

  const paidVariantIds = [...books.values()]
    .filter((b) => b.status === "available" && b.variantId)
    .map((b) => b.variantId!) as string[];

  let files: DigitalFile[] = [];
  let filesUnavailable = false;
  try {
    files = await listDigitalFilesForVariants(paidVariantIds);
  } catch (err) {
    req.log.error({ err }, "library: loading digital files from Medusa failed");
    filesUnavailable = true;
  }

  const result: LibraryBook[] = [...books.values()].map(({ variantId, legacyFile, ...book }) => {
    if (book.status !== "available") return book;
    if (legacyFile) return { ...book, files: [legacyFile] };
    if (filesUnavailable) return { ...book, filesUnavailable: true };
    return {
      ...book,
      files: files.filter((f) => f.variant_id === variantId).map(toLibraryFile),
    };
  });

  return res.json({ books: result });
});

router.get(
  "/account/me/library/files/:fileId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const file = await getDigitalFile(String(req.params.fileId));
    if (!file) return res.status(404).json({ error: "File not found" });

    const [owned] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.paymentStatus, "paid"),
          ne(orders.status, "cancelled"),
          eq(orderItems.format, "digital"),
          eq(orderItems.variantId, file.variant_id),
        ),
      )
      .limit(1);
    if (!owned) {
      return res.status(403).json({ error: "You don't have access to this file yet" });
    }

    if (!(await privateObjectExists(file.relative_key))) {
      return res.status(404).json({ error: "File not found in storage" });
    }
    const meta = await readPrivateObjectMeta(file.relative_key);
    const download = String(req.query.download || "") === "1";
    const inline = !download && (file.mime_type === "application/pdf" || file.mime_type.startsWith("audio/"));
    const safeName = file.file_name.replace(/["\\\r\n]/g, "");

    res.setHeader("Content-Type", file.mime_type);
    if (meta?.size) res.setHeader("Content-Length", String(meta.size));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${safeName}"`);

    const stream = openPrivateObjectStream(file.relative_key);
    stream.on("error", (err) => {
      req.log.error({ err, fileId: file.id }, "library file stream error");
      if (!res.headersSent) res.status(500).end();
      else res.destroy();
    });
    stream.pipe(res);
    return;
  },
);

export default router;
