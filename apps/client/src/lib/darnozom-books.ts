import { useQuery } from "@tanstack/react-query";
import type { HttpTypes } from "@medusajs/types";
import { listProductsByIds, searchStoreBooks } from "./book-catalog";
import { DARNOZOM_PUBLISHER } from "./site-constants";
import type { ContentItem } from "./cms-types";
import { contentPath } from "./cms-labels";

export interface BookCard { id: string; title: string; imageUrl: string; href: string; createdAt: string | null }

export interface PublicationCardData {
  key: string;
  kind: "book" | "report" | "periodical" | "research";
  titleAr: string; titleEn: string;
  summaryAr: string; summaryEn: string;
  imageUrl: string;
  href: string;
  date: string | null;
}

export function toBookCard(p: HttpTypes.StoreProduct): BookCard {
  return {
    id: p.id,
    title: p.title ?? "",
    imageUrl: p.thumbnail ?? p.images?.[0]?.url ?? "",
    href: `/services/store/books/${p.id}`,
    createdAt: (p.created_at as string | null | undefined) ?? null,
  };
}

export function useDarNozomBooks(limit: number, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["cms", "dn-books", limit],
    queryFn: async () => (await searchStoreBooks({ publisher: DARNOZOM_PUBLISHER, limit })).products.map(toBookCard),
    enabled: opts.enabled ?? true,
    retry: 1,
    staleTime: 5 * 60_000,
  });
}

export function useStoreBook(id: string | null) {
  return useQuery({
    queryKey: ["cms", "book", id],
    queryFn: async () => {
      const [p] = await listProductsByIds([id!]);
      return p ? toBookCard(p) : null;
    },
    enabled: !!id,
    retry: 1,
  });
}

export function mergePublications(items: ContentItem[], books: BookCard[], n: number): PublicationCardData[] {
  const fromItems: PublicationCardData[] = items.map((i) => ({
    key: `pub:${i.slug}`,
    kind: (i.details?.kind ?? "report") as PublicationCardData["kind"],
    titleAr: i.titleAr, titleEn: i.titleEn, summaryAr: i.summaryAr, summaryEn: i.summaryEn,
    imageUrl: i.coverImageUrl, href: contentPath("publication", i.slug), date: i.publishedAt,
  }));
  const fromBooks: PublicationCardData[] = books.map((b) => ({
    key: `book:${b.id}`, kind: "book",
    titleAr: b.title, titleEn: b.title, summaryAr: "", summaryEn: "",
    imageUrl: b.imageUrl, href: b.href, date: b.createdAt,
  }));
  return [...fromItems, ...fromBooks]
    .sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0))
    .slice(0, n);
}
