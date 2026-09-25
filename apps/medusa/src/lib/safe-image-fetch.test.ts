import { describe, it, expect, vi } from "vitest";
import { fetchPublicImage, ImageFetchError, isPrivateAddress } from "./safe-image-fetch";

describe("isPrivateAddress", () => {
  it("flags loopback, private, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });
});

const png = new Uint8Array([137, 80, 78, 71]);
const okFetch = vi.fn(async () => new Response(png, { status: 200, headers: { "content-type": "image/png" } }));
const publicLookup = async () => ["93.184.216.34"];

describe("fetchPublicImage", () => {
  it("downloads a public https image as base64", async () => {
    const out = await fetchPublicImage("https://cdn.example.com/covers/book.png", { lookup: publicLookup, fetchImpl: okFetch as never });
    expect(out).toEqual({ filename: "book.png", mimeType: "image/png", base64: Buffer.from(png).toString("base64") });
    expect((okFetch.mock.calls[0] as unknown[])[1]).toMatchObject({ redirect: "manual" });
  });

  it("refuses http, internal hosts and non-images", async () => {
    await expect(fetchPublicImage("http://cdn.example.com/a.png", { lookup: publicLookup, fetchImpl: okFetch as never })).rejects.toBeInstanceOf(ImageFetchError);
    await expect(fetchPublicImage("https://internal.example/a.png", { lookup: async () => ["169.254.169.254"], fetchImpl: okFetch as never })).rejects.toThrow(/not a public/);
    const html = vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } }));
    await expect(fetchPublicImage("https://cdn.example.com/a", { lookup: publicLookup, fetchImpl: html as never })).rejects.toThrow(/not an image/);
  });

  it("refuses redirects and files over the size limit", async () => {
    const redirect = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/" } }));
    await expect(fetchPublicImage("https://cdn.example.com/a.png", { lookup: publicLookup, fetchImpl: redirect as never })).rejects.toThrow(/redirect/);
    await expect(fetchPublicImage("https://cdn.example.com/a.png", { lookup: publicLookup, fetchImpl: okFetch as never, maxBytes: 2 })).rejects.toThrow(/too large/);
  });
});
