import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { RESEARCH_UNITS } from "@/lib/research-units";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { ExploreCard } from "@/components/explore-card";

export default function ResearchCenter() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const exploreLinks = [
    {
      href: "/articles",
      ar: { title: "مقالات", desc: "محتوى مرتبط بمجالات دار نظم." },
      en: { title: "Articles", desc: "Content linked to DarNozom fields." },
    },
    {
      href: "/studies",
      ar: { title: "دراسات", desc: "محتوى مرتبط بمجالات دار نظم." },
      en: { title: "Studies", desc: "Content linked to DarNozom fields." },
    },
    {
      href: "/observatory",
      ar: { title: "المرصد", desc: "محتوى مرتبط بمجالات دار نظم." },
      en: { title: "Observatory", desc: "Content linked to DarNozom fields." },
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "البحوث والدراسات" : "Research and Studies"}
        title={<><span className="block text-base font-semibold text-muted-foreground mb-2">{isAr ? "البحوث والدراسات" : "Research and Studies"}</span>{isAr ? "مركز دار نظم للبحوث والدراسات" : "DarNozom Research and Studies Center"}</>}
        subtitle={isAr
          ? "مركز دار نظم للبحوث والدراسات هو الذراع العلمي والفكري للمؤسسة؛ يصل التأصيل الشرعي بالتحليل العلمي والخبرة التطبيقية."
          : "The DarNozom Research and Studies Center is the institution's scholarly and intellectual function, connecting Sharia grounding with scientific analysis and practical expertise."}
      />

      {/* Research Units */}
      <section className="py-24 bg-white border-b border-border">
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

      {/* Research Projects */}
      <section className="py-24 bg-background border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-10">
            {isAr ? "المشروعات البحثية" : "Research Projects"}
          </h2>
          <Link
            href="/case-studies"
            className="group block bg-white border border-border hover:border-secondary/60 transition-colors p-10"
          >
            <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
              {isAr ? "مشروع حالي" : "Current Project"}
            </div>
            <h3 className="text-2xl font-bold text-primary mb-3">
              {isAr
                ? "نحو تأسيس علم السياسة الشرعية المعاصرة"
                : "Towards Establishing Contemporary Sharia Governance as a Discipline"}
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {isAr
                ? "دراسة في المفهوم والموضوع والحدود والبنية العلمية والمنهج."
                : "A study of the concept, subject, boundaries, scholarly structure and methodology."}
            </p>
            <span className="inline-flex items-center gap-2 text-sm text-secondary font-bold">
              {isAr ? "اكتشف المزيد" : "Explore more"}
              <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
            </span>
          </Link>
        </div>
      </section>

      {/* Explore Knowledge */}
      <section className="py-24 bg-[#F5F0E8] border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-10">
            {isAr ? "استكشف المعرفة" : "Explore Knowledge"}
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
