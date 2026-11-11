import { Link } from "wouter";
import type { FeaturedCard } from "@/lib/cms-types";
import { typeBadge } from "@/lib/cms-labels";
import { useStoreBook } from "@/lib/darnozom-books";

export function useCardText(card: FeaturedCard, lang: "ar" | "en") {
  const book = useStoreBook(card.sourceKind === "book" ? card.medusaProductId : null).data;
  const pick = (ar: string, en: string) => (lang === "en" && en ? en : ar);
  const badge = pick(card.badgeAr, card.badgeEn) ||
    (card.contentType ? typeBadge(card.contentType, { kind: card.contentKind }, lang) : card.sourceKind === "book" ? (lang === "ar" ? "كتاب" : "Book") : "");
  return {
    badge,
    title: pick(card.titleAr, card.titleEn) || book?.title || "",
    summary: pick(card.summaryAr, card.summaryEn),
    image: card.imageUrl || book?.imageUrl || "",
    cta: pick(card.ctaLabelAr, card.ctaLabelEn) || (lang === "ar" ? "اكتشف المزيد" : "Learn more"),
  };
}

/** Site paths use client-side routing; slide hrefs may also be external http(s) URLs. */
export function CardLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link href={href} className={className}>{children}</Link>;
}
