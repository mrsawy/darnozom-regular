import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { ExploreCard } from "@/components/explore-card";

export default function Library() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const publicationTypes = [
    {
      href: "/services/store/books",
      ar: { title: "كتب", desc: "الإنتاج المحدد لدار نظم في هذا القسم." },
      en: { title: "Books", desc: "DarNozom's dedicated output in this category." },
    },
    {
      href: "/articles",
      ar: { title: "مقالات", desc: "الإنتاج المحدد لدار نظم في هذا القسم." },
      en: { title: "Articles", desc: "DarNozom's dedicated output in this category." },
    },
    {
      href: "/studies",
      ar: { title: "دراسات", desc: "الإنتاج المحدد لدار نظم في هذا القسم." },
      en: { title: "Studies", desc: "DarNozom's dedicated output in this category." },
    },
    {
      href: "/studies",
      ar: { title: "دوريات", desc: "الإنتاج المحدد لدار نظم في هذا القسم." },
      en: { title: "Periodicals", desc: "DarNozom's dedicated output in this category." },
    },
    {
      href: "/studies",
      ar: { title: "أبحاث علمية", desc: "الإنتاج المحدد لدار نظم في هذا القسم." },
      en: { title: "Academic Research", desc: "DarNozom's dedicated output in this category." },
    },
    {
      href: "/observatory",
      ar: { title: "المرصد", desc: "الإنتاج المحدد لدار نظم في هذا القسم." },
      en: { title: "Observatory", desc: "DarNozom's dedicated output in this category." },
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "المكتبة والإصدارات" : "Library and Publications"}
        title={isAr ? "المكتبة والإصدارات" : "Library and Publications"}
        subtitle={isAr
          ? "المكتبة للكتب والمراجع؛ وإصدارات دار نظم لإنتاج المؤسسة البحثي والمعرفي."
          : "The library for books and references; and DarNozom publications for the institution's research and knowledge output."}
      />

      {/* Library */}
      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              {isAr ? "المكتبة" : "The Library"}
            </h2>
            <Link
              href="/services/store/books"
              className="inline-flex items-center gap-2 text-sm text-secondary font-bold hover:underline"
            >
              {isAr ? "تصفح المكتبة" : "Browse the library"}
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <ExploreCard
              href="/services/store/books"
              title={isAr ? "جميع الكتب" : "All Books"}
              desc={isAr
                ? "الكتب المتاحة من دار نظم والناشرين الآخرين، بحسب النسخ الورقية والرقمية المتاحة."
                : "Books available from DarNozom and other publishers, by available print and digital edition."}
            />
            <ExploreCard
              href="/services/store/books"
              title={isAr ? "كتب دار نظم" : "DarNozom Books"}
              desc={isAr
                ? "الكتب التي دار نظم قد نشرتها مع النسخ الورقية والرقمية المتاحة."
                : "Books DarNozom has published, with available print and digital editions."}
            />
          </div>
        </div>
      </section>

      {/* DarNozom Publications */}
      <section className="py-24 bg-[#F5F0E8] border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              {isAr ? "إصدارات دار نظم" : "DarNozom Publications"}
            </h2>
            <Link
              href="/studies"
              className="inline-flex items-center gap-2 text-sm text-secondary font-bold hover:underline"
            >
              {isAr ? "جميع إصدارات دار نظم" : "All DarNozom publications"}
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicationTypes.map((p) => (
              <ExploreCard
                key={`${p.href}-${isAr ? p.ar.title : p.en.title}`}
                href={p.href}
                title={isAr ? p.ar.title : p.en.title}
                desc={isAr ? p.ar.desc : p.en.desc}
                bgWhite
              />
            ))}
          </div>
        </div>
      </section>

      {/* Explore Topics */}
      <section className="py-24 bg-background border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {isAr ? "استكشف الموضوعات" : "Explore Topics"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-8">
            {isAr
              ? "اعثر على المعرفة والبرامج والخدمات المرتبطة باهتماماتك."
              : "Find knowledge, programmes and services connected to your interests."}
          </p>
          <Link
            href="/sectors"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            {isAr ? "تصفح الموضوعات" : "Browse topics"}
            <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
