import type { ContentType } from "./schemas";

const BASE: Record<ContentType, string> = {
  observatory: "/observatory",
  article: "/articles",
  study: "/studies",
  publication: "/publications",
  news: "/news-events",
  event: "/news-events",
  case_study: "/case-studies",
};

export function contentPath(type: ContentType, slug: string): string {
  return `${BASE[type]}/${slug}`;
}
