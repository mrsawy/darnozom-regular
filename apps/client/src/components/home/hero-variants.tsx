import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import type { FeaturedCard } from "@/lib/cms-types";
import { CardLink, useCardText } from "./hero-shared";

/** Shared carousel state: wrap-around index, RTL-aware arrow keys and swipe. */
export function useSlides(count: number) {
  const { isArabic } = useLanguage();
  const [raw, setRaw] = useState(0);
  const touchX = useRef<number | null>(null);
  const index = raw < count ? raw : 0;
  const go = (i: number) => setRaw((i + count) % count);
  const next = () => go(index + 1);
  const prev = () => go(index - 1);
  const handlers = {
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") (isArabic ? next : prev)();
      if (e.key === "ArrowRight") (isArabic ? prev : next)();
    },
    onTouchStart: (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 40) ((dx < 0) !== isArabic ? next : prev)();
      touchX.current = null;
    },
  };
  return { index, go, next, prev, handlers, isArabic, NextIcon: isArabic ? ChevronLeft : ChevronRight, PrevIcon: isArabic ? ChevronRight : ChevronLeft };
}

export function Dots({ count, index, go, label, light = true }: { count: number; index: number; go: (i: number) => void; label: string; light?: boolean }) {
  if (count < 2) return null;
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => go(i)}
          aria-label={`${i + 1} / ${count}`}
          aria-current={i === index}
          className="flex h-6 items-center"
        >
          <span className={`block h-1.5 rounded-full transition-all ${i === index ? `w-8 ${light ? "bg-gold-light" : "bg-navy"}` : `w-3 ${light ? "bg-white/40" : "bg-navy/25"}`}`} />
        </button>
      ))}
    </div>
  );
}

export function CardImage({ card, lang, className }: { card: FeaturedCard; lang: "ar" | "en"; className?: string }) {
  const { image } = useCardText(card, lang);
  return image ? <img src={image} alt="" className={className ?? "h-full w-full object-cover"} /> : null;
}

