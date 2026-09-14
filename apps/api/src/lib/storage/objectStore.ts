import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";
import type { Readable } from "stream";
import {
  ObjectStorageService,
  objectStorageClient,
} from "./objectStorage";

/**
 * Object storage backend.
 *
 * - `local` (default): files under PRIVATE_OBJECT_DIR on disk. Required for the
 *   VPS — the Replit GCS sidecar is not available there.
 * - `replit` / `gcs`: legacy @google-cloud/storage + Replit sidecar.
 */
export function isLocalObjectStorage(): boolean {
  const backend = (process.env.OBJECT_STORAGE_BACKEND || "local").toLowerCase();
  return backend === "local" || backend === "disk" || backend === "fs";
}

const objectStorageService = new ObjectStorageService();

export function getPrivateRoot(): string {
  return objectStorageService.getPrivateObjectDir().replace(/\/+$/, "");
}

function assertSafeRelativeKey(relativeKey: string): string {
  const normalized = relativeKey.replace(/^\/+/, "").replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("..") ||
    path.isAbsolute(normalized) ||
    normalized.split("/").some((p) => p === "" || p === "." || p === "..")
  ) {
    throw new Error(`Unsafe object key: ${relativeKey}`);
  }
  return normalized;
}

export function absolutePrivatePath(relativeKey: string): string {
  const key = assertSafeRelativeKey(relativeKey);
  const root = path.resolve(getPrivateRoot());
  const full = path.resolve(root, key);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Object path escapes private root: ${relativeKey}`);
  }
  return full;
}

/** Persist bytes under PRIVATE_OBJECT_DIR/{relativeKey} (local or GCS). */
export async function savePrivateObject(
  relativeKey: string,
  data: Buffer,
  contentType: string,
  opts?: { cacheControl?: string },
): Promise<void> {
  const key = assertSafeRelativeKey(relativeKey);
  if (isLocalObjectStorage()) {
    const full = absolutePrivatePath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    await fs.writeFile(
      `${full}.meta.json`,
      JSON.stringify({
        contentType,
        size: data.length,
        cacheControl: opts?.cacheControl,
        savedAt: new Date().toISOString(),
      }),
      "utf8",
    );
    return;
  }

  const fullPath = `${getPrivateRoot()}/${key}`;
  const pathParts = fullPath.replace(/^\//, "").split("/");
  const bucketName = pathParts[0];
  const objectName = pathParts.slice(1).join("/");
  await objectStorageClient.bucket(bucketName).file(objectName).save(data, {
    contentType,
    metadata: { cacheControl: opts?.cacheControl ?? "private, max-age=0" },
  });
}

export async function privateObjectExists(relativeKey: string): Promise<boolean> {
  const key = assertSafeRelativeKey(relativeKey);
  if (isLocalObjectStorage()) {
    return existsSync(absolutePrivatePath(key));
  }
  const fullPath = `${getPrivateRoot()}/${key}`;
  const pathParts = fullPath.replace(/^\//, "").split("/");
  const [exists] = await objectStorageClient
    .bucket(pathParts[0])
    .file(pathParts.slice(1).join("/"))
    .exists();
  return exists;
}

export async function readPrivateObjectMeta(
  relativeKey: string,
): Promise<{ contentType: string; size: number; cacheControl?: string } | null> {
  const key = assertSafeRelativeKey(relativeKey);
  if (isLocalObjectStorage()) {
    const full = absolutePrivatePath(key);
    if (!existsSync(full)) return null;
    try {
      const raw = await fs.readFile(`${full}.meta.json`, "utf8");
      const parsed = JSON.parse(raw) as {
        contentType?: string;
        size?: number;
        cacheControl?: string;
      };
      const st = await fs.stat(full);
      return {
        contentType: parsed.contentType || "application/octet-stream",
        size: typeof parsed.size === "number" ? parsed.size : st.size,
        cacheControl: parsed.cacheControl,
      };
    } catch {
      const st = await fs.stat(full);
      return { contentType: "application/octet-stream", size: st.size };
    }
  }

  const fullPath = `${getPrivateRoot()}/${key}`;
  const pathParts = fullPath.replace(/^\//, "").split("/");
  const file = objectStorageClient
    .bucket(pathParts[0])
    .file(pathParts.slice(1).join("/"));
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  return {
    contentType: (meta.contentType as string) || "application/octet-stream",
    size: meta.size ? Number(meta.size) : 0,
    cacheControl: meta.cacheControl as string | undefined,
  };
}

export function openPrivateObjectStream(relativeKey: string): Readable {
  const key = assertSafeRelativeKey(relativeKey);
  if (isLocalObjectStorage()) {
    return createReadStream(absolutePrivatePath(key));
  }
  const fullPath = `${getPrivateRoot()}/${key}`;
  const pathParts = fullPath.replace(/^\//, "").split("/");
  return objectStorageClient
    .bucket(pathParts[0])
    .file(pathParts.slice(1).join("/"))
    .createReadStream();
}

/** Map `/objects/book-covers/uuid` → `book-covers/uuid`. */
export function entityKeyFromObjectPath(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) {
    throw new Error(`Not an object entity path: ${objectPath}`);
  }
  return assertSafeRelativeKey(objectPath.slice("/objects/".length));
}

/** Prefixes that may be served without a session (site imagery). */
export const PUBLIC_OBJECT_PREFIXES = [
  "book-covers/",
  "events/",
  "academy/",
  "store/",
  "uploads/",
] as const;

export function isPublicObjectKey(relativeKey: string): boolean {
  const key = relativeKey.replace(/^\/+/, "");
  return PUBLIC_OBJECT_PREFIXES.some((p) => key.startsWith(p));
}
