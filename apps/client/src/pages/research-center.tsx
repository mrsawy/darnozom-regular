import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { RESEARCH_UNITS } from "@/lib/research-units";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { ExploreCard } from "@/components/explore-card";

export default function ResearchCenter() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const desc = { ar: "محتوى مرتبط بمجالات دار نظم.", en: "Content linked to DarNozom fields." };
  // Same order as the "Publications" menu.
  const exploreLinks = [
    { href: "/publications?tab=books", ar: { title: "كتب", desc: desc.ar }, en: { title: "Books", desc: desc.en } },
    { href: "/articles", ar: { title: "مقالات", desc: desc.ar }, en: { title: "Articles", desc: desc.en } },
    { href: "/studies", ar: { title: "الدراسات والأبحاث", desc: desc.ar }, en: { title: "Studies and Research", desc: desc.en } },
    { href: "/observatory", ar: { title: "المرصد", desc: desc.ar }, en: { title: "Observatory", desc: desc.en } },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "البحوث والدراسات" : "Research and Studies"}
        title={<><span className="hidden text-base font-semibold text-muted-foreground mb-2">{isAr ? "البحوث والدراسات" : "Research and Studies"}</span>{isAr ? "مركز دار نظم للبحوث والدراسات" : "DarNozom Research and Studies Center"}</>}
        subtitle={isAr
          ? "مركز دار نظم للبحوث والدراسات هو الذراع العلمي والفكري للمؤسسة؛ يصل التأصيل الشرعي بالتحليل العلمي والخبرة التطبيقية."
          : "The DarNozom Research and Studies Center is the institution's scholarly and intellectual function, connecting Sharia grounding with scientific analysis and practical expertise."}
      />

      {/* Research Units */}
      <section className="py-14 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-12">
            {isAr ? "الوحدات البحثية" : "Research Units"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESEARCH_UNITS.map((u) => (
              <ExploreCard
                key={u.id}
                href={`/unit/${u.id}`}
                title={isAr ? u.name.ar : u.name.en}
                desc={isAr ? u.desc.ar : u.desc.en}
                testId={`research-unit-${u.id}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Explore Knowledge */}
      <section className="py-14 bg-[#F5F0E8] border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-10">
            {isAr ? "استكشف إصدارات دار نظم" : "Explore DarNozom Publications"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreLinks.map((c) => (
              <ExploreCard
                key={c.href}
                href={c.href}
                title={isAr ? c.ar.title : c.en.title}
                desc={isAr ? c.ar.desc : c.en.desc}
                bgWhite
              />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
