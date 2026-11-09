import type { ContentItem } from "@workspace/db";

export const SITE_URL = (process.env.SITE_URL || "https://darnozom.com").replace(/\/$/, "");
const FALLBACK_IMAGE = `${SITE_URL}/opengraph.jpg`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const absolute = (u: string) => (!u ? FALLBACK_IMAGE : /^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);

/**
 * Replaces the site-wide title/description/canonical/OG/Twitter tags in the SPA shell with
 * ones describing a single item, so link-preview crawlers (which never run JS) see them.
 */
export function injectOg(html: string, item: ContentItem, path: string): string {
  const title = item.titleAr;
  const description = clip(item.summaryAr.trim() || plain(item.bodyAr), 200) || title;
  const url = `${SITE_URL}${path}`;
  const image = absolute(item.coverImageUrl);
  const meta = (attr: "property" | "name", key: string, value: string) => `<meta ${attr}="${key}" content="${esc(value)}" />`;
  const tags = [
    meta("name", "description", description),
    `<link rel="canonical" href="${esc(url)}" />`,
    meta("property", "og:type", "article"),
    meta("property", "og:site_name", "دار نظم | DarNozom"),
    meta("property", "og:url", url),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("property", "og:image", image),
    meta("property", "og:locale", "ar_EG"),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:url", url),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:image", image),
  ];
  if (item.publishedAt) tags.push(meta("property", "article:published_time", item.publishedAt.toISOString()));

  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*|title|description)"[^>]*?(?:\/>|>)/gi, "")
    .replace(/<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*|description)"\s*content="[^"]*"\s*\/>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/i, "");
  return stripped.replace("</head>", `    <title>${esc(title)} | دار نظم</title>\n    ${tags.join("\n    ")}\n  </head>`);
}
