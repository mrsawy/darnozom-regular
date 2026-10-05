import type { ContentType } from "./schemas";

const BASE: Record<ContentType, string> = {
  observatory: "/observatory",
  article: "/articles",
  study: "/studies",
  publication: "/publications",
  news: "/news-events",
  event: "/news-events",
};

export function contentPath(type: ContentType, slug: string): string {
  return `${BASE[type]}/${slug}`;
}
