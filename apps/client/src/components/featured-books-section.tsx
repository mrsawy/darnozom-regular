import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import ProductCard, { type ProductCardItem } from "@/components/store/product-card";
import { useLanguage } from "@/lib/language-context";
import { getMedusaClient, getStoreRegionId } from "@/lib/medusa-client";
import { productIsFeatured } from "@/lib/product-featured";

function formatAmount(amount: number | null | undefined): number {
  if (amount == null || Number.isNaN(amount)) return 0;
  return amount;
}

function toCardItem(
  p: {
    id: string;
    title: string;
    description?: string | null;
    thumbnail?: string | null;
    metadata?: Record<string, unknown> | null;
    tags?: Array<{ value?: string | null }> | null;
    variants?: Array<{
      id?: string;
      metadata?: Record<string, unknown> | null;
      calculated_price?: { calculated_amount?: number | null } | null;
    }> | null;
  },
  isArabic: boolean,
): ProductCardItem {
  const meta = (p.metadata || {}) as Record<string, unknown>;
  const variants = p.variants || [];
  const paperVariant = variants.find(
    (v) => (v.metadata as Record<string, unknown> | undefined)?.kind === "paper",
  );
  const digitalVariant = variants.find(
    (v) => (v.metadata as Record<string, unknown> | undefined)?.kind === "digital",
  );
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
  const singleVariant =
    paperAvailable && !digitalAvailable
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
    isFeatured: true,
    detailUrl: `/services/store/books/${p.id}`,
    badge: isArabic ? "مرجع" : "Reference",
    paperAvailable,
    digitalAvailable,
    singleFormatPrice: hasBoth ? null : lowest,
    pricePrefix:
      hasBoth && paperPrice !== digitalPrice
        ? isArabic
          ? "يبدأ من"
          : "from"
        : null,
    variantId: singleVariant?.id ?? null,
  };
}

/** Home section: featured Medusa books (tag `featured` or metadata.isFeatured). */
export default function FeaturedBooksSection() {
  const { isArabic } = useLanguage();
  const [items, setItems] = useState<ProductCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = getMedusaClient();
        const regionId = await getStoreRegionId();
        const { products } = await sdk.store.product.list({
          limit: 24,
          region_id: regionId,
          fields: "*variants,*variants.calculated_price,*variants.metadata,*tags",
        });
        if (cancelled) return;
        const featured = (products || [])
          .filter((p) =>
            productIsFeatured(p as Parameters<typeof productIsFeatured>[0]),
          )
          .slice(0, 4)
          .map((p) => toCardItem(p as Parameters<typeof toCardItem>[0], isArabic));
        setItems(featured);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isArabic]);

  if (!loading && items.length === 0) return null;

  return (
    <section id="featured-books" className="py-32 bg-transparent border-b border-border">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-16 gap-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
                {isArabic ? "متجر الكتب" : "Book Store"}
              </span>
              <div className="h-px w-10 bg-primary/40" />
            </div>
            <h2
              className="font-black text-primary leading-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
            >
              {isArabic ? "نماذج من أفضل كتبنا" : "Examples of our best books"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mt-6">
              {isArabic
                ? "مختارات مميزة من إصدارات دار نظم — مراجع عملية للقادة وصنّاع القرار."
                : "Featured selections from DarNozom — practical references for leaders and decision-makers."}
            </p>
          </div>
          <Link
            href="/services/store/books"
            className="group inline-flex items-center gap-2 text-secondary font-bold border-b-2 border-secondary pb-1 hover:gap-3 transition-all w-fit shrink-0"
          >
            {isArabic ? "تصفح كل الكتب" : "Browse all books"}
            <ArrowLeft className="w-4 h-4 rtl:hidden group-hover:translate-x-1 transition-transform rotate-180" />
            <ArrowLeft className="w-4 h-4 ltr:hidden group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
