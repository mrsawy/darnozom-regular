import { Link } from "wouter";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language-context";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { NewsletterBlock } from "@/components/content/newsletter-block";

const TOPICS = [
  {
    id: "governance",
    ar: { name: "الحوكمة والتطوير المؤسسي", desc: "معرفة وبرامج وخدمات تربط الحوكمة والقيادة ببناء المؤسسات وتطويرها." },
    en: { name: "Governance and Institutional Development", desc: "Knowledge, programmes and services connecting governance and leadership with institution building and development." },
  },
  {
    id: "public-policy",
    ar: { name: "السياسات والإدارة العامة", desc: "مواد ومسارات وخدمات تتصل بتحليل السياسات وإدارة المؤسسات والخدمات العامة." },
    en: { name: "Public Policy & Public Administration", desc: "Resources, learning tracks and services on policy analysis and public institutions and service management." },
  },
  {
    id: "sharia",
    ar: { name: "السياسة الشرعية والفكر الإسلامي", desc: "معرفة وبحوث وبرامج تصل المرجعية الإسلامية بقضايا الشأن العام." },
    en: { name: "Sharia Governance and Islamic Thought", desc: "Knowledge, research and programmes connecting Islamic foundations with public affairs." },
  },
];

const COPY = {
  ar: {
    current: "الموضوعات",
    title: "استكشف الموضوعات",
    subtitle: "تصفح المعرفة والبرامج والخدمات المرتبطة بالموضوع الذي يهمك.",
    sectionTitle: "موضوعات دار نظم",
    explore: "استكشف",
  },
  en: {
    current: "Topics",
    title: "Explore Topics",
    subtitle: "Browse knowledge, programmes and services connected to your topic of interest.",
    sectionTitle: "DarNozom Topics",
    explore: "Explore",
  },
} as const;

export default function TopicsPage() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={t.current}
        title={t.title}
        subtitle={t.subtitle}
      />

      <main className="flex-1 py-16">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl font-bold text-primary mb-10 text-center">{t.sectionTitle}</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {TOPICS.map((topic) => {
              const label = isArabic ? topic.ar.name : topic.en.name;
              const desc = isArabic ? topic.ar.desc : topic.en.desc;
              return (
                <Link
                  key={topic.id}
                  href={`/topic/${topic.id}`}
                  className="block border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <h3 className="font-bold text-primary text-lg mb-3 group-hover:text-secondary transition-colors">
                    {label}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">{desc}</p>
                  <span className="text-sm font-bold text-secondary inline-flex items-center gap-1">
                    {t.explore} {isArabic ? "←" : "→"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <NewsletterBlock />

      <SiteFooter />
    </div>
  );
}
