import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import type { FeaturedCard } from "@/lib/cms-types";
import { CardLink, useCardText } from "./hero-shared";
import { CardImage, Dots, useSlides } from "./hero-variants";

const LOGO = `${import.meta.env.BASE_URL}darnozom-n-logo-navy.png`;
type HeroProps = { cards: FeaturedCard[] };

function useHero(cards: FeaturedCard[]) {
  const { language: lang } = useLanguage();
  const s = useSlides(cards.length);
  const reduce = useReducedMotion();
  const t = (ar: string, en: string) => (s.isArabic ? ar : en);
  const card = cards[s.index];
  const c = useCardText(card, lang);
  const Arrow = s.isArabic ? ArrowLeft : ArrowRight;
  return { lang, s, reduce, t, card, c, Arrow, label: t("مختارات دار نظم", "DarNozom Highlights") };
}

const fade = (reduce: boolean | null) => ({ initial: reduce ? false as const : { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } });

/** Round prev/next buttons shared by several designs. */
function RoundArrows({ s, t, className = "" }: { s: ReturnType<typeof useSlides>; t: (a: string, b: string) => string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button type="button" onClick={s.prev} aria-label={t("العنصر السابق", "Previous item")} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 text-white transition hover:bg-white hover:text-navy-deep"><s.PrevIcon className="h-5 w-5" /></button>
      <button type="button" onClick={s.next} aria-label={t("العنصر التالي", "Next item")} className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 text-white transition hover:bg-white hover:text-navy-deep"><s.NextIcon className="h-5 w-5" /></button>
    </div>
  );
}

