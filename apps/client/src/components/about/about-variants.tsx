import { Link } from "wouter";
import { ArrowLeft, Compass, Quote, Target } from "lucide-react";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import type { AboutContent } from "@/lib/about-content";
import type { AboutDesign } from "@/lib/page-designs";

const STRUCTURE = [
  { ar: "مركز دار نظم للبحوث والدراسات", en: "DarNozom Research and Studies Center", href: "/center" },
  { ar: "أكاديمية دار نظم", en: "DarNozom Academy", href: "/academy" },
  { ar: "الاستشارات", en: "Consulting", href: "/services/consulting" },
  { ar: "نظم بلاتفورم", en: "Nozom Platform", href: "/services/digital-transformation" },
];

interface P { c: AboutContent; isArabic: boolean; t: (ar: string, en: string) => string }
const wrap = `mx-auto ${HOME_MAX_W} ${HOME_PX}`;
const num = (i: number) => String(i + 1).padStart(2, "0");
const vm = (c: AboutContent, t: P["t"]) => [
  { id: "vision", icon: Compass, title: t("رؤيتنا", "Our Vision"), body: t(c.visionAr, c.visionEn) },
  { id: "mission", icon: Target, title: t("رسالتنا", "Our Mission"), body: t(c.missionAr, c.missionEn) },
];

function Heading({ children, dark, center }: { children: React.ReactNode; dark?: boolean; center?: boolean }) {
  return (
    <>
      <h2 className={`text-3xl font-bold ${dark ? "" : "text-navy"} ${center ? "text-center" : ""}`}>{children}</h2>
      <span className={`mt-4 block h-1 w-14 bg-gold ${center ? "mx-auto" : ""}`} aria-hidden />
    </>
  );
}

