import { describe, expect, it } from "vitest";
import { formatCount, shareUrl } from "./cms-engagement";

describe("cms engagement helpers", () => {
  it("builds encoded share-intent URLs", () => {
    const url = "https://darnozom.com/a?x=1&y=2";
    expect(shareUrl("x", url, "عنوان")).toBe(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent("عنوان")}`);
    expect(shareUrl("whatsapp", url, "T")).toContain("wa.me/?text=T%20https");
    expect(shareUrl("facebook", url, "T")).toContain(encodeURIComponent(url));
  });
  it("formats counts compactly", () => {
    expect(formatCount(1200, "en")).toBe("1.2K");
    expect(formatCount(7, "en")).toBe("7");
  });
});
