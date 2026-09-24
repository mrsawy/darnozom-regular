import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { requireAdmin } from "../../middlewares/adminAuth";
import { medusaAdmin, medusaAdminAuthHeader } from "../../lib/medusa-admin";

// Storefront-admin editor for the Vodafone Cash / InstaPay details. Medusa
// (manualPayment module) is the source of truth; this only proxies to its
// admin API so both dashboards edit the same rows.
const router = Router();
const CODES = new Set(["vodafone_cash", "instapay"]);
const QR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (QR_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, and WebP images are allowed"));
  },
});

/** medusaAdmin() errors look like "… failed (400): {json}" — recover Medusa's 400 message. */
function medusaValidationError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : "";
  const m = /failed \(400\): (.*)$/s.exec(msg);
  if (!m) return null;
  try {
    return (JSON.parse(m[1]) as { error?: string }).error ?? m[1];
  } catch {
    return m[1];
  }
}

router.get("/admin/manual-payments", requireAdmin, async (req, res) => {
  try {
    return res.json(await medusaAdmin("/admin/manual-payment-methods"));
  } catch (err) {
    req.log.error({ err }, "manual payments settings fetch failed");
    return res.status(502).json({ error: "Could not load settings from Medusa" });
  }
});

router.put("/admin/manual-payments/:code", requireAdmin, async (req, res) => {
  const code = String(req.params.code);
  if (!CODES.has(code)) return res.status(400).json({ error: "Unknown payment method" });
  try {
    const body = await medusaAdmin(`/admin/manual-payment-methods/${code}`, {
      method: "POST",
      body: JSON.stringify(req.body ?? {}),
    });
    return res.json(body);
  } catch (err) {
    const validation = medusaValidationError(err);
    if (validation) return res.status(400).json({ error: validation });
    req.log.error({ err }, "manual payments settings save failed");
    return res.status(502).json({ error: "Could not save settings to Medusa" });
  }
});

router.post(
  "/admin/manual-payments/qr",
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large (max 2 MB)" });
      }
      if (err) return res.status(400).json({ error: (err as Error).message });
      return next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No image file provided" });
    const backend = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "");
    if (!backend) return res.status(500).json({ error: "MEDUSA_BACKEND_URL is not set" });
    try {
      // Not via medusaAdmin(): it forces a JSON Content-Type, which would
      // break the multipart boundary.
      const form = new FormData();
      form.append(
        "files",
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        req.file.originalname || "qr.png",
      );
      const r = await fetch(`${backend}/admin/uploads`, {
        method: "POST",
        headers: { Authorization: medusaAdminAuthHeader() },
        body: form,
      });
      if (!r.ok) {
        throw new Error(`Medusa upload failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
      }
      const body = (await r.json()) as { files?: Array<{ url: string }> };
      const url = body.files?.[0]?.url;
      if (!url) throw new Error("Medusa upload returned no file url");
      return res.json({ url });
    } catch (err) {
      req.log.error({ err }, "manual payment QR upload failed");
      return res.status(502).json({ error: "Could not upload the QR image to Medusa" });
    }
  },
);

export default router;
