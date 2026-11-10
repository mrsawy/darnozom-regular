import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import type { FeaturedCard } from "@/lib/cms-types";
import { typeBadge } from "@/lib/cms-labels";
import { useStoreBook } from "@/lib/darnozom-books";

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
    <section
      aria-roledescription="carousel"
      aria-label={t("مختارات دار نظم", "DarNozom Highlights")}
      role="region"
      onKeyDown={onKeyDown}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) ((dx < 0) !== isArabic ? next : prev)();
        touchX.current = null;
      }}
      className="relative w-full bg-navy text-white overflow-hidden min-h-[460px] lg:min-h-[520px] flex flex-col"
    >
      <h1 className="sr-only">{t("مختارات دار نظم", "DarNozom Highlights")}</h1>
      {/* Full-bleed background: the selected card's image, darkened so the headline stays legible. */}
      <motion.div key={cards[index].id} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="absolute inset-0">
        <HeroBackground card={cards[index]} lang={lang} />
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

      <div className={`relative mx-auto w-full ${HOME_MAX_W} ${HOME_PX} flex-1 flex flex-col justify-end pt-16 pb-6`}>
        <motion.div key={`t-${cards[index].id}`} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <MainText card={cards[index]} lang={lang} isArabic={isArabic} />
        </motion.div>

        {cards.length > 1 && (
          <div className="mt-6 flex items-stretch gap-2">
            <button type="button" onClick={prev} aria-label={t("العنصر السابق", "Previous item")} className="hidden lg:flex shrink-0 w-11 items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-[2px]">
              <PrevIcon className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0 flex gap-3 overflow-x-auto snap-x lg:overflow-visible">
              {cards.map((card, i) => (
                <TabCard key={card.id} card={card} lang={lang} current={i === index} onSelect={() => go(i)} />
              ))}
            </div>
            <button type="button" onClick={next} aria-label={t("العنصر التالي", "Next item")} className="hidden lg:flex shrink-0 w-11 items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-[2px]">
              <NextIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <LiveTitle card={cards[index]} lang={lang} />
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

function HeroBackground({ card, lang }: { card: FeaturedCard; lang: "ar" | "en" }) {
  const { image } = useCardText(card, lang);
  return image ? <img src={image} alt="" className="w-full h-full object-cover" /> : null;
}

function MainText({ card, lang, isArabic }: { card: FeaturedCard; lang: "ar" | "en"; isArabic: boolean }) {
  const c = useCardText(card, lang);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <div className="max-w-3xl">
      {c.badge && (
        <span className="inline-block border-s-4 border-gold-light ps-2 text-sm font-semibold leading-5">{c.badge}</span>
      )}
      <h2 data-testid="featured-main-title" className="mt-2 text-2xl lg:text-[32px] font-bold leading-snug [text-shadow:0_2px_8px_rgba(0,0,0,.6)]">{c.title}</h2>
      {c.summary && <p className="mt-2 text-white/85 line-clamp-2">{c.summary}</p>}
      <CardLink href={card.href} className="mt-3 inline-flex items-center gap-2 min-h-11 text-gold-light font-bold hover:underline">
        {c.cta} <Arrow className="w-4 h-4" aria-hidden />
      </CardLink>
    </div>
  );
}

function TabCard({ card, lang, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={current}
      aria-label={c.title}
      className={`snap-start shrink-0 w-[70vw] sm:w-[45vw] lg:w-auto lg:flex-1 lg:basis-0 min-w-0 min-h-[84px] px-4 py-3 text-start rounded-[2px] backdrop-blur-sm transition-colors ${
        current ? "bg-gold-light text-ink" : "bg-navy/70 text-white hover:bg-navy/90"
      }`}
    >
      <span className="block font-semibold leading-snug line-clamp-3">{c.title}</span>
    </button>
  );
}