/* ───────── Classic family: thumbnail strip ───────── */
export function ThumbsHero({ cards }: HeroProps) {
  const { lang, s, reduce, t, card, c, Arrow, label } = useHero(cards);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} {...s.handlers} className="relative isolate flex min-h-[500px] w-full flex-col overflow-hidden bg-navy-deep text-white lg:min-h-[560px]">
      <h1 className="sr-only">{label}</h1>
      <motion.div key={`i-${card.id}`} {...fade(reduce)} className="absolute inset-0 -z-20"><CardImage card={card} lang={lang} /></motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className={`mx-auto flex w-full flex-1 flex-col justify-end ${HOME_MAX_W} ${HOME_PX} pt-16 pb-5`}>
        <motion.div key={card.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          {c.badge && <span className="inline-block border-s-4 border-gold-light ps-2 text-sm font-semibold">{c.badge}</span>}
          <h2 className="mt-2 text-2xl font-bold leading-snug lg:text-4xl [text-shadow:0_2px_8px_rgba(0,0,0,.6)]">{c.title}</h2>
          {c.summary && <p className="mt-2 text-white/85 line-clamp-2">{c.summary}</p>}
          <CardLink href={card.href} className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-gold-light hover:underline">{c.cta} <Arrow className="h-4 w-4" aria-hidden /></CardLink>
        </motion.div>
        {cards.length > 1 && (
          <div className="mt-5 flex items-stretch gap-2">
            <button type="button" onClick={s.prev} aria-label={t("العنصر السابق", "Previous item")} className="hidden w-10 shrink-0 items-center justify-center bg-black/40 hover:bg-black/60 lg:flex"><s.PrevIcon className="h-5 w-5" /></button>
            <ul className="m-0 flex min-w-0 flex-1 list-none snap-x gap-2 overflow-x-auto p-0 lg:overflow-visible">
              {cards.map((o, i) => <ThumbTile key={o.id} card={o} lang={lang} current={i === s.index} onSelect={() => s.go(i)} />)}
            </ul>
            <button type="button" onClick={s.next} aria-label={t("العنصر التالي", "Next item")} className="hidden w-10 shrink-0 items-center justify-center bg-black/40 hover:bg-black/60 lg:flex"><s.NextIcon className="h-5 w-5" /></button>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

function ThumbTile({ card, lang, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <li className="w-[60vw] shrink-0 snap-start sm:w-[34vw] lg:w-auto lg:min-w-0 lg:flex-1 lg:basis-0">
      <button type="button" onClick={onSelect} aria-current={current} aria-label={c.title}
        className={`group block w-full overflow-hidden text-start transition ${current ? "bg-white/95 text-ink" : "bg-navy-deep/70 text-white backdrop-blur-sm hover:bg-navy-deep/90"}`}>
        <span className="relative block h-20 overflow-hidden"><CardImage card={card} lang={lang} className={`h-full w-full object-cover transition ${current ? "" : "opacity-70 group-hover:opacity-100"}`} />
          <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${current ? "bg-gold" : "bg-transparent"}`} /></span>
        <span className="block px-3 py-2 text-sm font-semibold leading-snug line-clamp-2">{c.title}</span>
      </button>
    </li>
  );
}

/* ───────── Classic family: numbered side list with progress ───────── */
export function SidebarHero({ cards }: HeroProps) {
  const { lang, s, reduce, t, card, c, Arrow, label } = useHero(cards);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} {...s.handlers} className="relative isolate min-h-[500px] w-full overflow-hidden bg-navy-deep text-white lg:min-h-[560px]">
      <h1 className="sr-only">{label}</h1>
      <motion.div key={`i-${card.id}`} {...fade(reduce)} className="absolute inset-0 -z-20"><CardImage card={card} lang={lang} /></motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
      <div className={`mx-auto grid h-full min-h-[500px] w-full lg:min-h-[560px] ${HOME_MAX_W} ${HOME_PX} items-end gap-6 py-8 lg:grid-cols-[1fr_340px]`}>
        <motion.div key={card.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl pb-2">
          {c.badge && <span className="inline-block bg-gold-light px-3 py-1 text-xs font-bold text-ink">{c.badge}</span>}
          <h2 className="mt-3 text-2xl font-bold leading-snug lg:text-4xl [text-shadow:0_2px_8px_rgba(0,0,0,.6)]">{c.title}</h2>
          {c.summary && <p className="mt-3 text-white/85 line-clamp-3">{c.summary}</p>}
          <CardLink href={card.href} className="mt-3 inline-flex min-h-11 items-center gap-2 font-bold text-gold-light hover:underline">{c.cta} <Arrow className="h-4 w-4" aria-hidden /></CardLink>
          <div className="mt-4 lg:hidden"><Dots count={cards.length} index={s.index} go={s.go} label={t("اختيار الشريحة", "Choose slide")} /></div>
        </motion.div>
        {cards.length > 1 && (
          <ol className="m-0 hidden list-none self-end bg-navy-deep/75 p-0 backdrop-blur-md lg:block">
            {cards.map((o, i) => <SideRow key={o.id} card={o} lang={lang} n={i + 1} current={i === s.index} onSelect={() => s.go(i)} />)}
          </ol>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

function SideRow({ card, lang, n, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; n: number; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <li className="border-b border-white/10 last:border-0">
      <button type="button" onClick={onSelect} aria-current={current} aria-label={c.title}
        className={`relative flex w-full items-start gap-3 px-4 py-3 text-start transition ${current ? "bg-white/10" : "hover:bg-white/5"}`}>
        <span className={`text-lg font-bold tabular-nums ${current ? "text-gold-light" : "text-white/40"}`} dir="ltr">{String(n).padStart(2, "0")}</span>
        <span className={`text-sm font-semibold leading-snug line-clamp-2 ${current ? "text-white" : "text-white/70"}`}>{c.title}</span>
        {current && <motion.span aria-hidden layoutId="side-progress" className="absolute inset-y-0 start-0 w-1 bg-gold-light" />}
      </button>
    </li>
  );
}

/* ───────── Jusoor: clean full-bleed image, title low, round arrows opposite ───────── */
export function JusoorHero({ cards }: HeroProps) {
  const { lang, s, reduce, t, card, c, label } = useHero(cards);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} {...s.handlers} className="relative isolate flex h-[420px] w-full items-end overflow-hidden bg-navy-deep text-white md:h-[500px] lg:h-[560px]">
      <h1 className="sr-only">{label}</h1>
      <motion.div key={`i-${card.id}`} {...fade(reduce)} className="absolute inset-0 -z-20"><CardImage card={card} lang={lang} /></motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className={`mx-auto flex w-full ${HOME_MAX_W} ${HOME_PX} flex-col-reverse items-start gap-6 pb-8 lg:flex-row lg:items-end lg:justify-between lg:pb-12`}>
        <motion.div key={card.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-4xl">
          <CardLink href={card.href} className="block hover:opacity-95">
            <h2 className="text-2xl font-extrabold leading-tight md:text-4xl lg:text-5xl [text-shadow:0_2px_10px_rgba(0,0,0,.45)]">{c.title}</h2>
          </CardLink>
          {c.summary && <p className="mt-3 max-w-3xl text-base text-white/85 line-clamp-2 md:text-lg">{c.summary}</p>}
          <div className="mt-4 inline-flex items-center gap-2">
            <img src={LOGO} alt="" className="h-7 w-7 rounded-full bg-white p-1" />
            <span className="text-sm font-semibold">{c.badge || t("دار نظم", "DarNozom")}</span>
          </div>
        </motion.div>
        {cards.length > 1 && <RoundArrows s={s} t={t} className="shrink-0" />}
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

/* ───────── Masarat: compact light carousel — lead story and a divided list ───────── */
export function MasaratHero({ cards }: HeroProps) {
  const { lang, s, reduce, t, card, c, Arrow, label } = useHero(cards);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} {...s.handlers} className="w-full bg-white py-5 text-ink lg:py-6">
      <h1 className="sr-only">{label}</h1>
      <div className={`mx-auto ${HOME_MAX_W} ${HOME_PX}`}>
        <div className="mb-3 flex items-center justify-between border-b-2 border-navy pb-2">
          <span className="border-s-4 border-gold ps-3 text-lg font-bold text-navy">{label}</span>
          {cards.length > 1 && (
            <div className="flex gap-1">
              <button type="button" onClick={s.prev} aria-label={t("العنصر السابق", "Previous item")} className="flex h-9 w-9 items-center justify-center border border-line text-navy hover:bg-navy hover:text-white"><s.PrevIcon className="h-4 w-4" /></button>
              <button type="button" onClick={s.next} aria-label={t("العنصر التالي", "Next item")} className="flex h-9 w-9 items-center justify-center border border-line text-navy hover:bg-navy hover:text-white"><s.NextIcon className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <div className={`grid gap-5 ${cards.length > 1 ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
          <motion.article key={card.id} {...fade(reduce)} className="grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div className="aspect-[16/10] overflow-hidden bg-mist"><CardImage card={card} lang={lang} /></div>
            <div>
              {c.badge && <span className="text-xs font-bold text-gold">{c.badge}</span>}
              <h2 className="mt-1 text-xl font-bold leading-snug text-navy lg:text-2xl">{c.title}</h2>
              {c.summary && <p className="mt-2 text-sm leading-7 text-ink-muted line-clamp-3">{c.summary}</p>}
              <CardLink href={card.href} className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-navy hover:text-gold">{c.cta} <Arrow className="h-4 w-4" aria-hidden /></CardLink>
            </div>
          </motion.article>
          {cards.length > 1 && (
            <ul className="m-0 list-none divide-y divide-line border-line p-0 lg:border-s lg:ps-5">
              {cards.map((o, i) => <MasaratRow key={o.id} card={o} lang={lang} current={i === s.index} onSelect={() => s.go(i)} />)}
            </ul>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

function MasaratRow({ card, lang, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <li>
      <button type="button" onClick={onSelect} aria-current={current} aria-label={c.title} className="flex w-full items-center gap-3 py-2.5 text-start">
        <span className="h-14 w-20 shrink-0 overflow-hidden bg-mist"><CardImage card={card} lang={lang} /></span>
        <span className={`text-sm font-semibold leading-snug line-clamp-2 ${current ? "text-gold" : "text-navy hover:text-gold"}`}>{c.title}</span>
      </button>
    </li>
  );
}

/* ───────── Rosewell: big cover under a transparent nav, glass cards along the bottom ───────── */
export function RosewellHero({ cards }: HeroProps) {
  const { lang, s, reduce, t, card, c, Arrow, label } = useHero(cards);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} {...s.handlers} className="relative isolate flex min-h-[620px] w-full flex-col overflow-hidden bg-navy-deep text-white lg:min-h-[700px]">
      <h1 className="sr-only">{label}</h1>
      <motion.div key={`i-${card.id}`} initial={reduce ? false : { opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }} className="absolute inset-0 -z-20"><CardImage card={card} lang={lang} /></motion.div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-deep/90 via-navy-deep/55 to-navy-deep/10 rtl:bg-gradient-to-l" />
      <div className={`mx-auto flex w-full flex-1 flex-col justify-center ${HOME_MAX_W} ${HOME_PX} pt-32 pb-8`}>
        <motion.div key={card.id} initial={reduce ? false : { opacity: 0, x: s.isArabic ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl">
          <span className="inline-flex items-center gap-3 text-sm font-semibold tracking-wide text-gold-light">
            <span className="h-px w-10 bg-gold-light" aria-hidden />{c.badge || t("دار نظم", "DarNozom")}
          </span>
          <h2 className="mt-4 text-4xl font-extrabold leading-[1.15] lg:text-6xl">{c.title}</h2>
          {c.summary && <p className="mt-5 max-w-xl text-lg leading-8 text-white/80 line-clamp-3">{c.summary}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CardLink href={card.href} className="inline-flex min-h-12 items-center gap-2 bg-gold-light px-7 font-bold text-ink transition hover:bg-gold">{c.cta} <Arrow className="h-4 w-4" aria-hidden /></CardLink>
            {cards.length > 1 && <RoundArrows s={s} t={t} />}
          </div>
        </motion.div>
      </div>
      {cards.length > 1 && (
        <ul className={`relative mx-auto m-0 mb-6 flex w-full list-none gap-3 overflow-x-auto p-0 ${HOME_MAX_W} ${HOME_PX} lg:overflow-visible`}>
          {cards.map((o, i) => <GlassCard key={o.id} card={o} lang={lang} n={i + 1} current={i === s.index} onSelect={() => s.go(i)} />)}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

function GlassCard({ card, lang, n, current, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; n: number; current: boolean; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <li className="w-[65vw] shrink-0 sm:w-[40vw] lg:w-auto lg:min-w-0 lg:flex-1 lg:basis-0">
      <button type="button" onClick={onSelect} aria-current={current} aria-label={c.title}
        className={`flex h-full w-full items-start gap-3 border-t-2 p-4 text-start backdrop-blur-md transition ${current ? "border-gold-light bg-white/20" : "border-white/20 bg-white/5 hover:bg-white/10"}`}>
        <span className={`text-2xl font-extrabold tabular-nums ${current ? "text-gold-light" : "text-white/40"}`} dir="ltr">{String(n).padStart(2, "0")}</span>
        <span className="text-sm font-semibold leading-snug line-clamp-3">{c.title}</span>
      </button>
    </li>
  );
}

/* ───────── Mokha: news-portal hero — big slide with a 01/06 counter beside a stack of items ───────── */
export function MokhaHero({ cards }: HeroProps) {
  const { lang, s, reduce, t, card, c, Arrow, label } = useHero(cards);
  const others = cards.map((o, i) => ({ o, i })).filter(({ i }) => i !== s.index).slice(0, 5);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} {...s.handlers} className="w-full bg-white py-4 text-ink lg:py-5">
      <h1 className="sr-only">{label}</h1>
      <div className={`mx-auto grid ${HOME_MAX_W} ${HOME_PX} gap-4 ${others.length ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
        <div className="relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden bg-navy-deep text-white lg:min-h-[440px]">
          <motion.div key={`i-${card.id}`} {...fade(reduce)} className="absolute inset-0 -z-20"><CardImage card={card} lang={lang} /></motion.div>
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {cards.length > 1 && (
            <div className="absolute end-4 top-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 text-sm font-bold tabular-nums backdrop-blur" dir="ltr">
              <button type="button" onClick={s.prev} aria-label={t("العنصر السابق", "Previous item")} className="hover:text-gold-light">‹</button>
              <span>{pad(s.index + 1)}<span className="text-white/50"> / {pad(cards.length)}</span></span>
              <button type="button" onClick={s.next} aria-label={t("العنصر التالي", "Next item")} className="hover:text-gold-light">›</button>
            </div>
          )}
          <motion.div key={card.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl p-5 lg:p-8">
            {c.badge && <span className="inline-block bg-gold-light px-3 py-1 text-xs font-bold text-ink">{c.badge}</span>}
            <h2 className="mt-3 text-2xl font-bold leading-snug lg:text-4xl">{c.title}</h2>
            {c.summary && <p className="mt-2 text-white/85 line-clamp-2">{c.summary}</p>}
            <CardLink href={card.href} className="mt-2 inline-flex min-h-10 items-center gap-2 font-bold text-gold-light hover:underline">{c.cta} <Arrow className="h-4 w-4" aria-hidden /></CardLink>
          </motion.div>
          <div aria-hidden className="h-1 w-full bg-white/20"><div className="h-full bg-gold-light transition-all" style={{ width: `${((s.index + 1) / cards.length) * 100}%` }} /></div>
        </div>
        {others.length > 0 && (
          <ul className="m-0 flex list-none gap-3 overflow-x-auto p-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:divide-y lg:divide-line" aria-label={t("المزيد من المختارات", "More highlights")}>
            {others.map(({ o, i }) => <MokhaRow key={o.id} card={o} lang={lang} onSelect={() => s.go(i)} />)}
          </ul>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{c.title}</p>
    </section>
  );
}

function MokhaRow({ card, lang, onSelect }: { card: FeaturedCard; lang: "ar" | "en"; onSelect: () => void }) {
  const c = useCardText(card, lang);
  return (
    <li className="w-[78vw] shrink-0 sm:w-[48vw] lg:w-auto lg:flex-1 lg:shrink">
      <button type="button" onClick={onSelect} aria-label={c.title} className="group flex h-full w-full items-center gap-3 py-2 text-start lg:py-1.5">
        <span className="h-16 w-24 shrink-0 overflow-hidden bg-mist lg:h-full lg:max-h-[72px]"><CardImage card={card} lang={lang} className="h-full w-full object-cover transition group-hover:scale-105" /></span>
        <span className="min-w-0">
          {c.badge && <span className="block text-xs font-bold text-gold">{c.badge}</span>}
          <span className="block text-sm font-semibold leading-snug text-navy line-clamp-2 group-hover:text-gold">{c.title}</span>
        </span>
      </button>
    </li>
  );
}
