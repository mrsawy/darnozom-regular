import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Search, ChevronLeft, GraduationCap, X, Award, Clock, Calendar, ShoppingCart, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SiteNav from "@/components/site-nav";
import { AdminFab } from "@/components/store/admin-fab";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import type { StoreCourse, CourseDelivery, CourseLevel } from "@/lib/store-types";
import { SiteFooter } from "@/components/site-footer";

const T = {
  ar: {
    back: "العودة للمتجر",
    title: "الدورات",
    subtitle: "أونلاين بشكل ذاتي، مباشر، أو حضوريًا",
    searchPlaceholder: "ابحث بالعنوان أو المدرب...",
    filterDelivery: "نمط التقديم",
    filterLevel: "المستوى",
    all: "الكل",
    online_self: "أونلاين ذاتي",
    online_live: "أونلاين مباشر",
    onsite: "حضوري",
    hybrid: "هجين",
    levels: { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم", all_levels: "كل المستويات" },
    empty: "لم نعثر على دورات مطابقة",
    clearFilters: "مسح الفلاتر",
    hours: "ساعة",
    modules: "وحدة",
    cert: "شهادة",
    addToCart: "أضف للسلة",
    inCart: "في السلة",
    added: "تمت الإضافة",
    countLabel: (n: number) => `${n} دورة`,
  },
  en: {
    back: "Back to store",
    title: "Courses",
    subtitle: "Online self-paced, live, or onsite at our facilities",
    searchPlaceholder: "Search by title or instructor...",
    filterDelivery: "Delivery",
    filterLevel: "Level",
    all: "All",
    online_self: "Online self-paced",
    online_live: "Online live",
    onsite: "Onsite",
    hybrid: "Hybrid",
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all_levels: "All levels" },
    empty: "No matching courses found",
    clearFilters: "Clear filters",
    hours: "hrs",
    modules: "modules",
    cert: "Certificate",
    addToCart: "Add to cart",
    inCart: "In cart",
    added: "Added",
    countLabel: (n: number) => `${n} course${n === 1 ? "" : "s"}`,
  },
};

