import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { Readable } from "stream";
import { deletePrivateFile, savePrivateFileStream } from "./private-file-store";

const dir = mkdtempSync(path.join(tmpdir(), "medusa-private-"));
const prev = { dir: process.env.PRIVATE_OBJECT_DIR, backend: process.env.OBJECT_STORAGE_BACKEND };

beforeAll(() => {
  process.env.PRIVATE_OBJECT_DIR = dir;
});
afterEach(() => {
  process.env.OBJECT_STORAGE_BACKEND = "local";
});
afterAll(() => {
  process.env.PRIVATE_OBJECT_DIR = prev.dir;
  process.env.OBJECT_STORAGE_BACKEND = prev.backend;
  rmSync(dir, { recursive: true, force: true });
});

describe("savePrivateFileStream", () => {
  it("writes the file plus the .meta.json sidecar the API reads", async () => {
    const { size } = await savePrivateFileStream(
      "book-files/v1/a.pdf",
      Readable.from([Buffer.from("hello "), Buffer.from("world")]),
      "application/pdf",
    );
    expect(size).toBe(11);
    const full = path.join(dir, "book-files/v1/a.pdf");
    expect(readFileSync(full, "utf8")).toBe("hello world");
    expect(JSON.parse(readFileSync(`${full}.meta.json`, "utf8"))).toMatchObject({
      contentType: "application/pdf",
      size: 11,
    });
  });

  it("rejects oversized streams and leaves nothing behind", async () => {
    await expect(
      savePrivateFileStream("book-files/v1/big.bin", Readable.from([Buffer.alloc(20)]), "application/zip", {
        maxBytes: 10,
      }),
    ).rejects.toThrow(/too large/i);
    expect(existsSync(path.join(dir, "book-files/v1/big.bin"))).toBe(false);
  });

  it("refuses keys that escape the private folder", async () => {
    await expect(
      savePrivateFileStream("../outside.pdf", Readable.from([Buffer.from("x")]), "application/pdf"),
    ).rejects.toThrow(/unsafe/i);
  });

  it("explains that only the local disk backend is supported", async () => {
    process.env.OBJECT_STORAGE_BACKEND = "gcs";
    await expect(
      savePrivateFileStream("book-files/v1/a.pdf", Readable.from([Buffer.from("x")]), "application/pdf"),
    ).rejects.toThrow(/OBJECT_STORAGE_BACKEND=local/);
  });
});

describe("deletePrivateFile", () => {
  it("removes the file and its sidecar; missing files are fine", async () => {
    await savePrivateFileStream("book-files/v2/a.pdf", Readable.from([Buffer.from("x")]), "application/pdf");
    await deletePrivateFile("book-files/v2/a.pdf");
    expect(existsSync(path.join(dir, "book-files/v2/a.pdf"))).toBe(false);
    expect(existsSync(path.join(dir, "book-files/v2/a.pdf.meta.json"))).toBe(false);
    await expect(deletePrivateFile("book-files/none/x.pdf")).resolves.toBeUndefined();
  });
});
