import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import type { HttpTypes } from "@medusajs/types";
import { Search, BookOpen, X, ArrowRight, ArrowLeft, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import SiteNav from "@/components/site-nav";
import ProductCard, { type ProductCardItem } from "@/components/store/product-card";
import { AdminFab } from "@/components/store/admin-fab";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { getMedusaAdminUrl } from "@/lib/medusa-client";
import { listBookCategoryTree, searchStoreBooks, type BookFacets, type CategoryTreeNode } from "@/lib/book-catalog";
import { bookFiltersToQuery, EMPTY_BOOK_FILTERS, readBookFilters, type BookFilters } from "@/lib/book-filters";
import CategoryFilter from "@/components/store/category-filter";
import FacetSelect from "@/components/store/facet-select";
import { productIsFeatured } from "@/lib/product-featured";
import { getBookVariantInfo } from "@/lib/book-variants";
import { useCart } from "@/lib/cart-context";
import { SiteFooter } from "@/components/site-footer";

type StoreProduct = HttpTypes.StoreProduct;

const T = {
  ar: {
    back: "العودة للمتجر",
    eyebrow: "مكتبة دار نظم",
    title: "الكتب",
    subtitle: "إصدارات ورقية وإلكترونية — صفِّ حسب الصيغة والتصنيف من Medusa",
    searchPlaceholder: "ابحث بالعنوان أو المؤلف أو الناشر أو الموضوع أو الكلمات المفتاحية...",
    filterFormat: "الصيغة",
    filterCategory: "التصنيف",
    filterAuthor: "المؤلف",
    filterPublisher: "الناشر",
    filterLanguage: "لغة الكتاب",
    filterSection: "الأقسام العلمية",
    languages: { ar: "العربية", en: "الإنجليزية", both: "العربية والإنجليزية" },
    loadMore: "عرض المزيد",
    all: "الكل",
    paper: "ورقي",
    digital: "إلكتروني",
    empty: "لم نعثر على كتب مطابقة",
    emptyHint: "جرّب مسح الفلاتر أو كلمة بحث مختلفة",
    clearFilters: "مسح الفلاتر",
    countLabel: (n: number) => `${n} كتاب`,
    results: "النتائج",
  },
  en: {
    back: "Back to store",
    eyebrow: "Darnozom library",
    title: "Books",
    subtitle: "Paper and digital editions — filter by format and Medusa categories",
    searchPlaceholder: "Search by title, author, publisher, subject or keyword...",
    filterFormat: "Format",
    filterCategory: "Category",
    filterAuthor: "Author",
    filterPublisher: "Publisher",
    filterLanguage: "Book language",
    filterSection: "Sections",
    languages: { ar: "Arabic", en: "English", both: "Arabic & English" },
    loadMore: "Load more",
    all: "All",
    paper: "Hardcopy",
    digital: "Online",
    empty: "No matching books found",
    emptyHint: "Try clearing filters or a different search term",
    clearFilters: "Clear filters",
    countLabel: (n: number) => `${n} book${n === 1 ? "" : "s"}`,
    results: "Results",
  },
};

export default function StoreBooksPage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const searchString = useSearch();

  const cart = useCart();
  const PAGE = 24;
  const [filters, setFilters] = useState<BookFilters>(() => readBookFilters(searchString));
  const [search, setSearch] = useState(filters.q);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<BookFacets>({ authors: [], publishers: [], languages: [] });
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce typing into filters.q.
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim() })), 280);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const qs = bookFiltersToQuery(filters);
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    listBookCategoryTree()
      .then((t) => !cancelled && setTree(t))
      .catch(() => !cancelled && setTree([]));
    return () => { cancelled = true; };
  }, []);

  const params = (offset: number) => ({
    q: filters.q.length >= 2 ? filters.q : undefined,
    category_id: filters.category || undefined,
    author: filters.author || undefined,
    publisher: filters.publisher || undefined,
    language: filters.language || undefined,
    format: filters.format === "all" ? undefined : filters.format,
    limit: PAGE,
    offset,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    searchStoreBooks(params(0))
      .then((r) => {
        if (cancelled) return;
        setProducts(r.products);
        setTotal(r.total);
        setFacets(r.facets);
      })
      .catch(() => {
        if (!cancelled) { setError(true); setProducts([]); setTotal(0); }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, reloadKey]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const r = await searchStoreBooks(params(products.length));
      setProducts((prev) => [...prev, ...r.products]);
    } finally {
      setLoadingMore(false);
    }
  }

  function variantInfo(p: StoreProduct) {
    const { paperEditions, digitalEditions } = getBookVariantInfo(p);
    const hasPaper = paperEditions.length > 0;
    const hasDigital = digitalEditions.length > 0;
    const paperInStockEditions = paperEditions.filter((e) => e.inStock);
    const digitalInStockEditions = digitalEditions.filter((e) => e.inStock);
    const paperAvailable = paperInStockEditions.length > 0;
    const digitalAvailable = digitalInStockEditions.length > 0;
    const paperPrice = paperInStockEditions.length
      ? Math.min(...paperInStockEditions.map((e) => e.price))
      : paperEditions[0]
        ? Math.min(...paperEditions.map((e) => e.price))
        : 0;
    const digitalPrice = digitalInStockEditions.length
      ? Math.min(...digitalInStockEditions.map((e) => e.price))
      : digitalEditions[0]
        ? Math.min(...digitalEditions.map((e) => e.price))
        : 0;
    const allInStock = [...paperInStockEditions, ...digitalInStockEditions];
    const singleEdition = allInStock.length === 1 ? allInStock[0] : undefined;
    return {
      hasPaper,
      hasDigital,
      paperAvailable,
      digitalAvailable,
      paperPrice,
      digitalPrice,
      singleVariant: singleEdition?.variant,
      hasMultipleEditions: allInStock.length > 1,
    };
  }

  const filtered = products;

  const items: ProductCardItem[] = filtered.map((p) => {
    const meta = (p.metadata || {}) as Record<string, unknown>;
    const {
      paperPrice,
      digitalPrice,
      paperAvailable,
      digitalAvailable,
      singleVariant,
      hasMultipleEditions,
    } = variantInfo(p);
    const hasBoth = paperAvailable && digitalAvailable;
    const lowest = hasBoth
      ? Math.min(paperPrice, digitalPrice)
      : paperAvailable
        ? paperPrice
        : digitalAvailable
          ? digitalPrice
          : 0;
    return {
      id: p.id,
      type: "book" as const,
      title: p.title,
      subtitle: (meta.author as string) || undefined,
      description: p.description,
      imageUrl: p.thumbnail,
      price: lowest > 0 ? String(lowest) : null,
      currency: "EGP",
      isFeatured: productIsFeatured(p),
      isNewRelease: !!meta.isNewRelease,
      externalUrl:
        (meta.buyLink as string) || (meta.externalUrl as string) || null,
      detailUrl: `/services/store/books/${p.id}`,
      paperAvailable,
      digitalAvailable,
      singleFormatPrice: hasBoth ? null : lowest,
      pricePrefix: hasMultipleEditions ? (isArabic ? "يبدأ من" : "from") : null,
      variantId: singleVariant?.id ?? null,
      inCart: singleVariant
        ? !!cart.cart?.items?.some((li) => li.variant_id === singleVariant.id)
        : false,
    };
  });

  function clearAll() {
    setSearch("");
    setFilters(EMPTY_BOOK_FILTERS);
  }
  const set = (patch: Partial<BookFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasActiveFilters = bookFiltersToQuery(filters) !== "";

  return (
    <div className="min-h-screen bg-[hsl(150_12%_97%)]">
      <SiteNav />

      {/* Hero */}
      <section className="relative pt-28 pb-10 px-4 overflow-hidden border-b border-border/50 bg-[hsl(150_12%_97%)]">
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(15,61,46,0.08),_transparent_55%)]"
          aria-hidden
        />
        <div className="container mx-auto max-w-6xl relative">
          <Link
            href="/services/store"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            {isArabic ? (
              <ArrowRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5" />
            )}
            {t.back}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
          >
            <div className="max-w-2xl">
              <div className="text-xs font-semibold tracking-[0.18em] uppercase text-primary/80 mb-3">
                {t.eyebrow}
              </div>
              <h1
                className="text-4xl md:text-5xl font-medium text-foreground leading-tight mb-3"
                style={{
                  fontFamily: isArabic
                    ? "'IBM Plex Sans Arabic', sans-serif"
                    : "Georgia, 'Times New Roman', serif",
                }}
              >
                {t.title}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                {t.subtitle}
              </p>
            </div>
            <div className="text-sm text-muted-foreground tabular-nums md:text-end">
              <span className="text-foreground font-semibold text-lg">
                {loading ? "—" : total}
              </span>{" "}
              {t.results}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-20 px-4 py-4 bg-[hsl(150_12%_97%/0.92)] backdrop-blur-md border-b border-border/60">
        <div className="container mx-auto max-w-6xl space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="ps-10 h-12 rounded-xl border-border bg-card shadow-sm"
              aria-label={t.searchPlaceholder}
            />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-2 shrink-0 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Filter className="w-3.5 h-3.5" />
              {t.filterFormat}
            </div>
            <Segmented
              value={filters.format}
              onChange={(v) => set({ format: v as BookFilters["format"] })}
              options={[
                { v: "all", l: t.all },
                { v: "paper", l: t.paper },
                { v: "digital", l: t.digital },
              ]}
            />
          </div>

          {tree.length > 0 && (
            <div className="bg-background border border-border p-2">
              <div className="text-xs font-bold text-muted-foreground px-3 py-1">{t.filterSection}</div>
              <CategoryFilter tree={tree} selectedId={filters.category} onSelect={(id) => set({ category: id })} isArabic={isArabic} allLabel={t.all} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FacetSelect label={t.filterAuthor} allLabel={t.all} value={filters.author} options={facets.authors} onChange={(v) => set({ author: v })} />
            <FacetSelect label={t.filterPublisher} allLabel={t.all} value={filters.publisher} options={facets.publishers} onChange={(v) => set({ publisher: v })} />
            <FacetSelect
              label={t.filterLanguage}
              allLabel={t.all}
              value={filters.language}
              options={facets.languages}
              onChange={(v) => set({ language: v as BookFilters["language"] })}
              format={(v) => t.languages[v as keyof typeof t.languages] ?? v}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> {t.clearFilters}
            </button>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-sm text-muted-foreground mb-6">
            {t.countLabel(total)}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] bg-card/80 border border-border/60 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <FetchError
              className="py-16"
              onRetry={() => setReloadKey((k) => k + 1)}
            />
          ) : items.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-foreground font-medium mb-1">{t.empty}</p>
              <p className="text-sm mb-4">{t.emptyHint}</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm text-primary underline underline-offset-4"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          ) : (
            <>
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5"
              >
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </motion.div>
              {products.length < total && (
                <div className="flex justify-center pt-6">
                  <button type="button" onClick={loadMore} disabled={loadingMore} className="px-6 py-2 border border-border font-bold text-sm hover:bg-muted/60 disabled:opacity-50">
                    {t.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AdminFab
        href={getMedusaAdminUrl()}
        external
        label={{ ar: "إدارة المتجر", en: "Manage Store" }}
      />
      <SiteFooter />
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap p-1 rounded-full bg-muted/60 border border-border/80 gap-0.5">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.v}
          onClick={() => onChange(opt.v)}
          className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
            value === opt.v
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.l}
        </button>
      ))}
    </div>
  );
}
