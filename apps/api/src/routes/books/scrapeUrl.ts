import * as cheerio from "cheerio";

// cheerio's underlying node type isn't re-exported stably; derive it from
// CheerioAPI so we accept whatever element form the loader produces.
type CheerioElement = Parameters<cheerio.CheerioAPI>[0] extends infer T
  ? T extends ArrayLike<infer U> ? U : T
  : never;

export type ScrapeResult = {
  title: string | null;
  description: string | null;
  image: string | null;
  author: string | null;
  siteName: string | null;
  price: string | null;
  currency: string | null;
  url: string;
  finalUrl: string;
  fetched: string[];
  missing: string[];
  warnings: string[];
};

const FIELDS = ["title", "author", "description", "image", "price"] as const;

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

function decodeEntities(s: string): string {
  if (!s) return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 16));
      } catch {
        return _;
      }
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function clean(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const v = decodeEntities(s).replace(/\s+/g, " ").trim();
  return v.length > 0 ? v : null;
}

export const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif|avif|svg\+xml);base64,/i;

function absoluteUrl(src: string | null | undefined, base: string): string | null {
  if (!src || typeof src !== "string") return null;
  let trimmed = decodeEntities(src).trim();
  if (!trimmed) return null;
  // Strip surrounding quotes that sometimes leak from inline styles
  trimmed = trimmed.replace(/^['"]+|['"]+$/g, "").trim();
  if (!trimmed) return null;
  // Accept embedded base64 image URIs only when they are real images with
  // enough payload to be more than a 1×1 placeholder.
  if (trimmed.toLowerCase().startsWith("data:")) {
    if (DATA_IMAGE_RE.test(trimmed) && trimmed.length > 512) return trimmed;
    return null;
  }
  // Protocol-relative URLs (//cdn.example.com/...)
  if (trimmed.startsWith("//")) {
    try {
      const baseProto = new URL(base).protocol;
      return new URL(`${baseProto}${trimmed}`).toString();
    } catch {
      return null;
    }
  }
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return null;
  }
}

function flattenJsonLd(node: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenJsonLd(item, out);
    return out;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    out.push(obj);
    if (obj["@graph"]) flattenJsonLd(obj["@graph"], out);
    if (obj.mainEntity) flattenJsonLd(obj.mainEntity, out);
    if (obj.itemListElement) flattenJsonLd(obj.itemListElement, out);
  }
  return out;
}

function pickJsonLdString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return clean(value);
  if (Array.isArray(value)) {
    for (const v of value) {
      const r = pickJsonLdString(v);
      if (r) return r;
    }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === "string") return clean(obj.name);
    if (typeof obj["@value"] === "string") return clean(obj["@value"] as string);
    if (typeof obj.url === "string") return clean(obj.url);
  }
  return null;
}

function collectJsonLdImages(value: unknown, out: string[] = []): string[] {
  if (!value) return out;
  if (typeof value === "string") {
    const v = value.trim();
    if (v) out.push(v);
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectJsonLdImages(v, out);
    return out;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string" && obj.url.trim()) out.push(obj.url.trim());
    if (typeof obj.contentUrl === "string" && obj.contentUrl.trim()) out.push(obj.contentUrl.trim());
    if (Array.isArray(obj.url)) collectJsonLdImages(obj.url, out);
    if (Array.isArray(obj.contentUrl)) collectJsonLdImages(obj.contentUrl, out);
    if (obj.thumbnail) collectJsonLdImages(obj.thumbnail, out);
  }
  return out;
}

function typeMatches(t: unknown, names: string[]): boolean {
  if (!t) return false;
  const arr = Array.isArray(t) ? t : [t];
  return arr.some((v) => typeof v === "string" && names.some((n) => v.toLowerCase().includes(n.toLowerCase())));
}

