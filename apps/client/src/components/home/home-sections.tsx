import { useLanguage } from "@/lib/language-context";
import { HOME_MAX_W, HOME_MT, HOME_PX } from "@/lib/site-constants";
import type { ContentItem } from "@/lib/cms-types";
import { ContentCard } from "@/components/content/content-card";
import { SectionHeader } from "@/components/content/section-header";

function Block({ title, subtitle, href, items, cols, variant, imageEnd, type }: {
  type: string; title: string; subtitle: string; href: string; items: ContentItem[]; cols: string; variant: "vertical" | "horizontal"; imageEnd?: boolean;
}) {
  const { isArabic } = useLanguage();
  if (items.length === 0) return null;
  return (
    <section className={`mx-auto ${HOME_MAX_W} ${HOME_PX} ${HOME_MT}`}>
      <SectionHeader title={title} subtitle={subtitle} href={href} linkLabel={isArabic ? "عرض الكل" : "View all"} editHref={`/admin/content/${type}`} addHref={`/admin/content/${type}/new`} />
      <div className={`grid gap-5 ${cols}`}>{items.map((i) => <ContentCard key={i.id} item={i} variant={variant} bare imageEnd={imageEnd} />)}</div>
    </section>
  );
}

export function ArticlesSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block type="article" title={ar ? "المقالات" : "Articles"} subtitle={ar ? "أفكار وتحليلات معمقة في قضايا السياسات والمؤسسات" : "In-depth ideas and analysis on policy and institutions"} href="/articles" items={items} cols="sm:grid-cols-2 lg:grid-cols-3" variant="vertical" />;
}

export function StudiesSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block type="study" title={ar ? "الدراسات والأبحاث" : "Studies and Research"} subtitle={ar ? "دراسات وأبحاث متخصصة تسهم في فهم الواقع واستشراف المستقبل" : "Specialised studies and research to understand the present and anticipate the future"} href="/studies" items={items} cols="sm:grid-cols-2" variant="vertical" />;
}

export function NewsEventsSection({ items }: { items: ContentItem[] }) {
  const { isArabic: ar } = useLanguage();
  return <Block type="news" title={ar ? "الأخبار والفعاليات" : "News and Events"} subtitle={ar ? "آخر المستجدات والفعاليات والبرامج" : "The latest news, events and programs"} href="/news-events" items={items} cols="sm:grid-cols-2 lg:grid-cols-3" variant="vertical" />;
}
