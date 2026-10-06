import { useEffect, type ReactNode } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCmsHome } from "@/lib/cms-api";
import { mergePublications, useDarNozomBooks } from "@/lib/darnozom-books";
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
  const books = useDarNozomBooks(4);
  const d = home.data;

  useEffect(() => {
    document.title = isArabic ? "دار نظم — للبحوث والاستشارات والتدريب" : "DarNozom — Research, Consulting and Training";
  }, [isArabic]);

  // Sections that render nothing are left out so the background stripes keep alternating.
  const sections: ReactNode[] = [];
  if (d?.featured.length) sections.push(<FeaturedShowcase cards={d.featured} />);
  sections.push(<AboutSection />);
  if (d) {
    if (d.observatory.lead) sections.push(<ObservatorySection lead={d.observatory.lead} others={d.observatory.others} />);
    if (d.articles.length) sections.push(<ArticlesSection items={d.articles} />);
    if (d.studies.length) sections.push(<StudiesSection items={d.studies} />);
    if (mergePublications(d.publications, books.data ?? [], 4).length) sections.push(<PublicationsRow items={d.publications} />);
    if (d.newsEvents.length) sections.push(<NewsEventsSection items={d.newsEvents} />);
  }
  sections.push(<NewsletterBlock />);

  return (
    <PageShell footerTone="light">
      {home.isLoading && (
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="h-[420px]" /><Skeleton className="h-[420px]" />
        </div>
      )}
      {sections.map((section, i) => (
        <div key={i} className={`py-10 [&>section]:!my-0 ${i % 2 === 0 ? "bg-[#F8F6F1]" : "bg-white"}`}>
          {section}
        </div>
      ))}
    </PageShell>
  );
}
