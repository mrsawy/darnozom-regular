import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { HttpTypes } from "@medusajs/types";
import {
  BookOpen, GraduationCap, MonitorSmartphone, Search, ArrowUpRight,
  ShieldCheck, BadgeCheck, Users, Library, Sparkle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import SiteNav from "@/components/site-nav";
import ProductCard, { type ProductCardItem } from "@/components/store/product-card";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { getMedusaClient, getStoreRegionId } from "@/lib/medusa-client";
import { productIsFeatured } from "@/lib/product-featured";
import { useCart } from "@/lib/cart-context";
import { SiteFooter } from "@/components/site-footer";

type StoreProduct = HttpTypes.StoreProduct;

function formatAmount(amount: number | null | undefined): number {
  if (typeof amount !== "number") return 0;
  return amount;
}

const T = {
  ar: {
    eyebrow: "متجرنا",
    title: ["متجر الكتب"],
    subtitle: "مرجع موحّد لقادة الأعمال والمؤسسات: مكتبة بحثية، برامج تدريبية معتمدة، وحلول رقمية يطوّرها فريق دار نظم.",
    searchPlaceholder: "ابحث في المراجع والبرامج والحلول...",
    trust: ["محتوى يُعدّه ويراجعه فريق دار نظم", "معتمد لدى منشآت حكومية وخاصة", "محدّث سنويًا وفق أحدث الممارسات"],
    statsLabels: { resources: "مرجعًا متاحًا", clients: "منشأة استفادت", experts: "خبيرًا ومستشارًا", langs: "لغة" },
    cats: {
      books: {
        title: "متجر الكتب",
        kicker: "مراجع منشورة",
        desc: "إصدارات نوعية في الإدارة، الحوكمة، الفقه التطبيقي، والتطوير المؤسسي — بصيغة ورقية وإلكترونية.",
        cta: "تصفّح المكتبة",
      },
      courses: {
        title: "التدريبات",
        kicker: "تطوير القدرات",
        desc: "برامج تدريبية أونلاين وحضورية لتمكين الكوادر القيادية وفرق العمل من تطبيق المعرفة على أرض الواقع.",
        cta: "تصفّح البرامج",
      },
      apps: {
        title: "التطبيقات الرقمية",
        kicker: "تقنية مدعومة بالذكاء الاصطناعي",
        desc: "منصات وأدوات رقمية يطوّرها فريق دار نظم لأتمتة الإدارة، التحليل، واتخاذ القرار في المؤسسات.",
        cta: "تصفّح الحلول",
      },
    },
    editorPick: "اختيار المحرّر",
    editorPickDesc: "إصدارات وبرامج تستحق وقت قادة الأعمال هذا الشهر.",
    latest: "أحدث الإضافات",
    latestDesc: "ما أُضيف حديثًا إلى مركز المعرفة.",
    seeAll: "عرض الكل",
    empty: "نعمل حاليًا على إضافة المحتوى — عُد قريبًا.",
    forTeams: "هل تمثّل مؤسسة؟",
    forTeamsDesc: "نوفّر باقات مؤسسية للمكتبة الرقمية والبرامج التدريبية والحلول الرقمية، مع تخصيص حسب احتياج جهتكم.",
    forTeamsCta: "تواصل مع فريق المبيعات",
  },
  en: {
    eyebrow: "Our Store",
    title: ["Book Store"],
    subtitle: "A single reference for business leaders and institutions: a research library, accredited training programs, and digital solutions built by Darnozom.",
    searchPlaceholder: "Search across publications, programs, and solutions...",
    trust: ["Authored & reviewed by Darnozom experts", "Trusted by public & private institutions", "Updated annually with the latest practice"],
    statsLabels: { resources: "Resources available", clients: "Institutions served", experts: "Experts & advisors", langs: "Languages" },
    cats: {
      books: {
        title: "Book Store",
        kicker: "Published references",
        desc: "Curated publications on management, governance, applied jurisprudence, and organizational development — in print and digital.",
        cta: "Browse the library",
      },
      courses: {
        title: "Trainings",
        kicker: "Capability building",
        desc: "Online and onsite programs that equip leadership and operating teams to translate knowledge into outcomes.",
        cta: "Browse the programs",
      },
      apps: {
        title: "Digital Apps",
        kicker: "AI-powered platforms",
        desc: "Platforms and tools built by Darnozom to automate management, analysis, and decision-making across institutions.",
        cta: "Browse the solutions",
      },
    },
    editorPick: "Editor's Pick",
    editorPickDesc: "Selections worth a business leader's time this month.",
    latest: "Latest Additions",
    latestDesc: "Recently added to the knowledge hub.",
    seeAll: "See all",
    empty: "We are adding content — please check back soon.",
    forTeams: "Representing an institution?",
    forTeamsDesc: "We offer enterprise plans across the digital library, training programs, and digital solutions — with customization for your organization's needs.",
    forTeamsCta: "Talk to our enterprise team",
  },
};

// A book product carries a paper and/or digital variant, stamped with
// metadata.kind by Task 4's migration. The card shows the lowest available
// price and, when only one format exists, can add straight to cart.
function productToItem(p: StoreProduct, isArabic: boolean): ProductCardItem {
  const meta = (p.metadata || {}) as Record<string, unknown>;
  const variants = p.variants || [];
  const paperVariant = variants.find((v) => (v.metadata as Record<string, unknown> | undefined)?.kind === "paper");
  const digitalVariant = variants.find((v) => (v.metadata as Record<string, unknown> | undefined)?.kind === "digital");
  const paperPrice = formatAmount(paperVariant?.calculated_price?.calculated_amount);
  const digitalPrice = formatAmount(digitalVariant?.calculated_price?.calculated_amount);
  const paperAvailable = !!paperVariant && paperPrice > 0;
  const digitalAvailable = !!digitalVariant && digitalPrice > 0;
  const hasBoth = paperAvailable && digitalAvailable;
  const lowest = hasBoth
    ? Math.min(paperPrice, digitalPrice)
    : paperAvailable
      ? paperPrice
      : digitalAvailable
        ? digitalPrice
        : 0;
  const singleVariant = paperAvailable && !digitalAvailable
    ? paperVariant
    : digitalAvailable && !paperAvailable
      ? digitalVariant
      : undefined;

  return {
    id: p.id,
    type: "book",
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
    badge: isArabic ? "مرجع" : "Reference",
    paperAvailable,
    digitalAvailable,
    singleFormatPrice: hasBoth ? null : lowest,
    pricePrefix: hasBoth && paperPrice !== digitalPrice ? (isArabic ? "يبدأ من" : "from") : null,
    variantId: singleVariant?.id ?? null,
  };
}

export default function StorePage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const cart = useCart();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const sdk = getMedusaClient();
        const regionId = await getStoreRegionId();
        // calculated_price is only populated when explicitly requested via
        // `fields`, and Medusa rejects that request unless region_id is set.
        const { products: fetched } = await sdk.store.product.list({
          limit: 100,
          region_id: regionId,
          fields: "*variants,*variants.calculated_price,*variants.metadata,*tags",
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
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const allItems: ProductCardItem[] = products.map((p) => {
    const item = productToItem(p, isArabic);
    return { ...item, inCart: item.variantId ? !!cart.cart?.items?.some((li) => li.variant_id === item.variantId) : false };
  });
  const editorPicks = allItems.filter(i => i.isFeatured).slice(0, 4);
  const latest = allItems.filter(i => i.isNewRelease).slice(0, 4);
  const totalCount = products.length;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    window.location.href = `/services/store/books?q=${encodeURIComponent(search.trim())}`;
  }

  const cats = [
    { key: "books", icon: BookOpen, href: "/services/store/books", count: products.length },
    // Courses remain on the old Express-backed store-courses page (out of
    // scope for this migration), so their count isn't sourced here.
    { key: "courses", icon: GraduationCap, href: "/academy/courses", count: 0 },
    { key: "apps", icon: MonitorSmartphone, href: "/services/digital-transformation", count: 0 },
  ] as const;

  const stats = [
    { icon: Library, value: totalCount > 0 ? `+${totalCount}` : "—", label: t.statsLabels.resources },
    { icon: Users, value: "+1,200", label: t.statsLabels.clients },
    { icon: BadgeCheck, value: "+40", label: t.statsLabels.experts },
    { icon: ShieldCheck, value: isArabic ? "AR / EN" : "AR / EN", label: t.statsLabels.langs },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* Editorial Hero */}
      <section className="relative pt-28 pb-14 px-4 overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.10),_transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
        </div>
        <div className="container mx-auto max-w-6xl relative">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-secondary mb-5 font-medium">
              <span className="w-8 h-px bg-secondary/60" />
              {t.eyebrow}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground leading-[1.15] max-w-4xl mb-5">
              {t.title.map((part, i) => <span key={i}>{part} </span>)}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed">{t.subtitle}</p>

            <form onSubmit={handleSearch} className="max-w-2xl">
              <div className="relative bg-card border border-border rounded-xl shadow-sm hover:border-secondary/50 transition-colors focus-within:border-secondary/60">
                <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="ps-11 pe-24 h-12 bg-transparent border-0 focus-visible:ring-0 text-sm"
                />
                <button type="submit" className="absolute top-1/2 -translate-y-1/2 end-2 h-9 px-4 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-lg transition-colors">
                  {isArabic ? "بحث" : "Search"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Three pillars — primary options at top */}
      <section className="py-14 px-4 border-b border-border/60">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-4">
            {cats.map((cat, i) => {
              const Icon = cat.icon;
              const meta = t.cats[cat.key as keyof typeof t.cats];
              return (
                <motion.div
                  key={cat.key}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link
                    href={cat.href}
                    className="group relative block bg-card border border-border hover:border-secondary/60 rounded-2xl p-7 h-full transition-all overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/0 group-hover:via-secondary/60 to-transparent transition-all" />
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-secondary" />
                      </div>
                      <span className="text-[10px] tracking-widest uppercase text-muted-foreground font-medium">
                        0{i + 1}
                      </span>
                    </div>
                    <div className="text-[11px] tracking-[0.2em] uppercase text-secondary/80 font-medium mb-2">
                      {meta.kicker}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">{meta.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 min-h-[3.5rem]">{meta.desc}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="inline-flex items-center gap-1.5 text-secondary font-medium text-sm group-hover:gap-2.5 transition-all">
                        {meta.cta}
                        <ArrowUpRight className={`w-4 h-4 ${isArabic ? "rotate-[270deg]" : ""}`} />
                      </span>
                      {cat.count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {cat.count} {isArabic ? "متاح" : "available"}
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-border/60 bg-muted/20">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-x-8 gap-y-2 text-xs text-muted-foreground">
            {t.trust.map((line, i) => (
              <div key={i} className="inline-flex items-center gap-2">
                <BadgeCheck className="w-3.5 h-3.5 text-secondary" />
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-8 border-b border-border/60">
        <div className="container mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-tight">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Editor's Pick */}
      {editorPicks.length > 0 && (
        <section className="py-14 px-4 bg-muted/20 border-y border-border/60">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-secondary mb-2 font-medium">
                  <Sparkle className="w-3.5 h-3.5" /> {t.editorPick}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{t.editorPick}</h2>
                <p className="text-sm text-muted-foreground max-w-xl">{t.editorPickDesc}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {editorPicks.map(item => (
                <ProductCard key={`ep-${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <section className="py-14 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
              <div>
                <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 font-medium">{t.latest}</div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{t.latest}</h2>
                <p className="text-sm text-muted-foreground">{t.latestDesc}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {latest.map(item => (
                <ProductCard key={`l-${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-md">
            <FetchError onRetry={() => setReloadKey((k) => k + 1)} />
          </div>
        </section>
      )}

      {!loading && !error && allItems.length === 0 && (
        <section className="py-16 px-4 text-center">
          <p className="text-muted-foreground">{t.empty}</p>
        </section>
      )}

      {/* Enterprise CTA */}
      <section className="py-16 px-4 bg-[#F4ECD7]">
        <div className="container mx-auto max-w-5xl">
          <div className="relative overflow-hidden bg-primary text-primary-foreground rounded-3xl p-8 md:p-12 border border-secondary/30">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-secondary/20 blur-3xl" />
              <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
            </div>
            <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-secondary mb-3 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isArabic ? "للمؤسسات" : "For Enterprise"}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">{t.forTeams}</h3>
                <p className="text-primary-foreground/80 max-w-2xl">{t.forTeamsDesc}</p>
              </div>
              <Link
                href="/#contact"
                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-3 rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
              >
                {t.forTeamsCta}
                <ArrowUpRight className={`w-4 h-4 ${isArabic ? "rotate-[270deg]" : ""}`} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
