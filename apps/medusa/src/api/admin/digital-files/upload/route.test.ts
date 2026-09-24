import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));
vi.mock("../../../../lib/private-file-store", () => ({ savePrivateFileStream: saveMock }));

import { POST } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fakeReq(opts: {
  query: Record<string, string>;
  variant?: any;
  headers?: Record<string, string>;
  existing?: any[];
}) {
  const req = Readable.from([Buffer.from("%PDF-1.7")]) as any;
  req.query = opts.query;
  req.headers = opts.headers ?? {};
  const createDigitalBookFiles = vi.fn(async (d: any) => ({ id: "dbf_1", ...d }));
  const listFilesForVariants = vi.fn(async () => opts.existing ?? []);
  const graph = vi.fn(async () => ({ data: opts.variant ? [opts.variant] : [] }));
  req.scope = {
    resolve: (k: string) =>
      k === "query" ? { graph } : { createDigitalBookFiles, listFilesForVariants },
  };
  return { req, createDigitalBookFiles };
}

const digitalVariant = { id: "variant_1", metadata: { kind: "digital" } };

describe("POST /admin/digital-files/upload", () => {
  beforeEach(() => {
    saveMock.mockReset().mockResolvedValue({ size: 8 });
  });

  it("streams the file to private storage and records it after existing files", async () => {
    const { req, createDigitalBookFiles } = fakeReq({
      query: { variant_id: "variant_1", filename: "Chapter 1.pdf", title: "Chapter 1" },
      variant: digitalVariant,
      existing: [{ id: "a" }, { id: "b" }],
    });
    const res = fakeRes();
    await POST(req, res);
    const [key, stream, mime, opts] = saveMock.mock.calls[0];
    expect(key).toMatch(/^book-files\/variant_1\/[0-9a-f-]+-Chapter-1\.pdf$/);
    expect(stream).toBe(req);
    expect(mime).toBe("application/pdf");
    expect(opts).toEqual({ maxBytes: 200 * 1024 * 1024 });
    expect(createDigitalBookFiles).toHaveBeenCalledWith({
      variant_id: "variant_1",
      title: "Chapter 1",
      file_name: "Chapter-1.pdf",
      relative_key: key,
      mime_type: "application/pdf",
      size: 8,
      sort_order: 2,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("defaults the title to the uploaded file name", async () => {
    const { req, createDigitalBookFiles } = fakeReq({
      query: { variant_id: "variant_1", filename: "audio.mp3" },
      variant: digitalVariant,
    });
    await POST(req, fakeRes());
    expect(createDigitalBookFiles.mock.calls[0][0]).toMatchObject({
      title: "audio.mp3",
      mime_type: "audio/mpeg",
    });
  });

  it("rejects a non-digital or unknown variant", async () => {
    for (const variant of [{ id: "variant_1", metadata: { kind: "paper" } }, undefined]) {
      const { req } = fakeReq({ query: { variant_id: "variant_1", filename: "a.pdf" }, variant });
      const res = fakeRes();
      await POST(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("413s when Content-Length is over the limit, before reading the body", async () => {
    const { req } = fakeReq({
      query: { variant_id: "variant_1", filename: "a.zip" },
      variant: digitalVariant,
      headers: { "content-length": String(300 * 1024 * 1024) },
    });
    const res = fakeRes();
    await POST(req, res);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("413s when the stream turns out too large", async () => {
    saveMock.mockRejectedValue(new Error("File too large (max 1 bytes)"));
    const { req, createDigitalBookFiles } = fakeReq({
      query: { variant_id: "variant_1", filename: "a.zip" },
      variant: digitalVariant,
    });
    const res = fakeRes();
    await POST(req, res);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(createDigitalBookFiles).not.toHaveBeenCalled();
  });

  it("400s without variant_id or filename", async () => {
    const { req } = fakeReq({ query: { variant_id: "variant_1" }, variant: digitalVariant });
    const res = fakeRes();
    await POST(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
