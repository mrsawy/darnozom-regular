import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import path from "path";
import fs from "fs";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rawFile = req.params.file;
  if (!rawFile || rawFile.includes("..")) {
    res.status(400).json({ error: "Invalid file name" });
    return;
  }

  const file = decodeURIComponent(rawFile);
  const uploadDir =
    process.env.MEDUSA_UPLOAD_DIR || path.join(process.cwd(), "static");
  const filePath = path.join(uploadDir, file);

  if (!fs.existsSync(filePath)) {
    // Also fallback to cwd/static if uploadDir was customized
    const fallbackPath = path.join(process.cwd(), "static", file);
    if (fs.existsSync(fallbackPath)) {
      res.sendFile(path.resolve(fallbackPath));
      return;
    }
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(path.resolve(filePath));
}

