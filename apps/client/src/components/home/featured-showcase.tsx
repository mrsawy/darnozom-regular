import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { FeaturedCard } from "@/lib/cms-types";
import { typeBadge } from "@/lib/cms-labels";
import { useStoreBook } from "@/lib/darnozom-books";
import { CategoryBadge } from "@/components/content/category-badge";

function useCardText(card: FeaturedCard, lang: "ar" | "en") {
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

export function FeaturedShowcase({ cards }: { cards: FeaturedCard[] }) {
  const { language: lang, isArabic } = useLanguage();
  const [rawIndex, setIndex] = useState(0);
  const reduce = useReducedMotion();
  const touchX = useRef<number | null>(null);
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  if (cards.length === 0) return null;
  // Clamp in case the list shrinks between renders (e.g. a slide is unpublished).
  const index = rawIndex < cards.length ? rawIndex : 0;

  const go = (i: number) => setIndex((i + cards.length) % cards.length);
  const next = () => go(index + 1);
  const prev = () => go(index - 1);
  const onKeyDown = (e: React.KeyboardEvent) => {
    // In RTL, the visual "next" is to the left.
    if (e.key === "ArrowLeft") (isArabic ? next : prev)();
    if (e.key === "ArrowRight") (isArabic ? prev : next)();
  };
  const NextIcon = isArabic ? ChevronLeft : ChevronRight;
  const PrevIcon = isArabic ? ChevronRight : ChevronLeft;

  return (
    <section aria-roledescription="carousel" aria-label={t("مختارات دار نظم", "DarNozom Highlights")} role="region" onKeyDown={onKeyDown} className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-8">
      <h1 className="text-[25px] lg:text-[31px] font-bold text-navy">{t("مختارات دار نظم", "DarNozom Highlights")}</h1>
      <p className="text-ink-muted mb-5">{t("معرفة وبرامج وحلول تدعم القرار والمؤسسات", "Knowledge, programs and solutions that support decisions and institutions")}</p>
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div
          className="relative min-w-0 bg-navy text-white rounded-[4px] overflow-hidden"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) ((dx < 0) !== isArabic ? next : prev)();
            touchX.current = null;
          }}
        >
          {/* Keyed fade-in (no exit wait) so the selected card swaps in immediately. */}
          <motion.div key={cards[index].id} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
            <MainCard
              card={cards[index]}
              lang={lang}
              isArabic={isArabic}
              controls={
                cards.length > 1 && (
                  <>
              <button type="button" onClick={prev} aria-label={t("العنصر السابق", "Previous item")} className="absolute top-1/2 -translate-y-1/2 start-3 w-11 h-11 rounded-full bg-navy/80 text-white flex items-center justify-center hover:bg-navy">
                <PrevIcon className="w-5 h-5" />
              </button>
              <button type="button" onClick={next} aria-label={t("العنصر التالي", "Next item")} className="absolute top-1/2 -translate-y-1/2 end-3 w-11 h-11 rounded-full bg-navy/80 text-white flex items-center justify-center hover:bg-navy">
                <NextIcon className="w-5 h-5" />
              </button>
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                      {cards.map((c, i) => (
                        <button key={c.id} type="button" onClick={() => go(i)} aria-label={t(`عرض العنصر ${i + 1}`, `Show item ${i + 1}`)} aria-current={i === index} className="w-5 h-5 flex items-center justify-center">
                          <span className={`block rounded-full ${i === index ? "w-2.5 h-2.5 bg-gold-light" : "w-2 h-2 bg-white/60"}`} />
                        </button>
                      ))}
                    </div>
                  </>
                )
              }
            />
          </motion.div>
          <LiveTitle card={cards[index]} lang={lang} />
        </div>

        <div className="min-w-0 flex lg:flex-col gap-4 overflow-x-auto snap-x lg:overflow-visible -mx-5 px-5 lg:mx-0 lg:px-0 justify-between">
          {cards.slice(1).map((card, i) => (
            <SideCard key={card.id} card={card} lang={lang} isArabic={isArabic} current={index === i + 1} onSelect={() => go(i + 1)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Site paths use client-side routing; slide hrefs may also be external http(s) URLs. */
function CardLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link href={href} className={className}>{children}</Link>;
}

function LiveTitle({ card, lang }: { card: FeaturedCard; lang: "ar" | "en" }) {
  const { title } = useCardText(card, lang);
  return <p data-testid="featured-live" aria-live="polite" className="sr-only">{title}</p>;
}

function MainCard({ card, lang, isArabic, controls }: { card: FeaturedCard; lang: "ar" | "en"; isArabic: boolean; controls?: React.ReactNode }) {
  const c = useCardText(card, lang);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <>
      {/* Arrows sit over the image, as in the reference. */}
      <div className="relative">
        {c.image ? <img src={c.image} alt="" className="w-full aspect-[2.15/1] object-cover" /> : <div className="aspect-[4/1]" />}
        {controls}
      </div>
      <div className="p-5 lg:p-7">
        {c.badge && <CategoryBadge>{c.badge}</CategoryBadge>}
        <h2 data-testid="featured-main-title" className="mt-3 text-2xl lg:text-[28px] font-bold leading-snug">{c.title}</h2>
        {c.summary && <p className="mt-2 text-white/85">{c.summary}</p>}
        <CardLink href={card.href} className="mt-4 inline-flex items-center gap-2 min-h-11 px-5 rounded-[4px] bg-gold-light text-ink font-bold hover:bg-gold">
          {c.cta} <Arrow className="w-4 h-4" aria-hidden />
        </CardLink>
      </div>
    </>
  );
}

function SideCard({ card, lang, isArabic, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; isArabic: boolean; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <div className={`relative snap-start shrink-0 w-[80vw] sm:w-[60vw] lg:w-auto flex bg-white border rounded-[4px] overflow-hidden ${current ? "border-gold ring-1 ring-gold" : "border-line"}`}>
      {c.image && <img src={c.image} alt="" loading="lazy" className="w-[30%] max-w-32 object-cover" />}
      <div className="flex-1 min-w-0 p-4 flex flex-col items-start">
        <button type="button" onClick={onSelect} aria-current={current} className="text-start" aria-label={c.title}>
          {c.badge && <CategoryBadge>{c.badge}</CategoryBadge>}
          <span className="block mt-2 font-bold text-navy">{c.title}</span>
          {c.summary && <span className="block mt-1 text-sm text-ink-muted line-clamp-2">{c.summary}</span>}
        </button>
        <CardLink href={card.href} className="mt-auto pt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-gold">{c.cta} <Arrow className="w-4 h-4" aria-hidden /></CardLink>
      </div>
    </div>
  );
}