function extractFromJsonLd($: cheerio.CheerioAPI): { partial: Partial<ScrapeResult>; images: string[] } {
  const result: Partial<ScrapeResult> = {};
  const images: string[] = [];
  const blocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt);
      flattenJsonLd(parsed, blocks);
    } catch {
      try {
        const cleaned = txt.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "").trim();
        const parsed = JSON.parse(cleaned);
        flattenJsonLd(parsed, blocks);
      } catch {
        /* ignore */
      }
    }
  });

  const priority = ["Book", "Product", "Article", "WebPage"];
  blocks.sort((a, b) => {
    const ai = priority.findIndex((p) => typeMatches(a["@type"], [p]));
    const bi = priority.findIndex((p) => typeMatches(b["@type"], [p]));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const obj of blocks) {
    if (!result.title) {
      const t = pickJsonLdString(obj.name) || pickJsonLdString(obj.headline);
      if (t) result.title = t;
    }
    if (!result.description) {
      const d = pickJsonLdString(obj.description);
      if (d) result.description = d;
    }
    if (obj.image) collectJsonLdImages(obj.image, images);
    if (obj.thumbnailUrl) collectJsonLdImages(obj.thumbnailUrl, images);
    if (!result.author) {
      const a = pickJsonLdString(obj.author) || pickJsonLdString(obj.creator);
      if (a) result.author = a;
    }
    if (!result.price || !result.currency) {
      const offers = obj.offers as unknown;
      if (offers) {
        const offerArr = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerArr) {
          if (typeof offer !== "object" || !offer) continue;
          const o = offer as Record<string, unknown>;
          if (!result.price) {
            const p = pickJsonLdString(o.price) || pickJsonLdString(o.lowPrice);
            if (p) result.price = p;
          }
          if (!result.currency) {
            const c = pickJsonLdString(o.priceCurrency);
            if (c) result.currency = c;
          }
          if (result.price && result.currency) break;
        }
      }
    }
  }
  if (images.length > 0) result.image = images[0];
  return { partial: result, images };
}

function metaContent($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const sel of selectors) {
    const v = $(sel).first().attr("content");
    if (v && v.trim()) return v;
  }
  return null;
}

function metaContentAll($: cheerio.CheerioAPI, selectors: string[]): string[] {
  const out: string[] = [];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const v = $(el).attr("content");
      if (v && v.trim()) out.push(v);
    });
  }
  return out;
}

function extractFromMeta($: cheerio.CheerioAPI): { partial: Partial<ScrapeResult>; images: string[] } {
  const r: Partial<ScrapeResult> = {};
  r.title = metaContent($, [
    'meta[property="og:title"]',
    'meta[name="og:title"]',
    'meta[name="twitter:title"]',
    'meta[itemprop="name"]',
  ]);
  r.description = metaContent($, [
    'meta[property="og:description"]',
    'meta[name="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
    'meta[itemprop="description"]',
  ]);
  const images = metaContentAll($, [
    'meta[property="og:image:secure_url"]',
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'meta[itemprop="image"]',
    'link[rel="image_src"]',
  ]);
  // link[rel=image_src] uses href instead of content
  $('link[rel="image_src"]').each((_, el) => {
    const v = $(el).attr("href");
    if (v && v.trim()) images.push(v);
  });
  if (images.length > 0) r.image = images[0];
  r.author = metaContent($, [
    'meta[property="book:author"]',
    'meta[property="og:author"]',
    'meta[name="author"]',
    'meta[name="book:author"]',
    'meta[itemprop="author"]',
  ]);
  r.price = metaContent($, [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[itemprop="price"]',
  ]);
  r.currency = metaContent($, [
    'meta[property="product:price:currency"]',
    'meta[property="og:price:currency"]',
    'meta[itemprop="priceCurrency"]',
  ]);
  return { partial: r, images };
}

function firstNonEmpty($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length === 0) continue;
    const txt = el.text();
    const c = clean(txt);
    if (c) return c;
  }
  return null;
}

// Extract the highest-resolution candidate from a srcset value.
function pickFromSrcset(srcset: string): string | null {
  if (!srcset) return null;
  const parts = srcset
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  let best: { url: string; weight: number } | null = null;
  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const url = tokens[0];
    if (!url) continue;
    let weight = 1;
    if (tokens[1]) {
      const m = tokens[1].match(/^(\d+(?:\.\d+)?)([wx])$/);
      if (m) {
        const n = parseFloat(m[1]);
        weight = m[2] === "w" ? n : n * 1000; // density multiplier
      }
    }
    if (!best || weight > best.weight) best = { url, weight };
  }
  return best?.url ?? null;
}

const LAZY_ATTRS = [
  "src",
  "data-src",
  "data-lazy-src",
  "data-lazy",
  "data-original",
  "data-original-src",
  "data-image",
  "data-img",
  "data-large_image",
  "data-large-image",
  "data-zoom-image",
  "data-full",
  "data-fallback-src",
  "data-echo",
  "data-bg",
  "data-background",
  "data-background-image",
];

