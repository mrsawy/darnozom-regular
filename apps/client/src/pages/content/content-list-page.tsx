import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { useCmsList } from "@/lib/cms-api";
import { SECTIONS, type SectionKey } from "@/lib/cms-sections";
import { useAreas, areaLabel } from "@/lib/cms-areas";
import { PUBLICATION_KINDS, REGION_LABELS } from "@/lib/cms-labels";
import { useDarNozomBooks } from "@/lib/darnozom-books";
import { DARNOZOM_PUBLISHER } from "@/lib/site-constants";
import { PageShell } from "@/components/content/page-shell";
import { ContentCard } from "@/components/content/content-card";
import { CategoryBadge } from "@/components/content/category-badge";
import { SectionHeader } from "@/components/content/section-header";
import { FetchError } from "@/components/fetch-error";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 12;
const selectCls = "min-h-11 px-3 rounded-[4px] border border-line bg-white text-ink";

export default function ContentListPage({ section }: { section: SectionKey }) {
  const cfg = SECTIONS[section];
  const { language: lang, isArabic } = useLanguage();
  const { active: activeAreas } = useAreas();
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const tab = cfg.tabs?.find((x) => x.value === params.get("tab")) ?? cfg.tabs?.[0];
  const area = params.get("area") ?? "";
  const region = params.get("region") ?? "";
  const when = (params.get("when") ?? tab?.defaultWhen ?? "") as "upcoming" | "past" | "";
  const kind = params.get("kind") ?? tab?.kind ?? "";
  const q = params.get("q") ?? "";
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1);
  const [draftQ, setDraftQ] = useState(q);
  useEffect(() => setDraftQ(q), [q]);

  useEffect(() => {
    document.title = `${t(cfg.titleAr, cfg.titleEn)} | ${t("دار نظم", "DarNozom")}`;
  }, [lang, cfg]);

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(search);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    const qs = next.toString();
    navigate(`${cfg.path}${qs ? `?${qs}` : ""}`);
  };

  const booksTab = tab?.books === true;
  const list = useCmsList(
    { types: tab?.types ?? cfg.types, area, region, when: cfg.filters.includes("when") ? when : "", kind, q, page, pageSize: PAGE_SIZE },
    { enabled: !booksTab },
  );
  const books = useDarNozomBooks(24, { enabled: booksTab });
  const totalPages = list.data ? Math.max(Math.ceil(list.data.total / PAGE_SIZE), 1) : 1;

  return (
    <PageShell footerTone="light">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 py-10 lg:py-14">
        <SectionHeader as="h1" title={t(cfg.titleAr, cfg.titleEn)} subtitle={t(cfg.introAr, cfg.introEn)} />

        {cfg.tabs && (
          <div role="tablist" aria-label={t("الأقسام", "Sections")} className="flex flex-wrap gap-2 mb-5 border-b border-line">
            {cfg.tabs.map((x) => (
              <button
                key={x.value} role="tab" type="button" aria-selected={x.value === tab?.value}
                onClick={() => setParams({ tab: x.value, kind: "", when: "" })}
                className={`min-h-11 px-4 -mb-px border-b-2 font-semibold ${x.value === tab?.value ? "border-gold text-navy" : "border-transparent text-ink-muted hover:text-navy"}`}
              >
                {t(x.labelAr, x.labelEn)}
              </button>
            ))}
          </div>
        )}

        {!booksTab && (
          <form
            className="flex flex-wrap gap-3 mb-8"
            onSubmit={(e) => { e.preventDefault(); setParams({ q: draftQ.trim() }); }}
            role="search"
          >
            <input
              value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder={t("ابحث في هذا القسم", "Search this section")}
              aria-label={t("كلمة البحث", "Search term")} className={`${selectCls} flex-1 min-w-[200px]`}
            />
            {cfg.filters.includes("area") && (
              <select aria-label={t("المجال", "Field")} value={area} onChange={(e) => setParams({ area: e.target.value })} className={selectCls}>
                <option value="">{t("كل المجالات", "All fields")}</option>
                {activeAreas.map((a) => <option key={a.slug} value={a.slug}>{areaLabel(a, lang)}</option>)}
              </select>
            )}
            {cfg.filters.includes("region") && (
              <select aria-label={t("النطاق الجغرافي", "Region")} value={region} onChange={(e) => setParams({ region: e.target.value })} className={selectCls}>
                <option value="">{t("كل النطاقات", "All regions")}</option>
                {Object.entries(REGION_LABELS).map(([v, l]) => <option key={v} value={v}>{l[lang]}</option>)}
              </select>
            )}
            {cfg.filters.includes("when") && tab?.defaultWhen && (
              <select aria-label={t("الموعد", "When")} value={when} onChange={(e) => setParams({ when: e.target.value })} className={selectCls}>
                <option value="upcoming">{t("القادمة", "Upcoming")}</option>
                <option value="past">{t("السابقة", "Past")}</option>
              </select>
            )}
            {tab?.subKinds && (
              <select aria-label={t("نوع الفعالية", "Event type")} value={kind} onChange={(e) => setParams({ kind: e.target.value })} className={selectCls}>
                <option value="">{t("كل الأنواع", "All types")}</option>
                {Object.entries(tab.subKinds).map(([v, l]) => <option key={v} value={v}>{l[lang]}</option>)}
              </select>
            )}
            <button type="submit" className="min-h-11 px-5 rounded-[4px] bg-navy text-white font-semibold">{t("بحث", "Search")}</button>
          </form>
        )}

        {booksTab ? (
          <BooksGrid books={books.data ?? []} loading={books.isLoading} failed={books.isError} isArabic={isArabic} />
        ) : list.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>
        ) : list.isError ? (
          <FetchError onRetry={() => list.refetch()} className="py-16" />
        ) : list.data!.items.length === 0 ? (
          <p className="py-16 text-center text-ink-muted">
            {q || area || region || kind ? t("لا توجد نتائج مطابقة. جرّب تعديل البحث أو المرشحات.", "No matching results. Try changing the search or filters.") : t("لا توجد مواد منشورة بعد في هذا القسم.", "Nothing has been published in this section yet.")}
          </p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.data!.items.map((item) => <ContentCard key={item.id} item={item} />)}
            </div>
            {totalPages > 1 && (
              <nav aria-label={t("الصفحات", "Pagination")} className="flex items-center justify-center gap-4 mt-10">
                <button type="button" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })} className="min-h-11 px-4 border border-line rounded-[4px] disabled:opacity-40">{t("السابق", "Previous")}</button>
                <span className="text-ink-muted">{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })} className="min-h-11 px-4 border border-line rounded-[4px] disabled:opacity-40">{t("التالي", "Next")}</button>
              </nav>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}

function BooksGrid({ books, loading, failed, isArabic }: { books: { id: string; title: string; imageUrl: string; href: string }[]; loading: boolean; failed: boolean; isArabic: boolean }) {
  const storeHref = `/services/store/books?publisher=${encodeURIComponent(DARNOZOM_PUBLISHER)}`;
  if (loading) return <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>;
  if (failed || books.length === 0) {
    return (
      <p className="py-16 text-center text-ink-muted">
        {isArabic ? "تصفح كتب دار نظم في " : "Browse DarNozom books in the "}
        <Link href={storeHref} className="text-navy underline">{isArabic ? "متجر الكتب" : "book store"}</Link>.
      </p>
    );
  }
  return (
    <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
      {books.map((b) => (
        <Link key={b.id} href={b.href} className="bg-white border border-line rounded-[4px] p-3 hover:shadow-md">
          {b.imageUrl && <img src={b.imageUrl} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover" />}
          <CategoryBadge>{PUBLICATION_KINDS.book[isArabic ? "ar" : "en"]}</CategoryBadge>
          <p className="mt-2 font-bold text-navy line-clamp-2">{b.title}</p>
        </Link>
      ))}
    </div>
  );
}
