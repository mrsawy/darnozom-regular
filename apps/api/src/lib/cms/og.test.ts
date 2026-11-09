import { describe, expect, it } from "vitest";
import { injectOg } from "./og";

const shell = `<html><head><title>Site</title><meta name="description" content="old" />
<meta property="og:title" content="old" /><meta property="og:image" content="x" />
<meta name="twitter:title" content="old" /><link rel="canonical" href="https://darnozom.com/" /></head><body></body></html>`;
const item: any = { titleAr: 'عنوان "مقال" <b>', summaryAr: "ملخص", bodyAr: "<p>نص</p>", coverImageUrl: "/uploads/c.jpg", publishedAt: new Date("2026-01-01T00:00:00Z") };

describe("injectOg", () => {
  const out = injectOg(shell, item, "/articles/a-1");
  it("replaces site-wide tags with item tags, escaped", () => {
    expect(out.match(/og:title/g)).toHaveLength(1);
    expect(out).toContain('og:title" content="عنوان &quot;مقال&quot; &lt;b&gt;"');
    expect(out).toContain('og:url" content="https://darnozom.com/articles/a-1"');
    expect(out).toContain('og:image" content="https://darnozom.com/uploads/c.jpg"');
    expect(out).toContain('rel="canonical" href="https://darnozom.com/articles/a-1"');
    expect(out).not.toContain('content="old"');
    expect(out.match(/<title>/g)).toHaveLength(1);
  });
  it("falls back to body text and the default image", () => {
    const o = injectOg(shell, { ...item, summaryAr: "", coverImageUrl: "" }, "/x/y");
    expect(o).toContain('og:description" content="نص"');
    expect(o).toContain("/opengraph.jpg");
  });
});