const SRCSET_ATTRS = ["srcset", "data-srcset", "data-lazy-srcset"];

function extractImgSrc($: cheerio.CheerioAPI, el: CheerioElement): string | null {
  const $el = $(el);
  // Prefer srcset (highest density) when present
  for (const a of SRCSET_ATTRS) {
    const v = $el.attr(a);
    if (v) {
      const picked = pickFromSrcset(v);
      if (picked) return picked;
    }
  }
  // First pass: prefer non-data URLs (data: values are often lazy placeholders).
  for (const a of LAZY_ATTRS) {
    const v = $el.attr(a);
    if (!v) continue;
    const t = v.trim();
    if (t && !t.toLowerCase().startsWith("data:")) return v;
  }
  // Second pass: accept a real embedded image as the cover when nothing else
  // is available (some sites ship the full cover inline as base64).
  for (const a of LAZY_ATTRS) {
    const v = $el.attr(a);
    if (!v) continue;
    const t = v.trim();
    if (t && DATA_IMAGE_RE.test(t) && t.length > 512) return v;
  }
  // background-image inline style
  const style = $el.attr("style");
  if (style) {
    const m = style.match(/background(?:-image)?\s*:\s*url\(([^)]+)\)/i);
    if (m) return m[1].replace(/['"]/g, "").trim();
  }
  return null;
}

const MIN_IMAGE_DIMENSION = 200;

function declaredDimensionsTooSmall($: cheerio.CheerioAPI, el: CheerioElement): boolean {
  const $el = $(el);
  const w = parseInt($el.attr("width") || "", 10);
  const h = parseInt($el.attr("height") || "", 10);
  // Reject when any declared dimension is clearly too small for a book cover
  // (e.g. `width="16px"` share icons). If only one side is declared, we trust
  // it — sites rarely declare an undersized dimension for a real cover.
  if (Number.isFinite(w) && w > 0 && w < MIN_IMAGE_DIMENSION) return true;
  if (Number.isFinite(h) && h > 0 && h < MIN_IMAGE_DIMENSION) return true;
  return false;
}

function extractCandidatesFromDom($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const candidates: string[] = [];

  // <picture><source srcset="..."> chosen first
  $("picture source").each((_, el) => {
    const ss = $(el).attr("srcset") || $(el).attr("data-srcset");
    if (ss) {
      const u = pickFromSrcset(ss);
      const abs = absoluteUrl(u, baseUrl);
      if (abs) candidates.push(abs);
    }
  });

  // Cover-specific selectors first (higher priority)
  const coverSelectors = [
    'img[alt*="Book Cover" i]',
    'img[alt*="book cover" i]',
    'img[alt*="cover" i]',
    'img[alt*="غلاف"]',
    'img[alt*="الكتاب"]',
    ".book-cover img",
    ".book-cover-image img",
    ".product-cover img",
    ".product-image img",
    ".product-gallery img",
    ".woocommerce-product-gallery__image img",
    ".wp-post-image",
    'img[itemprop="image"]',
    "#productImage",
    "#imgBlkFront",
    "#landingImage",
  ];
  for (const sel of coverSelectors) {
    $(sel).each((_, el) => {
      if (declaredDimensionsTooSmall($, el)) return;
      const src = extractImgSrc($, el);
      const abs = absoluteUrl(src, baseUrl);
      if (abs) candidates.push(abs);
    });
  }

  // Cover containers with background-image
  $(".book-cover, .product-cover, .product-image, .cover, .featured-image").each((_, el) => {
    const style = $(el).attr("style");
    if (style) {
      const m = style.match(/background(?:-image)?\s*:\s*url\(([^)]+)\)/i);
      if (m) {
        const abs = absoluteUrl(m[1].replace(/['"]/g, "").trim(), baseUrl);
        if (abs) candidates.push(abs);
      }
    }
  });

  // <noscript> images (lazy loaders often put real <img> here)
  $("noscript").each((_, el) => {
    const inner = $(el).text();
    if (!inner || !/<img/i.test(inner)) return;
    const $$ = cheerio.load(inner);
    $$("img").each((_, im) => {
      const src = extractImgSrc($$, im);
      const abs = absoluteUrl(src, baseUrl);
      if (abs) candidates.push(abs);
    });
  });

  // Generic prominent images inside article/main/content
  $("article img, main img, .content img, .entry-content img").each((_, el) => {
    if (declaredDimensionsTooSmall($, el)) return;
    const src = extractImgSrc($, el);
    const abs = absoluteUrl(src, baseUrl);
    if (abs) candidates.push(abs);
  });

  // As a last resort, any <img>
  $("img").each((_, el) => {
    if (declaredDimensionsTooSmall($, el)) return;
    const src = extractImgSrc($, el);
    const abs = absoluteUrl(src, baseUrl);
    if (abs) candidates.push(abs);
  });

  return candidates;
}

function extractFromDom($: cheerio.CheerioAPI): Partial<ScrapeResult> {
  const r: Partial<ScrapeResult> = {};

  r.title = firstNonEmpty($, [
    "h1.book-title",
    "h1.product-title",
    "h1.entry-title",
    ".product_title",
    "h1",
  ]);

  r.author = firstNonEmpty($, [
    ".book-author a",
    ".book-author",
    ".product-author a",
    ".product-author",
    ".author a",
    ".author-name",
    '[itemprop="author"]',
    "a[rel=author]",
  ]);

  r.description = firstNonEmpty($, [
    ".book-description",
    ".product-description",
    ".woocommerce-product-details__short-description",
    "#tab-description",
    ".description",
    '[itemprop="description"]',
    "article p",
  ]);

  return r;
}

const ALAMALPUB_HOST = "alamalpub.net";

function alamalpubAdapter(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): { partial: Partial<ScrapeResult>; images: string[] } {
  const r: Partial<ScrapeResult> = {};
  const images: string[] = [];

  const title = clean($("h1.book-title").first().text()) || clean($("h1").first().text());
  if (title) r.title = title;

  const author = clean($("h2.author-name, .author-name").first().text());
  if (author) r.author = author;

  $(".detail-label").each((_, el) => {
    const label = clean($(el).text());
    if (!label) return;
    if (!r.description && /^(التعريف بالكتاب|نبذة عن الكتاب|الوصف)\s*$/.test(label)) {
      const next = $(el).nextAll().filter("h1,h2,h3,h4,div,p").first();
      const txt = clean(next.text());
      if (txt) r.description = txt;
    }
    if (!r.author && /^(اسم المؤلف|المؤلف|الكاتب|تأليف)\s*$/.test(label)) {
      const next = $(el).nextAll().filter("h1,h2,h3,h4,div,p").first();
      const txt = clean(next.text());
      if (txt) r.author = txt;
    }
  });

  // Odoo image URLs need the product.template id, not the product.product
  // variant id. Collect candidate ids from multiple sources (URL slug,
  // canonical link, og:url, and the cart form) and try each at multiple
  // image sizes — `image_1920` first, then 1024, then 512. The validator
  // downstream rejects responses that match Odoo's "no cover" placeholder.
  const templateIds: string[] = [];
  const tryAddSlugId = (path: string | null | undefined) => {
    if (!path) return;
    const m = path.match(/-(\d+)\/?$/);
    if (m && !templateIds.includes(m[1])) templateIds.push(m[1]);
  };

  try {
    tryAddSlugId(new URL(baseUrl).pathname);
  } catch {
    /* ignore */
  }
  const canonical = $('link[rel="canonical"]').first().attr("href");
  if (canonical) {
    try {
      tryAddSlugId(new URL(canonical, baseUrl).pathname);
    } catch {
      /* ignore */
    }
  }
  const ogUrl = $('meta[property="og:url"]').first().attr("content");
  if (ogUrl) {
    try {
      tryAddSlugId(new URL(ogUrl, baseUrl).pathname);
    } catch {
      /* ignore */
    }
  }
  const productId = $('form[action*="/shop/cart/update"] input[name="product_id"]').first().attr("value");
  if (productId && /^\d+$/.test(productId) && !templateIds.includes(productId)) {
    templateIds.push(productId);
  }

  const sizes = ["image_1920", "image_1024", "image_512"];
  for (const id of templateIds) {
    for (const size of sizes) {
      const u = absoluteUrl(`/web/image/product.template/${id}/${size}`, baseUrl);
      if (u) images.push(u);
    }
  }

  // DOM fallbacks for when the /web/image endpoint returns the Odoo placeholder.
  $(
    "#o-carousel-product img, .oe_product_image img, .product_detail_img img, .o_wsale_product_images img",
  ).each((_, el) => {
    const src = extractImgSrc($, el);
    const abs = absoluteUrl(src, baseUrl);
    if (abs) images.push(abs);
  });

  if (images.length > 0) r.image = images[0];

  if (!r.price) {
    // alamalpub products commonly expose multiple format buttons (PDF, Epub,
    // audio, printed paperback) each with its own price. Picking the first
    // one means we usually grab the digital edition's price — which is often
    // 0.0 for free titles or lower than the printed edition. Walk every
    // format button, classify each by its label, and prefer the printed
    // edition when it has a real price; fall back through digital formats.
    type FormatKind = "print" | "pdf" | "epub" | "audio" | "other";
    type FormatPrice = { kind: FormatKind; amount: number; raw: string; currency: string };
    const formats: FormatPrice[] = [];
    $(".format-btn, .format-buttons button").each((_, el) => {
      const t = clean($(el).text());
      if (!t) return;
      let kind: FormatKind = "other";
      if (/مطبوع|ورقي|paperback|hardcover|print/i.test(t)) kind = "print";
      else if (/\bPDF\b/i.test(t)) kind = "pdf";
      else if (/\bEpub\b/i.test(t)) kind = "epub";
      else if (/صوتي|audio/i.test(t)) kind = "audio";
      const m = t.match(/(\d+(?:[.,]\d+)?)\s*(جنيه|ريال|درهم|دولار|EGP|SAR|USD|AED)/);
      if (!m) return;
      const amount = parseFloat(m[1].replace(",", "."));
      if (!Number.isFinite(amount)) return;
      formats.push({ kind, amount, raw: m[1], currency: m[2] });
    });

    const order: FormatKind[] = ["print", "pdf", "epub", "audio", "other"];
    let chosen: FormatPrice | null = null;
    // First pass: highest-priority format with a non-zero price wins.
    for (const k of order) {
      const candidate = formats.find((f) => f.kind === k && f.amount > 0);
      if (candidate) {
        chosen = candidate;
        break;
      }
    }
    // Second pass: nothing priced — record the printed (or first available)
    // format at 0 so genuinely-free books still report their currency.
    if (!chosen) {
      for (const k of order) {
        const candidate = formats.find((f) => f.kind === k);
        if (candidate) {
          chosen = candidate;
          break;
        }
      }
    }

    if (chosen) {
      r.price = chosen.raw;
      if (!r.currency) {
        const cur = chosen.currency;
        r.currency =
          cur === "جنيه"
            ? "EGP"
            : cur === "ريال"
              ? "SAR"
              : cur === "درهم"
                ? "AED"
                : cur === "دولار"
                  ? "USD"
                  : cur;
      }
    }
  }

  return { partial: r, images };
}

function merge(target: Partial<ScrapeResult>, source: Partial<ScrapeResult>): void {
  for (const k of Object.keys(source) as (keyof ScrapeResult)[]) {
    const v = source[k];
    if (v && !target[k]) {
      (target as Record<string, unknown>)[k as string] = v;
    }
  }
}

const ICON_HINT = /(sprite|logo|icon|favicon|placeholder|loader|spinner|blank|pixel|share|whatsapp|facebook|twitter|instagram|emoji)/i;

function looksLikeIcon(url: string): boolean {
  // `data:` URIs are inline image payloads — their long base64 body can
  // randomly contain hint substrings (e.g. "logo") and falsely demote a real
  // cover. The hint regex is a name/path heuristic; only apply it to URLs
  // that have a fetchable name component.
  if (DATA_IMAGE_RE.test(url)) return false;
  return ICON_HINT.test(url);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(url: string, timeoutMs = 20000, retry = true): Promise<{ html: string; finalUrl: string }> {
  try {
    const res = await fetchWithTimeout(
      url,
      { redirect: "follow", headers: BROWSER_HEADERS },
      timeoutMs,
    );
    const finalUrl = res.url || url;
    const html = await res.text();
    return { html, finalUrl };
  } catch (err) {
    if (retry) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchHtml(url, timeoutMs, false);
    }
    throw err;
  }
}

// Reject responses that are obviously not real cover images (e.g. 1x1 tracker
// pixels) or absurdly huge files that we'd never want to embed.
const MIN_IMAGE_BYTES = 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function contentLengthOk(headers: Headers): boolean {
  const v = headers.get("content-length");
  if (!v) return true; // unknown — give the URL the benefit of the doubt
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return true;
  return n >= MIN_IMAGE_BYTES && n <= MAX_IMAGE_BYTES;
}

// Validate that a URL points to an actual image. Returns true when verified.
// SHA1 hashes of known Odoo "no image" placeholder PNGs. When one of these is
// returned, the store does not actually have a cover uploaded for the product
// — we must reject it so the admin is prompted to paste a real URL.
const KNOWN_PLACEHOLDER_SHA1 = new Set<string>([
  // alamalpub.net (Odoo) – 512×512 / 1024×1024 default placeholder
  "4d3db82508499a9b80ad6bf0403bebdd26ec573a",
  // alamalpub.net (Odoo) – 256×256 default placeholder
  "194038c299e9bf0b75fb3cb4b64150224a2f80e0",
]);

export function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  if (buf.length >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return "image/avif";
  }
  const head = new TextDecoder().decode(buf.slice(0, Math.min(buf.length, 256))).toLowerCase();
  if (head.includes("<svg")) return "image/svg+xml";
  return null;
}

function pngDimensions(buf: Uint8Array): { w: number; h: number } | null {
  if (buf.length < 24) return null;
  // PNG signature + IHDR at offset 16/20 (big-endian u32)
  if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

async function sha1Hex(buf: Uint8Array): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha1").update(buf).digest("hex");
}

// Returns true if the downloaded bytes look like a generic "no cover" placeholder:
// either matches a known placeholder hash, or is a tiny PNG relative to its
// pixel dimensions (a uniform-colour filler).
async function looksLikePlaceholderBytes(buf: Uint8Array): Promise<boolean> {
  if (buf.length === 0) return true;
  const hash = await sha1Hex(buf);
  if (KNOWN_PLACEHOLDER_SHA1.has(hash)) return true;
  const dims = pngDimensions(buf);
  if (dims && dims.w >= 128 && dims.h >= 128) {
    const bytesPerPixel = buf.length / (dims.w * dims.h);
    // Real book covers average > 0.1 B/px even when well-compressed.
    // Odoo / WooCommerce placeholders are uniform colour and land around 0.03.
    if (bytesPerPixel < 0.05) return true;
  }
  return false;
}

async function validateImageUrl(url: string, refererUrl?: string): Promise<boolean> {
  // Embedded base64 images are self-contained — no fetch needed.
  if (DATA_IMAGE_RE.test(url)) return true;

  const probeHeaders: Record<string, string> = {
    "User-Agent": BROWSER_HEADERS["User-Agent"],
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": BROWSER_HEADERS["Accept-Language"],
  };
  if (refererUrl) probeHeaders.Referer = refererUrl;

  // First, a HEAD probe to confirm image content-type and reject oversized files
  // without downloading them. We still always do a GET below so we can detect
  // placeholders by hash; HEAD just lets us bail early for non-images.
  try {
    const head = await fetchWithTimeout(
      url,
      {
        method: "HEAD",
        redirect: "follow",
        headers: probeHeaders,
      },
      8000,
    );
    if (head.ok) {
      const ct = (head.headers.get("content-type") || "").toLowerCase();
      if (ct && !ct.startsWith("image/") && !ct.startsWith("application/octet-stream")) {
        return false;
      }
      if (!contentLengthOk(head.headers)) return false;
    }
  } catch {
    /* ignore — proceed to GET */
  }

  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        redirect: "follow",
        headers: probeHeaders,
      },
      10000,
    );
    if (!res.ok) return false;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 512) return false;
    const mime = sniffImageMime(buf);
    if (!mime) {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.startsWith("image/")) return false;
    }
    if (await looksLikePlaceholderBytes(buf)) return false;
    return true;
  } catch {
    return false;
  }
}

