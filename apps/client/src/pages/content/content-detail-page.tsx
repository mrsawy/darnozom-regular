import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { ExternalLink, Share2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { NotFoundError, useCmsItem } from "@/lib/cms-api";
import { SECTIONS, type SectionKey } from "@/lib/cms-sections";
import { useAreas } from "@/lib/cms-areas";
import { formatDate, pickLang, typeBadge } from "@/lib/cms-labels";
import { PageShell } from "@/components/content/page-shell";
import { CategoryBadge } from "@/components/content/category-badge";
import { ContentCard } from "@/components/content/content-card";
import { RichHtml } from "@/components/content/rich-html";
import { NewsletterBlock } from "@/components/content/newsletter-block";
import { EventFacts, RegionTag, TypeBlocks } from "@/components/content/detail-blocks";
import { FetchError } from "@/components/fetch-error";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";

export default function ContentDetailPage({ section, slug }: { section: SectionKey; slug: string }) {
  const { language: lang, isArabic } = useLanguage();
  const preview = new URLSearchParams(useSearch()).get("preview") === "1";
  const cfg = SECTIONS[section];
  const q = useCmsItem(slug, preview);
  const { labelFor } = useAreas();
  const item = q.data?.item;
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  useEffect(() => {
    if (item) document.title = `${pickLang(item, "title", lang)} | ${t("دار نظم", "DarNozom")}`;
  }, [item, lang]);

  if (q.error instanceof NotFoundError || (item && !cfg.types.includes(item.type))) return <NotFound />;

  const share = async () => {
    const url = window.location.href.replace(/[?&]preview=1/, "");
    if (navigator.share) await navigator.share({ url, title: item ? pickLang(item, "title", lang) : "" }).catch(() => {});
    else await navigator.clipboard?.writeText(url);
  };

  return (
    <PageShell footerTone="light">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 py-8 lg:py-12">
        {preview && item && item.status !== "published" && (
          <p role="status" className="mb-4 bg-mist border border-line px-4 py-2 text-sm text-navy">{t("معاينة — هذه المادة غير منشورة", "Preview — this item is not published")}</p>
        )}
        <nav aria-label={t("مسار التصفح", "Breadcrumb")} className="text-sm text-ink-muted mb-6">
          <Link href="/" className="hover:text-navy">{t("الرئيسية", "Home")}</Link>
          <span className="mx-2" aria-hidden>/</span>
          <Link href={cfg.path} className="hover:text-navy">{t(cfg.titleAr, cfg.titleEn)}</Link>
        </nav>

        {q.isLoading && <div className="space-y-4"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-64 w-full" /></div>}
        {q.isError && !(q.error instanceof NotFoundError) && <FetchError onRetry={() => q.refetch()} className="py-16" />}

        {item && (
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            <article>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <CategoryBadge>{typeBadge(item.type, item.details, lang)}</CategoryBadge>
                <CategoryBadge tone="outline">{item.isExternal ? t("مرجع من جهة أخرى", "External reference") : t("إصدار دار نظم", "DarNozom publication")}</CategoryBadge>
                {item.area && <span className="text-sm text-ink-muted">{labelFor(item.area, lang)}</span>}
                <RegionTag item={item} lang={lang} />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-navy leading-tight">{pickLang(item, "title", lang)}</h1>
              <p className="mt-3 text-sm text-ink-muted">
                {[pickLang(item, "author", lang), formatDate(item.publishedAt, lang)].filter(Boolean).join(" · ")}
              </p>
              {pickLang(item, "summary", lang) && <p className="mt-5 text-lg text-ink">{pickLang(item, "summary", lang)}</p>}
              {item.coverImageUrl && <img src={item.coverImageUrl} alt="" className="mt-6 w-full max-h-[460px] object-cover rounded-[4px]" />}
              {lang === "en" && !item.bodyEn && item.bodyAr && (
                <p className="mt-6 text-sm bg-mist px-4 py-2 text-navy">This item has not been translated yet. The Arabic original is shown below.</p>
              )}
              <div className="mt-8"><RichHtml html={pickLang(item, "body", lang)} /></div>
              <TypeBlocks item={item} lang={lang} />
              {item.isExternal && item.externalUrl && (
                <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 text-navy underline">
                  {t("عرض المصدر الأصلي", "View original source")} <ExternalLink className="w-4 h-4" aria-hidden />
                </a>
              )}
              <button type="button" onClick={share} className="mt-8 flex items-center gap-2 min-h-11 text-sm font-semibold text-navy">
                <Share2 className="w-4 h-4" aria-hidden /> {t("شارك هذا الإصدار", "Share this publication")}
              </button>
            </article>
            <aside className="space-y-6">
              <EventFacts item={item} lang={lang} />
              {q.data!.related.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-navy mb-3">{t("مواد ذات صلة", "Related items")}</h2>
                  <div className="space-y-3">{q.data!.related.map((r) => <ContentCard key={r.id} item={r} variant="compact" />)}</div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
      {item && !item.isExternal && (
        <>
          <p className="mx-auto max-w-[1200px] px-5 lg:px-6 text-xl font-bold text-navy">{t("تابع إصدارات دار نظم", "Follow DarNozom publications")}</p>
          <NewsletterBlock />
        </>
      )}
    </PageShell>
  );
}
