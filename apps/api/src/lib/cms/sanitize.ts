import sanitizeHtml from "sanitize-html";
import { HTML_DETAIL_KEYS, type ContentItemInput } from "./schemas";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li",
    "blockquote", "a", "img", "hr", "table", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption", "code", "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeRichHtml(html: string): string {
  return html ? sanitizeHtml(html, OPTIONS).trim() : "";
}

export function sanitizeItem(v: ContentItemInput): ContentItemInput {
  const details: Record<string, unknown> = { ...v.details };
  for (const key of HTML_DETAIL_KEYS) {
    if (typeof details[key] === "string") details[key] = sanitizeRichHtml(details[key] as string);
  }
  return { ...v, bodyAr: sanitizeRichHtml(v.bodyAr), bodyEn: sanitizeRichHtml(v.bodyEn), details };
}
