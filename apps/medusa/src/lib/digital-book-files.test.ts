import { describe, it, expect } from "vitest";
import {
  MAX_DIGITAL_FILE_BYTES,
  digitalFileKind,
  digitalFileObjectKey,
  mimeTypeForFileName,
  safeFileName,
} from "./digital-book-files";

describe("safeFileName", () => {
  it("strips directories and unsafe characters but keeps the extension", () => {
    expect(safeFileName("../../etc/Chapter 1 (final).PDF")).toBe("Chapter-1-final.pdf");
    expect(safeFileName("C:\\books\\كتاب.epub")).toBe("file.epub");
  });

  it("falls back to 'file' when nothing usable remains", () => {
    expect(safeFileName("")).toBe("file");
    expect(safeFileName("...")).toBe("file");
  });
});

describe("mimeTypeForFileName", () => {
  it("maps known book formats", () => {
    expect(mimeTypeForFileName("a.pdf")).toBe("application/pdf");
    expect(mimeTypeForFileName("a.EPUB")).toBe("application/epub+zip");
    expect(mimeTypeForFileName("a.mp3")).toBe("audio/mpeg");
    expect(mimeTypeForFileName("a.zip")).toBe("application/zip");
  });

  it("uses octet-stream for anything else", () => {
    expect(mimeTypeForFileName("notes.docx")).toBe("application/octet-stream");
    expect(mimeTypeForFileName("noext")).toBe("application/octet-stream");
  });
});

describe("digitalFileKind", () => {
  it("classifies by mime type", () => {
    expect(digitalFileKind("application/pdf")).toBe("pdf");
    expect(digitalFileKind("application/epub+zip")).toBe("epub");
    expect(digitalFileKind("audio/mpeg")).toBe("audio");
    expect(digitalFileKind("application/zip")).toBe("other");
  });
});

describe("digitalFileObjectKey", () => {
  it("namespaces by variant and prefixes a unique id", () => {
    expect(digitalFileObjectKey("variant_1", "Book.pdf", "abc")).toBe(
      "book-files/variant_1/abc-Book.pdf",
    );
  });

  it("rejects variant ids that could escape the folder", () => {
    expect(() => digitalFileObjectKey("../x", "a.pdf", "abc")).toThrow();
  });
});

describe("MAX_DIGITAL_FILE_BYTES", () => {
  it("is 200 MB", () => {
    expect(MAX_DIGITAL_FILE_BYTES).toBe(200 * 1024 * 1024);
  });
});
