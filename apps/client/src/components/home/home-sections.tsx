import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { ContentCard } from "@/components/content/content-card";
import { SectionHeader } from "@/components/content/section-header";

function Block({ title, subtitle, href, items, cols, variant }: {
  title: string; subtitle: string; href: string; items: ContentItem[]; cols: string; variant: "vertical" | "horizontal";
}) {
  const { isArabic } = useLanguage();
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-6 mt-14">
      <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={isArabic ? "عرض الكل" : "View all"} />
      <div className={`grid gap-5 ${cols}`}>{items.map((i) => <ContentCard key={i.id} item={i} variant={variant} />)}</div>
    </section>
  );
}

export function ArticlesSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block title={ar ? "المقالات" : "Articles"} subtitle={ar ? "أفكار وتحليلات معمقة في قضايا السياسات والمؤسسات" : "In-depth ideas and analysis on policy and institutions"} href="/articles" items={items} cols="sm:grid-cols-2 lg:grid-cols-3" variant="vertical" />;
}

export function StudiesSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block title={ar ? "الدراسات" : "Studies"} subtitle={ar ? "دراسات متخصصة تسهم في فهم الواقع واستشراف المستقبل" : "Specialised studies to understand the present and anticipate the future"} href="/studies" items={items} cols="lg:grid-cols-2" variant="horizontal" />;
}

export function NewsEventsSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block title={ar ? "الأخبار والفعاليات" : "News and Events"} subtitle={ar ? "آخر المستجدات والفعاليات والبرامج" : "The latest news, events and programs"} href="/news-events" items={items} cols="sm:grid-cols-2 lg:grid-cols-3" variant="horizontal" />;
}
