import { useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCmsHome } from "@/lib/cms-api";
import { PageShell } from "@/components/content/page-shell";
import { NewsletterBlock } from "@/components/content/newsletter-block";
import { FeaturedShowcase } from "@/components/home/featured-showcase";
import { AboutSection } from "@/components/home/about-section";
import { ObservatorySection } from "@/components/home/observatory-section";
import { PublicationsRow } from "@/components/home/publications-row";
import { ArticlesSection, NewsEventsSection, StudiesSection } from "@/components/home/home-sections";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { isArabic } = useLanguage();
  const home = useCmsHome();
  const d = home.data;

  useEffect(() => {
    document.title = isArabic ? "دار نظم — للبحوث والاستشارات والتدريب" : "DarNozom — Research, Consulting and Training";
  }, [isArabic]);

  return (
    <PageShell footerTone="light">
      {home.isLoading && (
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" />
        </div>
      )}
      {d && <FeaturedShowcase cards={d.featured} />}
      <AboutSection />
      {d && (
        <>
          <ObservatorySection lead={d.observatory.lead} others={d.observatory.others} />
          <ArticlesSection items={d.articles} />
          <StudiesSection items={d.studies} />
          <PublicationsRow items={d.publications} />
          <NewsEventsSection items={d.newsEvents} />
        </>
      )}
      <NewsletterBlock />
    </PageShell>
  );
}