function getBaseHref($: cheerio.CheerioAPI, fallback: string): string {
  const href = $("base[href]").first().attr("href");
  if (href) {
    try {
      return new URL(href, fallback).toString();
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

// Order images by priority class. Earlier in the array == higher priority.
function rankImages(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of input) {
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

async function pickBestImage(
  candidates: string[],
  warnings: string[],
  refererUrl?: string,
): Promise<string | null> {
  // Drop obvious icons but keep a backup list in case nothing else validates.
  const primary: string[] = [];
  const fallback: string[] = [];
  for (const u of candidates) {
    if (looksLikeIcon(u)) fallback.push(u);
    else primary.push(u);
  }
  // Limit how many we probe — image validation is the slowest step.
  const MAX_PROBES = 8;
  let probed = 0;
  for (const url of [...primary, ...fallback]) {
    if (probed >= MAX_PROBES) break;
    probed++;
    const ok = await validateImageUrl(url, refererUrl);
    if (ok) return url;
  }
  // A unified warning is pushed by the caller when no image could be chosen,
  // so we don't push a duplicate here.
  return null;
}

export async function scrapeBookUrl(url: string): Promise<ScrapeResult> {
  const warnings: string[] = [];

  let html = "";
  let finalUrl = url;
  try {
    const res = await fetchHtml(url, 20000, true);
    html = res.html;
    finalUrl = res.finalUrl;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new Error("تعذّر جلب الصفحة من الرابط");
  }

  const $ = cheerio.load(html);
  const baseUrl = getBaseHref($, finalUrl);

  const acc: Partial<ScrapeResult> = {};

  let host = "";
  try {
    host = new URL(finalUrl).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  // 1. Site-specific adapter
  let alamalpubImages: string[] = [];
  if (host.endsWith(ALAMALPUB_HOST)) {
    const a = alamalpubAdapter($, baseUrl);
    merge(acc, a.partial);
    alamalpubImages = a.images;
  }

  // 2. JSON-LD
  const jsonLd = extractFromJsonLd($);
  merge(acc, jsonLd.partial);

  // 3. Meta tags (OpenGraph / Twitter / standard)
  const meta = extractFromMeta($);
  merge(acc, meta.partial);

  // 4. DOM text fallbacks (title/author/description)
  merge(acc, extractFromDom($));

  // 5. Title fallback from <title>
  if (!acc.title) {
    const t = clean($("title").first().text());
    if (t) acc.title = t;
  }

  // Site name
  if (!acc.siteName) {
    acc.siteName =
      metaContent($, ['meta[property="og:site_name"]', 'meta[name="application-name"]']) || null;
  }

  // ---- IMAGE PIPELINE ----
  // Build a prioritized list of candidates. Site-specific Odoo template URLs
  // come first (1920 → 1024 → 512) because they are the most reliable cover
  // source on alamalpub when the product actually has a cover; placeholder
  // responses are filtered out downstream by hash + byte-density heuristics.
  // Then standard meta tags (og/twitter/itemprop), JSON-LD images, DOM cover
  // selectors, and finally any other adapter-supplied image.
  const rawCandidates: string[] = [];
  for (const u of alamalpubImages) rawCandidates.push(u);
  for (const u of meta.images) rawCandidates.push(u);
  for (const u of jsonLd.images) rawCandidates.push(u);
  for (const u of extractCandidatesFromDom($, baseUrl)) rawCandidates.push(u);
  if (acc.image) rawCandidates.push(acc.image);

  const normalized: string[] = [];
  for (const c of rawCandidates) {
    const abs = absoluteUrl(c, baseUrl);
    if (abs && (/^https?:\/\//i.test(abs) || DATA_IMAGE_RE.test(abs))) normalized.push(abs);
  }
  const ordered = rankImages(normalized);

  let chosenImage: string | null = null;
  if (ordered.length > 0) {
    chosenImage = await pickBestImage(ordered, warnings, finalUrl);
  }
  if (!chosenImage) {
    warnings.push(
      "لم نتمكن من جلب صورة الغلاف تلقائياً من هذا الرابط. الرجاء لصق رابط الصورة يدوياً في حقل صورة الغلاف.",
    );
  }

  const result: ScrapeResult = {
    title: clean(acc.title ?? null),
    description: clean(acc.description ?? null),
    image: chosenImage,
    author: clean(acc.author ?? null),
    siteName: clean(acc.siteName ?? null),
    price: clean(acc.price ?? null),
    currency: clean(acc.currency ?? null),
    url,
    finalUrl,
    fetched: [],
    missing: [],
    warnings,
  };

  for (const f of FIELDS) {
    const v = (result as Record<string, unknown>)[f];
    if (v && typeof v === "string" && v.length > 0) result.fetched.push(f);
    else result.missing.push(f);
  }

  if (result.description && result.description.length > 2000) {
    result.description = result.description.slice(0, 2000).trim() + "…";
  }

  return result;
}