/* ───────── Design 2: split — dark text panel beside a large image ───────── */
export function SplitHero({ cards }: { cards: FeaturedCard[] }) {
  const { language: lang } = useLanguage();
  const s = useSlides(cards.length);
  const reduce = useReducedMotion();
  const t = (ar: string, en: string) => (s.isArabic ? ar : en);
  const card = cards[s.index];
  const c = useCardText(card, lang);
  const Arrow = s.isArabic ? ArrowLeft : ArrowRight;
  return (
    <section role="region" aria-roledescription="carousel" aria-label={t("مختارات دار نظم", "DarNozom Highlights")} {...s.handlers}
      className="grid min-h-[480px] w-full overflow-hidden bg-navy-deep text-white lg:min-h-[560px] lg:grid-cols-2">
      <h1 className="sr-only">{t("مختارات دار نظم", "DarNozom Highlights")}</h1>
      <div className="relative order-2 flex flex-col justify-center px-6 py-12 lg:order-1 lg:px-16">
        <motion.div key={card.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-xl">
          {c.badge && <span className="inline-block border-s-4 border-gold-light ps-2 text-sm font-semibold">{c.badge}</span>}
          <h2 className="mt-4 text-3xl font-bold leading-tight lg:text-5xl">{c.title}</h2>
          {c.summary && <p className="mt-5 text-base leading-8 text-white/80 line-clamp-4">{c.summary}</p>}
          <CardLink href={card.href} className="mt-8 inline-flex min-h-11 items-center gap-2 bg-gold-light px-6 font-bold text-ink hover:bg-gold">
            {c.cta} <Arrow className="h-4 w-4" aria-hidden />
          </CardLink>
        </motion.div>
        {cards.length > 1 && (
          <div className="mt-10 flex items-center gap-4">
            <button type="button" onClick={s.prev} aria-label={t("العنصر السابق", "Previous item")} className="flex h-11 w-11 items-center justify-center border border-white/30 hover:bg-white/10"><s.PrevIcon className="h-5 w-5" /></button>
            <button type="button" onClick={s.next} aria-label={t("العنصر التالي", "Next item")} className="flex h-11 w-11 items-center justify-center border border-white/30 hover:bg-white/10"><s.NextIcon className="h-5 w-5" /></button>
            <span className="text-sm tabular-nums text-white/70" dir="ltr">{String(s.index + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}</span>
          </div>
        )}
      </div>
      <div className="relative order-1 h-64 lg:order-2 lg:h-auto">
        <motion.div key={`i-${card.id}`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0">
          <CardImage card={card} lang={lang} />
        </motion.div>
        <div aria-hidden className="absolute inset-y-0 start-0 w-1.5 bg-gold" />
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

/* ───────── Design 3: centered — big centered headline over the image ───────── */
export function CenteredHero({ cards }: { cards: FeaturedCard[] }) {
  const { language: lang } = useLanguage();
  const s = useSlides(cards.length);
  const reduce = useReducedMotion();
  const t = (ar: string, en: string) => (s.isArabic ? ar : en);
  const card = cards[s.index];
  const c = useCardText(card, lang);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={t("مختارات دار نظم", "DarNozom Highlights")} {...s.handlers}
      className="relative isolate flex min-h-[560px] w-full items-center overflow-hidden bg-navy-deep text-white lg:min-h-[640px]">
      <h1 className="sr-only">{t("مختارات دار نظم", "DarNozom Highlights")}</h1>
      <motion.div key={`i-${card.id}`} initial={reduce ? false : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="absolute inset-0 -z-20">
        <CardImage card={card} lang={lang} />
      </motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-navy-deep/70" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      {cards.length > 1 && (
        <>
          <button type="button" onClick={s.prev} aria-label={t("العنصر السابق", "Previous item")} className="absolute start-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 hover:bg-white/10 md:flex"><s.PrevIcon className="h-6 w-6" /></button>
          <button type="button" onClick={s.next} aria-label={t("العنصر التالي", "Next item")} className="absolute end-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 hover:bg-white/10 md:flex"><s.NextIcon className="h-6 w-6" /></button>
        </>
      )}
      <div className={`mx-auto w-full ${HOME_MAX_W} ${HOME_PX} pb-20 pt-32 text-center`}>
        <motion.div key={card.id} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-3xl">
          {c.badge && (
            <span className="inline-flex items-center gap-3 text-sm font-semibold text-gold-light">
              <span className="h-px w-8 bg-gold-light" aria-hidden />{c.badge}<span className="h-px w-8 bg-gold-light" aria-hidden />
            </span>
          )}
          <h2 className="mt-5 text-3xl font-bold leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,.5)] md:text-5xl lg:text-6xl">{c.title}</h2>
          {c.summary && <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/85 line-clamp-3">{c.summary}</p>}
          <CardLink href={card.href} className="mt-8 inline-flex min-h-12 items-center border-2 border-gold-light px-8 font-bold text-gold-light transition hover:bg-gold-light hover:text-ink">
            {c.cta}
          </CardLink>
        </motion.div>
        <div className="mt-10 flex justify-center"><Dots count={cards.length} index={s.index} go={s.go} label={t("اختيار الشريحة", "Choose slide")} /></div>
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

/* ───────── Design 4: magazine — lead card plus a list of the others, on a light background ───────── */
export function MagazineHero({ cards }: { cards: FeaturedCard[] }) {
  const { language: lang } = useLanguage();
  const s = useSlides(cards.length);
  const reduce = useReducedMotion();
  const t = (ar: string, en: string) => (s.isArabic ? ar : en);
  const card = cards[s.index];
  const c = useCardText(card, lang);
  const Arrow = s.isArabic ? ArrowLeft : ArrowRight;
  return (
    <section role="region" aria-roledescription="carousel" aria-label={t("مختارات دار نظم", "DarNozom Highlights")} {...s.handlers}
      className="w-full bg-[#F8F6F1] py-8 text-ink lg:py-10">
      <h1 className="sr-only">{t("مختارات دار نظم", "DarNozom Highlights")}</h1>
      <div className={`mx-auto grid ${HOME_MAX_W} ${HOME_PX} gap-5 ${cards.length > 1 ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
        <motion.article key={card.id} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
          className="relative isolate flex min-h-[380px] flex-col justify-end overflow-hidden bg-navy-deep text-white lg:min-h-[480px]">
          <div className="absolute inset-0 -z-20"><CardImage card={card} lang={lang} /></div>
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="max-w-2xl p-6 lg:p-10">
            {c.badge && <span className="inline-block bg-gold-light px-3 py-1 text-xs font-bold text-ink">{c.badge}</span>}
            <h2 className="mt-3 text-2xl font-bold leading-snug lg:text-4xl">{c.title}</h2>
            {c.summary && <p className="mt-3 text-white/85 line-clamp-2">{c.summary}</p>}
            <CardLink href={card.href} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-gold-light hover:underline">{c.cta} <Arrow className="h-4 w-4" aria-hidden /></CardLink>
          </div>
        </motion.article>
        {cards.length > 1 && (
          <ul className="m-0 flex list-none gap-3 overflow-x-auto p-0 lg:flex-col lg:overflow-visible" aria-label={t("المزيد من المختارات", "More highlights")}>
            {cards.map((other, i) => <MagazineRow key={other.id} card={other} lang={lang} current={i === s.index} onSelect={() => s.go(i)} />)}
          </ul>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

function MagazineRow({ card, lang, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <li className="min-w-[75vw] shrink-0 sm:min-w-[45vw] lg:min-w-0 lg:flex-1 lg:shrink">
      <button type="button" onClick={onSelect} aria-current={current} aria-label={c.title}
        className={`flex h-full w-full items-stretch gap-3 border text-start transition ${current ? "border-gold border-s-4 bg-white shadow-md" : "border-line bg-white/60 hover:bg-white"}`}>
        <span className="block h-full min-h-[84px] w-28 shrink-0 overflow-hidden bg-mist"><CardImage card={card} lang={lang} /></span>
        <span className="flex flex-col justify-center py-3 pe-3">
          {c.badge && <span className="mb-1 text-xs font-semibold text-gold">{c.badge}</span>}
          <span className="font-semibold leading-snug line-clamp-3">{c.title}</span>
        </span>
      </button>
    </li>
  );
}
