export type ContentType = "observatory" | "article" | "study" | "publication" | "news" | "event";
export type ContentStatus = "draft" | "review" | "published" | "archived";
export type ContentArea = "sharia_policy" | "public_policy_admin" | "leadership_governance";
export type Lang = "ar" | "en";
export type CmsLink = { title: string; url: string };

export interface ContentItem {
  id: number;
  type: ContentType;
  slug: string;
  status: ContentStatus;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  bodyAr: string;
  bodyEn: string;
  coverImageUrl: string;
  area: ContentArea | null;
  authorAr: string;
  authorEn: string;
  isExternal: boolean;
  externalUrl: string;
  publishedAt: string | null;
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse { items: ContentItem[]; total: number; page: number; pageSize: number }
export interface ItemResponse { item: ContentItem; related: ContentItem[] }

export interface FeaturedCard {
  id: number;
  sourceKind: "content" | "book" | "custom";
  medusaProductId: string | null;
  contentType: ContentType | null;
  contentKind: string | null;
  badgeAr: string; badgeEn: string;
  titleAr: string; titleEn: string;
  summaryAr: string; summaryEn: string;
  imageUrl: string;
  ctaLabelAr: string; ctaLabelEn: string;
  href: string;
}

export interface HomeResponse {
  featured: FeaturedCard[];
  observatory: { lead: ContentItem | null; others: ContentItem[] };
  articles: ContentItem[];
  studies: ContentItem[];
  publications: ContentItem[];
  newsEvents: ContentItem[];
}

export interface ListParams {
  types: ContentType[];
  area?: string;
  kind?: string;
  region?: string;
  when?: "upcoming" | "past" | "";
  q?: string;
  page?: number;
  pageSize?: number;
}
