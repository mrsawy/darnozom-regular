import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { HttpTypes } from "@medusajs/types";
import { BookOpen, X } from "lucide-react";
import ProductCard, { type ProductCardItem } from "@/components/store/product-card";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { listBookCategoryTree, searchStoreBooks, type BookFacets, type CategoryTreeNode } from "@/lib/book-catalog";
import { bookFiltersToQuery, EMPTY_BOOK_FILTERS, type BookFilters } from "@/lib/book-filters";
import CategoryFilter from "@/components/store/category-filter";
import FacetSelect from "@/components/store/facet-select";
import { productIsFeatured } from "@/lib/product-featured";
import { getBookVariantInfo } from "@/lib/book-variants";
import { useCart } from "@/lib/cart-context";

type StoreProduct = HttpTypes.StoreProduct;

const T = {
  ar: {
    collectionHeading: "المجموعة",
    collectionAll: "جميع الكتب",
    collectionDN: "كتب دار نظم",
    formatHeading: "الصيغة",
    formatAll: "الكل",
    formatPaper: "ورقي",
    formatDigital: "رقمي",
    sectionsHeading: "الأقسام العلمية",
    moreFiltersHeading: "فلاتر إضافية",
    filterAuthor: "المؤلف",
    filterPublisher: "الناشر",
    filterLanguage: "لغة الكتاب",
    languages: { ar: "العربية", en: "الإنجليزية", both: "العربية والإنجليزية" },
    loadMore: "عرض المزيد",
    all: "الكل",
    empty: "لم نعثر على كتب مطابقة",
    emptyHint: "جرّب مسح الفلاتر أو كلمة بحث مختلفة",
    clearFilters: "مسح الفلاتر",
    booksWord: () => "كتاب",
    sortLabel: "الترتيب:",
    sortNewest: "الأحدث",
  },
  en: {
    collectionHeading: "COLLECTION",
    collectionAll: "All books",
    collectionDN: "DarNozom books",
    formatHeading: "FORMAT",
    formatAll: "All",
    formatPaper: "Paper",
    formatDigital: "Digital",
    sectionsHeading: "SECTIONS",
    moreFiltersHeading: "MORE FILTERS",
    filterAuthor: "Author",
    filterPublisher: "Publisher",
    filterLanguage: "Book language",
    languages: { ar: "Arabic", en: "English", both: "Arabic & English" },
    loadMore: "Load more",
    all: "All",
    empty: "No matching books found",
    emptyHint: "Try clearing filters or a different search term",
    clearFilters: "Clear filters",
    booksWord: (n: number) => `book${n === 1 ? "" : "s"}`,
    sortLabel: "Sort:",
    sortNewest: "Newest",
  },
};

interface Props {
  /** When true, isDarnozom is locked to true and the collection toggle is hidden */
  lockDarnozom?: boolean;
  /** When true, isDarnozom starts as true but the toggle is still visible */
  defaultDarnozom?: boolean;
  /** External search query (e.g. from the page's search form) */
  q?: string;
}

