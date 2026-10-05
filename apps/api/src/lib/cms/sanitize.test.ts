import { describe, expect, it } from "vitest";
import { sanitizeItem, sanitizeRichHtml } from "./sanitize";
import { parseContentItem } from "./schemas";

describe("sanitizeRichHtml", () => {
  it("removes scripts, event handlers and javascript: links", () => {
    const out = sanitizeRichHtml(
      '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="/a.png" onerror="y()">',
    );
    expect(out).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(out).toContain("<p>Hi</p>");
    expect(out).toContain('<img src="/a.png" />');
  });
  it("keeps headings, lists, quotes and safe links with rel", () => {
    const out = sanitizeRichHtml('<h2>T</h2><ul><li>a</li></ul><blockquote>q</blockquote><a href="https://x.org">x</a>');
    expect(out).toContain("<h2>T</h2>");
    expect(out).toContain("<ul><li>a</li></ul>");
    expect(out).toContain('<a href="https://x.org" rel="noopener noreferrer">x</a>');
  });
});

describe("sanitizeItem", () => {
  it("cleans body and HTML detail fields", () => {
    const parsed = parseContentItem({
      type: "observatory",
      titleAr: "ع",
      bodyAr: "<p>ok</p><script>bad()</script>",
      details: { kind: "daily_brief", ourReadingAr: '<p onmouseover="z()">r</p>' },
    });
    if (!parsed.ok) throw new Error("expected valid");
    const clean = sanitizeItem(parsed.value);
    expect(clean.bodyAr).toBe("<p>ok</p>");
    expect(clean.details.ourReadingAr).toBe("<p>r</p>");
  });
});
