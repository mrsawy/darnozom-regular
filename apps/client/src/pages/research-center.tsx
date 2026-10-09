import { Link } from "wouter";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { RESEARCH_UNITS } from "@/lib/research-units";

export default function ResearchCenter() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(210_40%_96%)] via-[hsl(210_40%_94%)] to-[hsl(210_38%_88%)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
          <div className="flex items-center gap-3 mb-7">
            <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
              {isAr ? "المعرفة والبحوث" : "Knowledge and Research"}
            </span>
            <div className="h-px w-10 bg-primary/40" />
          </div>
          <h1
            className="font-medium text-foreground leading-[1.12] mb-6"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
          >
            {isAr ? "المعرفة والبحوث" : "Knowledge and Research"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {isAr
              ? "مركز دار نظم للبحوث والدراسات هو الذراع العلمي والفكري للمؤسسة؛ يصل التأصيل الشرعي بالتحليل العلمي والخبرة التطبيقية."
              : "The DarNozom Research and Studies Center is the institution's scholarly and intellectual function, connecting Sharia grounding with scientific analysis and practical expertise."}
          </p>
        </div>
      </section>

      {/* Research Units */}
      <section className="py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            {isAr ? "الوحدات البحثية" : "Research Units"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESEARCH_UNITS.map((u) => (
              <Link
                key={u.id}
                href={`/unit/${u.id}`}
                className="group block border border-border hover:border-secondary/60 transition-colors p-8"
                data-testid={`research-unit-${u.id}`}
              >
                <h3 className="font-bold text-lg mb-3">{isAr ? u.name.ar : u.name.en}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{isAr ? u.desc.ar : u.desc.en}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Research Projects */}
      <section className="py-24 bg-[#EAF0F6] border-y border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-10">
            {isAr ? "المشروعات البحثية" : "Research Projects"}
          </h2>
          <Link
            href="/case-studies"
            className="group block bg-white border border-border hover:border-secondary/60 transition-colors p-10"
          >
            <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
              {isAr ? "مشروع بحثي" : "Research Project"}
            </div>
            <h3 className="text-2xl font-bold mb-3">
              {isAr
                ? "نحو تأسيس علم السياسة الشرعية المعاصرة"
                : "Towards Establishing Contemporary Sharia Governance as a Discipline"}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {isAr
                ? "دراسة في المفهوم والموضوع والحدود والبنية العلمية والمنهج."
                : "A study of the concept, subject, boundaries, scholarly structure and methodology."}
            </p>
          </Link>
        </div>
      </section>

      {/* Explore Knowledge */}
      <section className="py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-10">
            {isAr ? "استكشف المعرفة" : "Explore Knowledge"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { href: "/articles", ar: "المقالات", en: "Articles" },
              { href: "/studies", ar: "الدراسات", en: "Studies" },
              { href: "/observatory", ar: "المرصد", en: "Observatory" },
            ].map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group block border border-border hover:border-secondary/60 transition-colors p-8"
              >
                <h3 className="font-bold text-lg mb-2">{isAr ? c.ar : c.en}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {isAr ? "محتوى مرتبط بمجالات دار نظم." : "Content related to DarNozom fields."}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