export function BookStorePanel({ lockDarnozom = false, defaultDarnozom = false, q: externalQ = "" }: Props) {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const PAGE = 24;

  const baseFilters: BookFilters = { ...EMPTY_BOOK_FILTERS, isDarnozom: lockDarnozom || defaultDarnozom };
  const [filters, setFilters] = useState<BookFilters>(baseFilters);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<BookFacets>({ authors: [], publishers: [], languages: [] });
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Sync external search query into filters.
  useEffect(() => {
    setFilters((f) => ({ ...f, q: externalQ }));
  }, [externalQ]);

  useEffect(() => {
    let cancelled = false;
    listBookCategoryTree()
      .then((tr) => !cancelled && setTree(tr))
      .catch(() => !cancelled && setTree([]));
    return () => { cancelled = true; };
  }, [reloadKey]);

  const params = (offset: number) => ({
    q: filters.q.length >= 2 ? filters.q : undefined,
    category_id: filters.category || undefined,
    author: filters.author || undefined,
    publisher: filters.publisher || undefined,
    language: filters.language || undefined,
    format: filters.format === "all" ? undefined : filters.format,
    is_darnozom: (lockDarnozom || filters.isDarnozom) ? true : undefined,
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

  const cart = useCart();

  function variantInfo(p: StoreProduct) {
    const { paperEditions, digitalEditions } = getBookVariantInfo(p);
    const hasPaper = paperEditions.length > 0;
    const hasDigital = digitalEditions.length > 0;
    const paperInStock = paperEditions.filter((e) => e.inStock);
    const digitalInStock = digitalEditions.filter((e) => e.inStock);
    const paperAvailable = paperInStock.length > 0;
    const digitalAvailable = digitalInStock.length > 0;
    const paperPrice = paperInStock.length ? Math.min(...paperInStock.map((e) => e.price)) : paperEditions[0] ? Math.min(...paperEditions.map((e) => e.price)) : 0;
    const digitalPrice = digitalInStock.length ? Math.min(...digitalInStock.map((e) => e.price)) : digitalEditions[0] ? Math.min(...digitalEditions.map((e) => e.price)) : 0;
    const allInStock = [...paperInStock, ...digitalInStock];
    const singleEdition = allInStock.length === 1 ? allInStock[0] : undefined;
    return { hasPaper, hasDigital, paperAvailable, digitalAvailable, paperPrice, digitalPrice, singleVariant: singleEdition?.variant, hasMultipleEditions: allInStock.length > 1 };
  }

  const items: ProductCardItem[] = products.map((p) => {
    const meta = (p.metadata || {}) as Record<string, unknown>;
    const { paperPrice, digitalPrice, paperAvailable, digitalAvailable, singleVariant, hasMultipleEditions } = variantInfo(p);
    const hasBoth = paperAvailable && digitalAvailable;
    const lowest = hasBoth ? Math.min(paperPrice, digitalPrice) : paperAvailable ? paperPrice : digitalAvailable ? digitalPrice : 0;
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
      externalUrl: (meta.buyLink as string) || (meta.externalUrl as string) || null,
      detailUrl: `/services/store/books/${p.id}`,
      paperAvailable,
      digitalAvailable,
      singleFormatPrice: hasBoth ? null : lowest,
      pricePrefix: hasMultipleEditions ? (isArabic ? "يبدأ من" : "from") : null,
      variantId: singleVariant?.id ?? null,
      inCart: singleVariant ? !!cart.cart?.items?.some((li) => li.variant_id === singleVariant.id) : false,
    };
  });

  const set = (patch: Partial<BookFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const hasActiveFilters = bookFiltersToQuery({ ...filters, isDarnozom: lockDarnozom ? false : filters.isDarnozom }) !== "";

  function clearAll() {
    setFilters(baseFilters);
  }

  const formatOptions: { value: BookFilters["format"]; label: string }[] = [
    { value: "all", label: t.formatAll },
    { value: "paper", label: t.formatPaper },
    { value: "digital", label: t.formatDigital },
  ];

  return (
    <div className="grid lg:grid-cols-[248px_1fr] gap-10 mt-6">
      {/* Sidebar */}
      <aside className="flex flex-col gap-8">
        {!lockDarnozom && (
          <div>
            <div className="text-[11px] font-bold tracking-[0.14em] text-foreground mb-3">{t.collectionHeading}</div>
            <div className="grid grid-cols-2 bg-muted rounded-full p-1">
              {([{ dn: false, label: t.collectionAll }, { dn: true, label: t.collectionDN }] as { dn: boolean; label: string }[]).map((opt) => (
                <button
                  key={String(opt.dn)}
                  type="button"
                  aria-pressed={filters.isDarnozom === opt.dn}
                  onClick={() => set({ isDarnozom: opt.dn })}
                  className={`text-center py-2 rounded-full text-xs font-medium transition-colors ${filters.isDarnozom === opt.dn ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] font-bold tracking-[0.14em] text-foreground mb-3">{t.formatHeading}</div>
          <div className="grid grid-cols-3 bg-muted rounded-full p-1">
            {formatOptions.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filters.format === f.value}
                onClick={() => set({ format: f.value })}
                className={`text-center py-2 rounded-full text-xs font-medium transition-colors ${filters.format === f.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {tree.length > 0 && (
          <div>
            <div className="text-[11px] font-bold tracking-[0.14em] text-foreground mb-2">{t.sectionsHeading}</div>
            <CategoryFilter tree={tree} selectedId={filters.category} onSelect={(id) => set({ category: id })} isArabic={isArabic} allLabel={t.all} />
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] font-bold tracking-[0.14em] text-foreground">{t.moreFiltersHeading}</div>
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
          <button type="button" onClick={clearAll} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 self-start">
            <X className="w-3.5 h-3.5" /> {t.clearFilters}
          </button>
        )}
      </aside>

      {/* Results */}
      <main>
        <div className="flex items-center justify-between mb-6 text-sm">
          <span className="text-muted-foreground">
            <b className="text-foreground">{loading ? "—" : total}</b> {t.booksWord(total)}
          </span>
          <span className="text-muted-foreground">
            {t.sortLabel} <b className="text-foreground font-medium">{t.sortNewest}</b>
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-card/80 border border-border/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <FetchError className="py-16" onRetry={() => setReloadKey((k) => k + 1)} />
        ) : items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-foreground font-medium mb-1">{t.empty}</p>
            <p className="text-sm mb-4">{t.emptyHint}</p>
            {hasActiveFilters && (
              <button type="button" onClick={clearAll} className="text-sm text-primary underline underline-offset-4">
                {t.clearFilters}
              </button>
            )}
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {items.map((item) => <ProductCard key={item.id} item={item} />)}
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
      </main>
    </div>
  );
}