function Structure({ isArabic, t, tone = "light" }: Omit<P, "c"> & { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <section id="structure" className={`scroll-mt-24 py-20 ${dark ? "dark bg-navy-deep text-white" : "bg-white"}`}>
      <div className={wrap}>
        <Heading dark={dark}>{t("هيكل المؤسسة", "Institutional Structure")}</Heading>
        <p className={`mt-6 max-w-2xl ${dark ? "text-white/70" : "text-ink-muted"}`}>
          {t("أذرع متكاملة في مؤسسة واحدة", "Complementary functions within one institution")}
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STRUCTURE.map((item, i) => (
            <Link key={item.en} href={item.href}
              className={`group flex flex-col rounded-lg border p-7 transition hover:-translate-y-1 hover:border-gold hover:shadow-lg ${dark ? "border-white/15 bg-white/5" : "border-line bg-white"}`}>
              <span className="mb-6 text-sm text-gold" dir="ltr">{num(i)}</span>
              <h3 className={`mb-3 text-lg font-bold ${dark ? "text-white" : "text-navy"}`}>{isArabic ? item.ar : item.en}</h3>
              <p className={`text-sm leading-7 ${dark ? "text-white/70" : "text-ink-muted"}`}>
                {t("منهج وهوية مشتركة ومخرجات متخصصة.", "A shared approach and identity, with specialized outputs.")}
              </p>
              <span className={`mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold ${dark ? "text-gold-light" : "text-navy"}`}>
                {t("اكتشف المزيد", "Explore more")}
                <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${isArabic ? "" : "rotate-180 group-hover:translate-x-1"}`} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Design 1: classic (the original layout) ───────── */
function Classic({ c, isArabic, t }: P) {
  return (
    <>
      <section className="dark relative isolate overflow-hidden bg-[#183650] text-white">
        {c.imageUrl && (
          <>
            <img src={c.imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#183650] via-[#183650]/85 to-[#183650]/55" />
          </>
        )}
        <div className={`${wrap} pt-36 pb-28 lg:pt-44 lg:pb-36`}>
          <div className="mb-6 flex items-center gap-3 text-sm text-gold">
            <span className="h-px w-10 bg-gold" aria-hidden />
            <span>{t("من نحن", "About us")}</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">{t(c.titleAr, c.titleEn)}</h1>
          <p className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-white/80 md:text-lg">{t(c.introAr, c.introEn)}</p>
        </div>
      </section>

      <section className="relative z-10 -mt-16 pb-20 lg:-mt-20">
        <div className={`${wrap} grid gap-6 md:grid-cols-2`}>
          {vm(c, t).map(({ id, icon: Icon, title, body }) => (
            <article key={id} id={id} className="scroll-mt-28 rounded-lg border border-line border-t-4 border-t-gold bg-white p-8 shadow-xl shadow-navy/10 lg:p-10">
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-mist text-navy"><Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden /></span>
              <h2 className="mb-4 text-2xl font-bold text-navy">{title}</h2>
              <p className="leading-8 text-ink-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="scroll-mt-24 bg-mist py-20">
        <div className={wrap}>
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Heading>{t("منهجنا", "Our Approach")}</Heading>
              <p className="mt-6 leading-8 text-ink-muted">{t(c.approachIntroAr, c.approachIntroEn)}</p>
            </div>
            <ol className="m-0 list-none space-y-5 p-0">
              {c.steps.map((s, i) => (
                <li key={i} className="flex gap-6 rounded-lg border border-line bg-white p-6 lg:p-8">
                  <span className="text-4xl font-bold leading-none text-gold" dir="ltr">{num(i)}</span>
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-navy">{isArabic ? s.ar : s.en}</h3>
                    <p className="leading-8 text-ink-muted">{isArabic ? s.descAr : s.descEn}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="values" className="dark scroll-mt-24 bg-[#183650] py-20 text-white">
        <div className={wrap}>
          <Heading dark>{t("قيمنا", "Our Values")}</Heading>
          <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-px overflow-hidden rounded-lg bg-white/15 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {c.values.map((v, i) => (
              <li key={i} className="flex items-center gap-4 bg-[#183650] p-6 text-lg">
                <span className="text-sm text-gold" dir="ltr">{num(i)}</span>{isArabic ? v.ar : v.en}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Structure isArabic={isArabic} t={t} />
    </>
  );
}

/* ───────── Design 2: split — light hero, text beside image, vertical timeline ───────── */
function Split({ c, isArabic, t }: P) {
  return (
    <>
      <section className="bg-[#F8F6F1] pt-28 pb-16 lg:pt-36 lg:pb-24">
        <div className={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
          <div>
            <span className="text-sm font-semibold text-gold">{t("من نحن", "About us")}</span>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-navy md:text-5xl">{t(c.titleAr, c.titleEn)}</h1>
            <span className="mt-6 block h-1 w-14 bg-gold" aria-hidden />
            <p className="mt-6 whitespace-pre-line leading-8 text-ink-muted">{t(c.introAr, c.introEn)}</p>
          </div>
          {c.imageUrl && (
            <div className="relative">
              <div aria-hidden className="absolute -bottom-4 -end-4 h-full w-full border-2 border-gold" />
              <img src={c.imageUrl} alt="" className="relative aspect-[4/3] w-full object-cover shadow-xl" />
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className={`${wrap} grid gap-px overflow-hidden border border-line bg-line md:grid-cols-2`}>
          {vm(c, t).map(({ id, icon: Icon, title, body }) => (
            <article key={id} id={id} className="scroll-mt-28 bg-white p-8 lg:p-12">
              <Icon className="mb-4 h-8 w-8 text-gold" strokeWidth={1.5} aria-hidden />
              <h2 className="mb-3 text-2xl font-bold text-navy">{title}</h2>
              <p className="leading-8 text-ink-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="scroll-mt-24 bg-mist py-20">
        <div className={`${wrap} max-w-4xl`}>
          <Heading>{t("منهجنا", "Our Approach")}</Heading>
          <p className="mt-6 leading-8 text-ink-muted">{t(c.approachIntroAr, c.approachIntroEn)}</p>
          <ol className="m-0 mt-12 list-none p-0">
            {c.steps.map((s, i) => (
              <li key={i} className="relative flex gap-6 pb-10 last:pb-0">
                {i < c.steps.length - 1 && <span aria-hidden className="absolute start-6 top-12 bottom-0 w-px -translate-x-1/2 bg-gold/50 rtl:translate-x-1/2" />}
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy font-bold text-white" dir="ltr">{num(i)}</span>
                <div className="pt-2">
                  <h3 className="mb-2 text-xl font-bold text-navy">{isArabic ? s.ar : s.en}</h3>
                  <p className="leading-8 text-ink-muted">{isArabic ? s.descAr : s.descEn}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="values" className="scroll-mt-24 bg-white py-20">
        <div className={wrap}>
          <Heading>{t("قيمنا", "Our Values")}</Heading>
          <ul className="m-0 mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {c.values.map((v, i) => (
              <li key={i} className="flex items-center gap-4 border-s-4 border-gold bg-[#F8F6F1] p-5 text-lg font-semibold text-navy">
                <span className="text-sm text-gold" dir="ltr">{num(i)}</span>{isArabic ? v.ar : v.en}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Structure isArabic={isArabic} t={t} />
    </>
  );
}

/* ───────── Design 3: editorial — oversized type, wide image, columns and chips ───────── */
function Editorial({ c, isArabic, t }: P) {
  return (
    <>
      <section className="bg-white pt-32 lg:pt-44">
        <div className={wrap}>
          <span className="text-sm font-semibold tracking-wide text-gold">{t("من نحن", "About us")}</span>
          <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-[1.1] text-navy md:text-7xl">{t(c.titleAr, c.titleEn)}</h1>
          <div className="mt-12 grid gap-10 border-t border-line pt-10 lg:grid-cols-[1fr_2fr]">
            <span className="text-sm text-ink-muted">DarNozom · دار نظم</span>
            <p className="whitespace-pre-line text-lg leading-9 text-ink md:text-xl">{t(c.introAr, c.introEn)}</p>
          </div>
        </div>
        {c.imageUrl && (
          <div className={`${wrap} mt-14`}><img src={c.imageUrl} alt="" className="aspect-[21/9] w-full object-cover" /></div>
        )}
      </section>

      <section className="bg-white py-20">
        <div className={`${wrap} grid gap-16 lg:grid-cols-2`}>
          {vm(c, t).map(({ id, title, body }) => (
            <article key={id} id={id} className="scroll-mt-28">
              <Quote className="mb-4 h-8 w-8 text-gold" aria-hidden />
              <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gold">{title}</h2>
              <p className="text-2xl font-semibold leading-relaxed text-navy">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="scroll-mt-24 bg-[#F8F6F1] py-20">
        <div className={wrap}>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
            <Heading>{t("منهجنا", "Our Approach")}</Heading>
            <p className="leading-8 text-ink-muted lg:-mt-1">{t(c.approachIntroAr, c.approachIntroEn)}</p>
          </div>
          <ol className="m-0 mt-12 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map((s, i) => (
              <li key={i} className="border-t-2 border-navy pt-5">
                <span className="text-5xl font-bold text-gold/70" dir="ltr">{num(i)}</span>
                <h3 className="mt-4 mb-2 text-lg font-bold text-navy">{isArabic ? s.ar : s.en}</h3>
                <p className="text-sm leading-7 text-ink-muted">{isArabic ? s.descAr : s.descEn}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="values" className="scroll-mt-24 bg-white py-20">
        <div className={wrap}>
          <Heading>{t("قيمنا", "Our Values")}</Heading>
          <ul className="m-0 mt-10 flex list-none flex-wrap gap-3 p-0">
            {c.values.map((v, i) => (
              <li key={i} className="rounded-full border border-navy/25 px-6 py-3 text-lg text-navy transition hover:bg-navy hover:text-white">{isArabic ? v.ar : v.en}</li>
            ))}
          </ul>
        </div>
      </section>
      <Structure isArabic={isArabic} t={t} />
    </>
  );
}

/* ───────── Design 4: immersive — fully dark page, centered cover, glass cards ───────── */
function Immersive({ c, isArabic, t }: P) {
  return (
    <div className="dark bg-navy-deep text-white">
      <section className="relative isolate overflow-hidden">
        {c.imageUrl && (
          <>
            <img src={c.imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-navy-deep/80" />
          </>
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy-deep to-transparent" />
        <div className={`${wrap} flex min-h-[620px] flex-col items-center justify-center pt-32 pb-24 text-center`}>
          <span className="rounded-full border border-gold/60 px-4 py-1 text-sm text-gold-light">{t("من نحن", "About us")}</span>
          <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">{t(c.titleAr, c.titleEn)}</h1>
          <p className="mt-8 max-w-3xl whitespace-pre-line leading-8 text-white/80 md:text-lg">{t(c.introAr, c.introEn)}</p>
        </div>
      </section>

      <section className="pb-20">
        <div className={`${wrap} grid gap-6 md:grid-cols-2`}>
          {vm(c, t).map(({ id, icon: Icon, title, body }) => (
            <article key={id} id={id} className="scroll-mt-28 rounded-2xl border border-white/15 bg-white/5 p-8 backdrop-blur lg:p-10">
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-gold-light"><Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden /></span>
              <h2 className="mb-4 text-2xl font-bold">{title}</h2>
              <p className="leading-8 text-white/75">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="method" className="scroll-mt-24 border-y border-white/10 py-20">
        <div className={wrap}>
          <div className="mx-auto max-w-3xl text-center">
            <Heading dark center>{t("منهجنا", "Our Approach")}</Heading>
            <p className="mt-6 leading-8 text-white/70">{t(c.approachIntroAr, c.approachIntroEn)}</p>
          </div>
          <ol className="m-0 mt-12 grid list-none gap-5 p-0 md:grid-cols-2">
            {c.steps.map((s, i) => (
              <li key={i} className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-transparent p-8">
                <span aria-hidden className="absolute -top-4 end-4 text-8xl font-black text-white/5" dir="ltr">{num(i)}</span>
                <h3 className="relative mb-3 text-xl font-bold text-gold-light">{isArabic ? s.ar : s.en}</h3>
                <p className="relative leading-8 text-white/75">{isArabic ? s.descAr : s.descEn}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="values" className="scroll-mt-24 py-20">
        <div className={wrap}>
          <Heading dark center>{t("قيمنا", "Our Values")}</Heading>
          <ul className="m-0 mt-10 flex list-none flex-wrap justify-center gap-3 p-0">
            {c.values.map((v, i) => (
              <li key={i} className="rounded-full border border-gold/50 bg-gold/10 px-6 py-3 text-lg text-gold-light">{isArabic ? v.ar : v.en}</li>
            ))}
          </ul>
        </div>
      </section>
      <Structure isArabic={isArabic} t={t} tone="dark" />
    </div>
  );
}

/* ───────── Design 5: rosewell — title band, then one row per section with an image beside it ───────── */
function Row({ id, index, image, children }: { id?: string; index: number; image: string; children: React.ReactNode }) {
  const flip = index % 2 === 1;
  return (
    <section id={id} className={`scroll-mt-24 py-14 lg:py-20 ${flip ? "bg-mist" : "bg-white"}`}>
      <div className={`${wrap} grid items-center gap-10 lg:grid-cols-2 lg:gap-16`}>
        <div className={flip ? "lg:order-2" : ""}>{children}</div>
        {image && (
          <div className={`relative ${flip ? "lg:order-1" : ""}`}>
            <div aria-hidden className={`absolute -bottom-3 h-full w-full border-2 border-gold/70 ${flip ? "-start-3" : "-end-3"}`} />
            <img src={image} alt="" loading="lazy" className="relative aspect-[4/3] w-full object-cover shadow-lg" />
          </div>
        )}
      </div>
    </section>
  );
}

function RowTitle({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <>
      {eyebrow && <span className="mb-3 block text-sm font-semibold text-gold">{eyebrow}</span>}
      <h2 className="text-3xl font-bold leading-tight text-navy lg:text-4xl">{children}</h2>
      <span className="mt-4 mb-6 block h-1 w-14 bg-gold" aria-hidden />
    </>
  );
}

function RosewellStyle({ c, isArabic, t }: P) {
  const [vision, mission] = vm(c, t);
  const paragraphs = t(c.introAr, c.introEn).split(/\n{2,}|\n/).filter(Boolean);
  return (
    <>
      <section className="dark bg-navy-deep py-14 text-white lg:py-20">
        <div className={wrap}>
          <h1 className="text-4xl font-bold md:text-5xl">{t("من نحن", "About us")}</h1>
          <p className="mt-3 text-lg text-gold-light">{t("دار نظم", "DarNozom")}</p>
        </div>
      </section>

      <Row index={0} image={c.imageUrl}>
        <RowTitle>{t(c.titleAr, c.titleEn)}</RowTitle>
        <div className="space-y-4 leading-8 text-ink-muted">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
      </Row>

      <Row id="vision" index={1} image={c.visionImageUrl}>
        <RowTitle eyebrow="01">{vision.title}</RowTitle>
        <p className="leading-8 text-ink-muted">{vision.body}</p>
      </Row>

      <Row id="mission" index={2} image={c.missionImageUrl}>
        <RowTitle eyebrow="02">{mission.title}</RowTitle>
        <p className="leading-8 text-ink-muted">{mission.body}</p>
      </Row>

      <Row id="method" index={3} image={c.approachImageUrl}>
        <RowTitle eyebrow="03">{t("منهجنا", "Our Approach")}</RowTitle>
        <p className="mb-6 leading-8 text-ink-muted">{t(c.approachIntroAr, c.approachIntroEn)}</p>
        <ol className="m-0 list-none space-y-4 p-0">
          {c.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white" dir="ltr">{num(i)}</span>
              <div><h3 className="font-bold text-navy">{isArabic ? s.ar : s.en}</h3><p className="text-sm leading-7 text-ink-muted">{isArabic ? s.descAr : s.descEn}</p></div>
            </li>
          ))}
        </ol>
      </Row>

      <Row id="values" index={4} image={c.valuesImageUrl}>
        <RowTitle eyebrow="04">{t("قيمنا", "Our Values")}</RowTitle>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {c.values.map((v, i) => (
            <li key={i} className="flex items-center gap-3 border-s-4 border-gold bg-white px-4 py-3 font-semibold text-navy shadow-sm">{isArabic ? v.ar : v.en}</li>
          ))}
        </ul>
      </Row>

      <Row id="structure" index={5} image={c.structureImageUrl}>
        <RowTitle eyebrow="05">{t("هيكل المؤسسة", "Institutional Structure")}</RowTitle>
        <p className="mb-6 leading-8 text-ink-muted">{t("أذرع متكاملة في مؤسسة واحدة", "Complementary functions within one institution")}</p>
        <ul className="m-0 list-none divide-y divide-line border-y border-line p-0">
          {STRUCTURE.map((item) => (
            <li key={item.en}>
              <Link href={item.href} className="group flex items-center justify-between gap-3 py-4 font-bold text-navy hover:text-gold">
                {isArabic ? item.ar : item.en}
                <ArrowLeft className={`h-4 w-4 shrink-0 transition-transform ${isArabic ? "group-hover:-translate-x-1" : "rotate-180 group-hover:translate-x-1"}`} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Row>

      <section className="bg-navy py-14 text-center text-white">
        <div className={wrap}>
          <img src={`${import.meta.env.BASE_URL}darnozom-n-logo-navy.png`} alt="" className="mx-auto h-14 w-auto brightness-0 invert" />
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">{t("نبني معًا مؤسسات فاعلة وسياسات رشيدة.", "Together we build effective institutions and sound policy.")}</p>
          <Link href="/contact" className="mt-6 inline-flex min-h-12 items-center bg-gold-light px-8 font-bold text-ink hover:bg-gold">{t("تواصل معنا", "Contact us")}</Link>
        </div>
      </section>
    </>
  );
}

export function AboutDesignBody({ design, ...p }: P & { design: AboutDesign }) {
  switch (design) {
    case "split": return <Split {...p} />;
    case "editorial": return <Editorial {...p} />;
    case "immersive": return <Immersive {...p} />;
    case "rosewell": return <RosewellStyle {...p} />;
    default: return <Classic {...p} />;
  }
}
