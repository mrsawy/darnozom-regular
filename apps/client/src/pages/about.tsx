import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Compass, Target } from "lucide-react";
import { HOME_MAX_W, HOME_PX } from "@/lib/site-constants";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { useAboutContent } from "@/lib/cms-api";
import { DEFAULT_ABOUT } from "@/lib/about-content";

const STRUCTURE = [
  { ar: "مركز دار نظم للبحوث والدراسات", en: "DarNozom Research and Studies Center", href: "/center" },
  { ar: "أكاديمية دار نظم", en: "DarNozom Academy", href: "/academy" },
  { ar: "الاستشارات", en: "Consulting", href: "/services/consulting" },
  { ar: "نظم بلاتفورم", en: "Nozom Platform", href: "/services/digital-transformation" },
];

export default function About() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const c = useAboutContent().data ?? DEFAULT_ABOUT;
  const wrap = `mx-auto ${HOME_MAX_W} ${HOME_PX}`;
  const num = (i: number) => String(i + 1).padStart(2, "0");

  useEffect(() => {
    document.title = isArabic ? "من نحن — دار نظم" : "About — DarNozom";
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [isArabic]);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {/* Hero: image first, text over it */}
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
          <p className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-white/80 md:text-lg">
            {t(c.introAr, c.introEn)}
          </p>
        </div>
      </section>

      {/* Vision & Mission, pulled up over the hero */}
      <section className="relative z-10 -mt-16 pb-20 lg:-mt-20">
        <div className={`${wrap} grid gap-6 md:grid-cols-2`}>
          {[
            { id: "vision", icon: Compass, title: t("رؤيتنا", "Our Vision"), body: t(c.visionAr, c.visionEn) },
            { id: "mission", icon: Target, title: t("رسالتنا", "Our Mission"), body: t(c.missionAr, c.missionEn) },
          ].map(({ id, icon: Icon, title, body }) => (
            <article key={id} id={id} className="scroll-mt-28 rounded-lg border border-line border-t-4 border-t-gold bg-white p-8 shadow-xl shadow-navy/10 lg:p-10">
              <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-mist text-navy">
                <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
              </span>
              <h2 className="mb-4 text-2xl font-bold text-navy">{title}</h2>
              <p className="leading-8 text-ink-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Approach */}
      <section id="method" className="scroll-mt-24 bg-mist py-20">
        <div className={wrap}>
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-3xl font-bold text-navy">{t("منهجنا", "Our Approach")}</h2>
              <span className="mt-4 block h-1 w-14 bg-gold" aria-hidden />
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

      {/* Values */}
      <section id="values" className="dark scroll-mt-24 bg-[#183650] py-20 text-white">
        <div className={wrap}>
          <h2 className="text-3xl font-bold">{t("قيمنا", "Our Values")}</h2>
          <span className="mt-4 block h-1 w-14 bg-gold" aria-hidden />
          <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-px overflow-hidden rounded-lg bg-white/15 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {c.values.map((v, i) => (
              <li key={i} className="flex items-center gap-4 bg-[#183650] p-6 text-lg">
                <span className="text-sm text-gold" dir="ltr">{num(i)}</span>
                {isArabic ? v.ar : v.en}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Institutional Structure */}
      <section id="structure" className="scroll-mt-24 bg-white py-20">
        <div className={wrap}>
          <h2 className="text-3xl font-bold text-navy">{t("هيكل المؤسسة", "Institutional Structure")}</h2>
          <span className="mt-4 block h-1 w-14 bg-gold" aria-hidden />
          <p className="mt-6 max-w-2xl text-ink-muted">
            {t("أذرع متكاملة في مؤسسة واحدة", "Complementary functions within one institution")}
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STRUCTURE.map((item, i) => (
              <Link
                key={item.en}
                href={item.href}
                className="group flex flex-col rounded-lg border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-gold hover:shadow-lg"
              >
                <span className="mb-6 text-sm text-gold" dir="ltr">{num(i)}</span>
                <h3 className="mb-3 text-lg font-bold text-navy">{isArabic ? item.ar : item.en}</h3>
                <p className="text-sm leading-7 text-ink-muted">
                  {t("منهج وهوية مشتركة ومخرجات متخصصة.", "A shared approach and identity, with specialized outputs.")}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-navy">
                  {t("اكتشف المزيد", "Explore more")}
                  <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${isArabic ? "" : "rotate-180 group-hover:translate-x-1"}`} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
