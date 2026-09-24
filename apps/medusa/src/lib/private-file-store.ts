import { createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { Transform, type Readable } from "stream";
import { pipeline } from "stream/promises";

// Writes digital-book files into the private object store that apps/api
// reads from (PRIVATE_OBJECT_DIR, local disk backend). Medusa can't load
// @workspace/object-store at runtime — that package ships TypeScript source
// with `.js` import specifiers that only resolve under the API's bundler —
// so the local-disk layout (file + `<file>.meta.json` sidecar) is mirrored
// here. Production uses OBJECT_STORAGE_BACKEND=local (deploy/deploy.sh).

function privateRoot(): string {
  const backend = (process.env.OBJECT_STORAGE_BACKEND || "local").toLowerCase();
  if (!["local", "disk", "fs"].includes(backend)) {
    throw new Error(
      "Digital file uploads from Medusa require OBJECT_STORAGE_BACKEND=local (shared PRIVATE_OBJECT_DIR with the API)",
    );
  }
  const dir = process.env.PRIVATE_OBJECT_DIR?.trim();
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR is not set — Medusa must share the API's private file folder");
  }
  return path.resolve(dir);
}

function absolutePath(relativeKey: string): string {
  const root = privateRoot();
  const key = relativeKey.replace(/\\/g, "/");
  const full = path.resolve(root, key);
  if (
    !key ||
    path.isAbsolute(key) ||
    key.split("/").some((p) => p === "" || p === "." || p === "..") ||
    !full.startsWith(root + path.sep)
  ) {
    throw new Error(`Unsafe object key: ${relativeKey}`);
  }
  return full;
}

export async function savePrivateFileStream(
  relativeKey: string,
  source: Readable,
  contentType: string,
  opts?: { maxBytes?: number },
): Promise<{ size: number }> {
  const full = absolutePath(relativeKey);
  const maxBytes = opts?.maxBytes ?? Number.POSITIVE_INFINITY;
  let size = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > maxBytes) {
        cb(new Error(`File too large (max ${maxBytes} bytes)`));
        return;
      }
      cb(null, chunk);
    },
  });

  await fs.mkdir(path.dirname(full), { recursive: true });
  try {
    await pipeline(source, counter, createWriteStream(full));
  } catch (err) {
    await fs.rm(full, { force: true });
    throw err;
  }
  await fs.writeFile(
    `${full}.meta.json`,
    JSON.stringify({ contentType, size, savedAt: new Date().toISOString() }),
    "utf8",
  );
  return { size };
}

export async function deletePrivateFile(relativeKey: string): Promise<void> {
  const full = absolutePath(relativeKey);
  await fs.rm(full, { force: true });
  await fs.rm(`${full}.meta.json`, { force: true });
}
