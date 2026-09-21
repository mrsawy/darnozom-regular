import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import type { HttpTypes } from "@medusajs/types";
import { Search, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SiteNav from "@/components/site-nav";
import ProductCard, { type ProductCardItem } from "@/components/store/product-card";
import { AdminFab } from "@/components/store/admin-fab";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { getMedusaClient, getStoreRegionId } from "@/lib/medusa-client";
import { productIsFeatured } from "@/lib/product-featured";
import { getBookVariantInfo } from "@/lib/book-variants";
import { useCart } from "@/lib/cart-context";
import { SiteFooter } from "@/components/site-footer";

type StoreProduct = HttpTypes.StoreProduct;
type BookFormat = "online" | "hardcopy" | "both";
type BookLanguage = "ar" | "en";
type BookCategory = "shariah" | "management" | "digital_transformation";

const T = {
  ar: {
    back: "العودة للمتجر",
    title: "الكتب",
    subtitle: "إصدارات إلكترونية وورقية في مختلف المجالات",
    searchPlaceholder: "ابحث بالعنوان أو المؤلف...",
    filterFormat: "الصيغة",
    filterLanguage: "اللغة",
    filterCategory: "التصنيف",
    all: "الكل",
    online: "إلكتروني",
    hardcopy: "ورقي",
    both: "الاثنان",
    ar: "العربية",
    en: "الإنجليزية",
    cats: { shariah: "الشريعة", management: "الإدارة", digital_transformation: "التحول الرقمي" },
    empty: "لم نعثر على كتب مطابقة",
    clearFilters: "مسح الفلاتر",
    countLabel: (n: number) => `${n} كتاب`,
  },
  en: {
    back: "Back to store",
    title: "Books",
    subtitle: "Online & hardcopy editions across all topics",
    searchPlaceholder: "Search by title or author...",
    filterFormat: "Format",
    filterLanguage: "Language",
    filterCategory: "Category",
    all: "All",
    online: "Online",
    hardcopy: "Hardcopy",
    both: "Both",
    ar: "Arabic",
    en: "English",
    cats: { shariah: "Shariah", management: "Management", digital_transformation: "Digital Transformation" },
    empty: "No matching books found",
    clearFilters: "Clear filters",
    countLabel: (n: number) => `${n} book${n === 1 ? "" : "s"}`,
  },
};

export default function StoreBooksPage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const searchString = useSearch();
  const initialQ = useMemo(() => new URLSearchParams(searchString).get("q") || "", [searchString]);

  const cart = useCart();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState(initialQ);
  const [format, setFormat] = useState<"all" | BookFormat>("all");
  const [language, setLanguage] = useState<"all" | BookLanguage>("all");
  const [category, setCategory] = useState<"all" | BookCategory>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const sdk = getMedusaClient();
        const regionId = await getStoreRegionId();
        // calculated_price requires a region; without region_id Medusa returns 400.
        const { products: fetched } = await sdk.store.product.list({
          limit: 100,
          region_id: regionId,
          fields:
            "*variants,*variants.calculated_price,*variants.metadata,*variants.options,*tags,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
        });
        if (cancelled) return;
        setProducts(fetched);
      } catch {
        if (!cancelled) {
          setError(true);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, category, reloadKey]);

  function variantInfo(p: StoreProduct) {
    const { paperEditions, digitalEditions } = getBookVariantInfo(p);
    const paperInStockEditions = paperEditions.filter((e) => e.inStock);
    const digitalInStockEditions = digitalEditions.filter((e) => e.inStock);
    const paperAvailable = paperInStockEditions.length > 0;
    const digitalAvailable = digitalInStockEditions.length > 0;
    // Lowest price within each format, across every in-stock edition — not
    // just the first one — so a card never advertises a higher "from" price
    // than what's actually purchasable.
    const paperPrice = paperInStockEditions.length
      ? Math.min(...paperInStockEditions.map((e) => e.price))
      : 0;
    const digitalPrice = digitalInStockEditions.length
      ? Math.min(...digitalInStockEditions.map((e) => e.price))
      : 0;
    // A single, unambiguous purchasable edition overall — only then can the
    // card's own "add to cart" button add a specific variant directly.
    // Multiple editions (whether across formats or within one) send the
    // shopper to the product page to choose, same as before for
    // paper+digital both being available.
    const allInStock = [...paperInStockEditions, ...digitalInStockEditions];
    const singleEdition = allInStock.length === 1 ? allInStock[0] : undefined;
    // Whether the lowest price shown is really "the" price or just the
    // cheapest of several — a card must say "from" whenever more than one
    // purchasable edition exists, not only when both formats are present.
    const hasMultipleEditions = allInStock.length > 1;
    return {
      paperAvailable,
      digitalAvailable,
      paperPrice,
      digitalPrice,
      singleVariant: singleEdition?.variant,
      hasMultipleEditions,
    };
  }

  const filtered = products.filter((p) => {
    const meta = (p.metadata || {}) as Record<string, unknown>;
    const { paperAvailable, digitalAvailable } = variantInfo(p);
    // Map legacy filter values to the new paper/digital availability flags.
    if (format === "online" && !digitalAvailable) return false;
    if (format === "hardcopy" && !paperAvailable) return false;
    if (format === "both" && !(paperAvailable && digitalAvailable)) return false;
    const bookLanguage = meta.language as BookLanguage | "both" | undefined;
    if (language !== "all" && bookLanguage !== language && bookLanguage !== "both") return false;
    if (category !== "all" && meta.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = String(p.title || "").toLowerCase();
      const author = String(meta.author || "").toLowerCase();
      if (!title.includes(q) && !author.includes(q)) return false;
    }
    return true;
  });

  const items: ProductCardItem[] = filtered.map((p) => {
    const meta = (p.metadata || {}) as Record<string, unknown>;
    const { paperPrice, digitalPrice, paperAvailable, digitalAvailable, singleVariant, hasMultipleEditions } =
      variantInfo(p);
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

  function clearAll() {
    setSearch(""); setFormat("all"); setLanguage("all"); setCategory("all");
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="pt-28 pb-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">{t.title}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 pb-6">
        <div className="container mx-auto max-w-6xl bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder} className="ps-10 h-11"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <FilterChips label={t.filterFormat} value={format} onChange={(v) => setFormat(v as typeof format)}
              options={[
                { v: "all", l: t.all },
                { v: "online", l: t.online },
                { v: "hardcopy", l: t.hardcopy },
                { v: "both", l: t.both },
              ]} />
            <FilterChips label={t.filterLanguage} value={language} onChange={(v) => setLanguage(v as typeof language)}
              options={[
                { v: "all", l: t.all },
                { v: "ar", l: t.ar },
                { v: "en", l: t.en },
              ]} />
            <FilterChips label={t.filterCategory} value={category} onChange={(v) => setCategory(v as typeof category)}
              options={[
                { v: "all", l: t.all },
                ...Object.entries(t.cats).map(([k, l]) => ({ v: k, l })),
              ]} />
          </div>
          {(search || format !== "all" || language !== "all" || category !== "all") && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-secondary inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> {t.clearFilters}
            </button>
          )}
        </div>
      </section>

      <section className="px-4 pb-16 bg-[#F4ECD7]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-sm text-muted-foreground mb-4">{t.countLabel(items.length)}</div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-card border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <FetchError className="py-16" onRetry={() => setReloadKey((k) => k + 1)} />
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t.empty}</p>
            </div>
          ) : (
            <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <ProductCard key={item.id} item={item} />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <AdminFab href="/admin/books" label={{ ar: "إضافة كتاب", en: "Add book" }} />
      <SiteFooter />
    </div>
  );
}

function FilterChips({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              value === opt.v
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-card text-muted-foreground border-border hover:border-secondary/50 hover:text-foreground"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}