export default function StoreCoursesPage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const searchString = useSearch();
  const initialQ = new URLSearchParams(searchString).get("q") || "";

  const [courses, setCourses] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState(initialQ);
  const [delivery, setDelivery] = useState<"all" | CourseDelivery>("all");
  const [level, setLevel] = useState<"all" | CourseLevel>("all");
  const [justAddedId, setJustAddedId] = useState<number | null>(null);
  const cart = useCart();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const p = new URLSearchParams();
        if (search) p.set("search", search);
        if (delivery !== "all") p.set("delivery", delivery);
        if (level !== "all") p.set("level", level);
        const r = await fetch(`/api/store/courses?${p}`);
        if (cancelled) return;
        if (!r.ok) {
          setError(true);
          setCourses([]);
        } else {
          setCourses(await r.json());
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setCourses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const id = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [search, delivery, level, reloadKey]);

  function clearAll() { setSearch(""); setDelivery("all"); setLevel("all"); }

  function parsePrice(price: string | null | undefined) {
    if (!price) return 0;
    const cleaned = String(price).replace(/[^\d.]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  function handleAddCourseToCart(c: StoreCourse) {
    const numericPrice = parsePrice(c.price);
    const result = cart.addItem({
      type: "course",
      productId: c.id,
      title: isArabic ? c.titleAr : (c.titleEn || c.titleAr),
      price: numericPrice,
      currency: c.currency || "SAR",
      imageUrl: c.thumbnailUrl ?? null,
    });
    if (!result.ok && result.reason === "currency_mismatch") {
      const msg = isArabic
        ? `لا يمكن إضافة منتج بعملة ${result.attempted} إلى سلة بعملة ${result.existing}. أكمل الطلب الحالي أولاً أو أفرغ السلة.`
        : `Cannot add a ${result.attempted} item to a ${result.existing} cart. Please checkout or clear your cart first.`;
      window.alert(msg);
      return;
    }
    setJustAddedId(c.id);
    window.setTimeout(() => setJustAddedId(prev => (prev === c.id ? null : prev)), 1400);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="pt-28 pb-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <Link href="/services/store" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-secondary mb-4">
            <ChevronLeft className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} /> {t.back}
          </Link>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">{t.title}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6">
        <div className="container mx-auto max-w-6xl bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="ps-10 h-11" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <FilterChips label={t.filterDelivery} value={delivery} onChange={(v) => setDelivery(v as typeof delivery)}
              options={[
                { v: "all", l: t.all },
                { v: "online_self", l: t.online_self },
                { v: "online_live", l: t.online_live },
                { v: "onsite", l: t.onsite },
                { v: "hybrid", l: t.hybrid },
              ]} />
            <FilterChips label={t.filterLevel} value={level} onChange={(v) => setLevel(v as typeof level)}
              options={[
                { v: "all", l: t.all },
                ...Object.entries(t.levels).map(([k, l]) => ({ v: k, l })),
              ]} />
          </div>
          {(search || delivery !== "all" || level !== "all") && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-secondary inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> {t.clearFilters}
            </button>
          )}
        </div>
      </section>

      <section className="px-4 pb-16 bg-[#F4ECD7]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-sm text-muted-foreground mb-4">{t.countLabel(courses.length)}</div>
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <FetchError className="py-16" onRetry={() => setReloadKey((k) => k + 1)} />
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t.empty}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(c => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-secondary/50 transition-all flex flex-col"
                >
                  <Link href={`/services/store/courses/${c.id}`} className="block cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/10 relative">
                      {c.thumbnailUrl ? (
                        <img src={c.thumbnailUrl} alt={c.titleAr} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <GraduationCap className="w-12 h-12 text-purple-400/50" />
                        </div>
                      )}
                      <div className="absolute top-3 start-3">
                        <span className="bg-card/90 backdrop-blur text-xs px-2 py-1 rounded-full text-foreground border border-border">
                          {t[c.delivery as keyof typeof t] as string || c.delivery}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <Link href={`/services/store/courses/${c.id}`}>
                      <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-2 hover:text-secondary cursor-pointer transition-colors">
                        {isArabic ? c.titleAr : (c.titleEn || c.titleAr)}
                      </h3>
                    </Link>
                    {c.instructor && (
                      <p className="text-sm text-muted-foreground mb-2">{c.instructor}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                      {c.durationHours && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {c.durationHours} {t.hours}</span>}
                      {c.upcomingDate && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.upcomingDate}</span>}
                      {c.certification && <span className="inline-flex items-center gap-1 text-secondary"><Award className="w-3 h-3" /> {t.cert}</span>}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <div className="text-sm font-bold text-secondary">
                        {c.price ? <>{c.price} {c.currency || "SAR"}</> : "—"}
                      </div>
                      {parsePrice(c.price) > 0 && (() => {
                        const inCart = cart.has("course", c.id);
                        const justAdded = justAddedId === c.id;
                        return (
                          <Button
                            size="sm"
                            onClick={() => handleAddCourseToCart(c)}
                            title={inCart ? t.inCart : t.addToCart}
                            className={`h-8 ${
                              justAdded
                                ? "bg-emerald-500 text-white hover:bg-emerald-500"
                                : inCart
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            }`}
                          >
                            {justAdded ? (
                              <><Check className="w-3.5 h-3.5 me-1" /> {t.added}</>
                            ) : inCart ? (
                              <><Plus className="w-3.5 h-3.5 me-1" /> {t.inCart}</>
                            ) : (
                              <><ShoppingCart className="w-3.5 h-3.5 me-1" /> {t.addToCart}</>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AdminFab href="/admin/store-courses" label={{ ar: "إضافة دورة", en: "Add course" }} />
      <SiteFooter />
    </div>
  );
}

function FilterChips({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[];
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt.v} onClick={() => onChange(opt.v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              value === opt.v ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-card text-muted-foreground border-border hover:border-secondary/50 hover:text-foreground"
            }`}>
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}
