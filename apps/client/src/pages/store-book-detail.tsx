import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import type { HttpTypes } from "@medusajs/types";
import {
  ChevronLeft,
  BookOpen,
  ShoppingCart,
  ExternalLink,
  Star,
  Layers,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/site-nav";
import { FetchError } from "@/components/fetch-error";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import { getMedusaClient, getStoreRegionId } from "@/lib/medusa-client";
import { productIsFeatured } from "@/lib/product-featured";
import { getBookVariantInfo } from "@/lib/book-variants";
import { fetchBookDetails, type BookDetails } from "@/lib/book-catalog";
import BookProfilePanel, { bookTextDir } from "@/components/store/book-profile-panel";
import RelatedBooks from "@/components/store/related-books";
import { SiteFooter } from "@/components/site-footer";

type StoreProduct = HttpTypes.StoreProduct;
type BookEditionFormat = "paper" | "digital";

const T = {
  ar: {
    crumbStore: "المتجر",
    crumbBooks: "الكتب",
    back: "العودة للكتب",
    backToStore: "العودة للمتجر",
    notFound: "لم يتم العثور على هذا الكتاب",
    by: "تأليف",
    free: "مجاني",
    addToCart: "أضف للسلة",
    inCart: "في السلة",
    added: "تمت الإضافة",
    visitStore: "المتجر الخارجي",
    new: "إصدار جديد",
    featured: "كتاب مميز",
    soon: "قريباً",
    outOfStock: "غير متوفر حالياً",
    available: "متوفر للطلب الآن",
    description: "نبذة عن الكتاب",
    details: "معلومات الكتاب",
    format: "الصيغة",
    chooseEdition: "اختر النسخة",
    paper: "ورقي",
    paperDesc: "نسخة مطبوعة تُشحن إلى عنوانك",
    digital: "رقمي (PDF)",
    digitalDesc: "قراءة فورية أونلاين أو تحميل بعد الطلب",
    notAvailable: "غير متاحة",
    selectEdition: "اختر نسخة قبل الإضافة",
    paperShipping: "* تُحسب تكلفة الشحن عند الدفع حسب المدينة",
  },
  en: {
    crumbStore: "Store",
    crumbBooks: "Books",
    back: "Back to Books",
    backToStore: "Back to Store",
    notFound: "This book was not found",
    by: "By",
    free: "Free",
    addToCart: "Add to cart",
    inCart: "In cart",
    added: "Added",
    visitStore: "External Store",
    new: "New Release",
    featured: "Featured",
    soon: "Coming Soon",
    outOfStock: "Out of Stock",
    available: "Available now",
    description: "About this book",
    details: "Book information",
    format: "Format",
    chooseEdition: "Choose edition",
    paper: "Paper",
    paperDesc: "Printed copy shipped to your address",
    digital: "Digital (PDF)",
    digitalDesc: "Read online or download right after ordering",
    notAvailable: "Not available",
    selectEdition: "Select an edition first",
    paperShipping: "* Shipping is calculated at checkout based on city",
  },
};

export default function StoreBookDetailPage() {
  const { isArabic } = useLanguage();
  const t = isArabic ? T.ar : T.en;
  const [, params] = useRoute("/services/store/books/:id");
  const id = params?.id;

  const [book, setBook] = useState<StoreProduct | null>(null);
  const [details, setDetails] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const [addError, setAddError] = useState(false);
  const cart = useCart();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    const sdk = getMedusaClient();
    getStoreRegionId()
      .then((regionId) =>
        sdk.store.product.retrieve(id, {
          region_id: regionId,
          fields:
            "+metadata,*variants,*variants.calculated_price,*variants.metadata,*variants.options,*tags,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder",
        }),
      )
      .then(({ product }) => {
        if (cancelled) return;
        setBook(product);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // A 404 is a genuine "not found"; any other failure is a load
        // failure that should surface a retry instead of "not found".
        const status = (err as { status?: number } | null)?.status;
        if (status === 404) {
          setBook(null);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDetails(null);
    fetchBookDetails(id).then((d) => !cancelled && setDetails(d)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [id]);
  const textDir = bookTextDir(details?.profile?.language);

  const meta = (book?.metadata || {}) as Record<string, unknown>;
  const title = book?.title || "";
  const description = book?.description || "";
  const externalLink = (meta.buyLink as string) || (meta.externalUrl as string) || undefined;
  const authorLine =
    details?.profile?.authors?.length
      ? details.profile.authors.join(isArabic ? "، " : ", ")
      : typeof meta.author === "string"
        ? meta.author
        : "";

  const { paperEditions, digitalEditions } = book
    ? getBookVariantInfo(book)
    : { paperEditions: [], digitalEditions: [] };
  const paperOk = paperEditions.some((e) => e.inStock);
  const digitalOk = digitalEditions.some((e) => e.inStock);

  // Selection is by exact variant id, not just "paper"/"digital" — a book
  // can have more than one edition per format (e.g. two paper tiers), and
  // each is added to the cart / ordered as its own distinct variant.
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  useEffect(() => {
    if (!book) return;
    setSelectedVariantId((prev) => {
      if (prev && [...paperEditions, ...digitalEditions].some((e) => e.variant.id === prev)) return prev;
      const firstInStock =
        [...paperEditions, ...digitalEditions].find((e) => e.inStock) ??
        paperEditions[0] ??
        digitalEditions[0];
      return firstInStock?.variant.id ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  const selectedEdition = [...paperEditions, ...digitalEditions].find(
    (e) => e.variant.id === selectedVariantId,
  );
  const selectedFormat: BookEditionFormat | null = selectedEdition?.kind ?? null;
  const activePrice = selectedEdition?.price ?? 0;
  const selectedVariant = selectedEdition?.variant;
  const inCart = selectedVariant ? !!cart.cart?.items?.some((li) => li.variant_id === selectedVariant.id) : false;
  const canBuy = !!selectedEdition && activePrice > 0 && selectedEdition.inStock;

  async function handleAddToCart() {
    if (!selectedVariant) return;
    setAddError(false);
    try {
      await cart.addItem(selectedVariant.id, 1);
    } catch {
      setAddError(true);
      return;
    }
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <div className="min-h-screen bg-[hsl(150_12%_97%)]">
      <SiteNav />

      {/* Loading skeleton */}
      {loading && (
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-[400px_1fr] gap-12">
              <div className="aspect-square rounded-3xl bg-card animate-pulse" />
              <div className="space-y-5 pt-4">
                <div className="h-4 w-24 bg-card rounded animate-pulse" />
                <div className="h-12 w-3/4 bg-card rounded animate-pulse" />
                <div className="h-6 w-1/3 bg-card rounded animate-pulse" />
                <div className="h-32 bg-card rounded-2xl animate-pulse mt-8" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load error */}
      {!loading && error && (
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md">
            <FetchError onRetry={() => setReloadKey((k) => k + 1)} />
          </div>
        </div>
      )}

      {/* Not found */}
      {!loading && !error && !book && (
        <div className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-card border border-border flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground mb-6">{t.notFound}</p>
            <Link href="/services/store/books">
              <Button variant="outline" className="gap-2">
                <ChevronLeft className={`w-4 h-4 ${isArabic ? "rotate-180" : ""}`} />
                {t.back}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Book detail */}
      {book && (
        <>
          {/* Decorative gradient backdrop */}
          <div className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none -z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent" />
            <div className="absolute -top-40 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -top-20 right-1/4 w-80 h-80 rounded-full bg-emerald-600/8 blur-3xl" />
          </div>

          <section className="relative pt-28 pb-16 px-4 bg-[hsl(150_12%_97%)]">
            <div className="container mx-auto max-w-6xl">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
                <Link href="/services/store" className="hover:text-primary transition-colors">
                  {t.crumbStore}
                </Link>
                <ChevronLeft className={`w-3.5 h-3.5 ${isArabic ? "" : "rotate-180"}`} />
                <Link href="/services/store/books" className="hover:text-primary transition-colors">
                  {t.crumbBooks}
                </Link>
                <ChevronLeft className={`w-3.5 h-3.5 ${isArabic ? "" : "rotate-180"}`} />
                <span className="text-foreground/70 truncate max-w-[40ch]">{title}</span>
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="grid lg:grid-cols-[380px_1fr] gap-12 lg:gap-16 items-start"
              >
                {/* Cover with 3D tilt */}
                <div className="relative lg:sticky lg:top-28">
                  <div className="relative group perspective-1000">
                    {/* Glow */}
                    <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-emerald-600/10 to-transparent rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

                    {/* Cover */}
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-muted/40 to-muted/10 border border-white/5 shadow-2xl shadow-black/40 transition-transform duration-700 group-hover:scale-[1.02]">
                      {book.thumbnail ? (
                        <img
                          src={book.thumbnail}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-8xl font-bold">
                          {title.charAt(0)}
                        </div>
                      )}
                      {/* Top badges */}
                      <div className="absolute top-4 inset-x-4 flex items-start justify-between gap-2 pointer-events-none">
                        {!!meta.isNewRelease && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/30 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {t.new}
                          </span>
                        )}
                        {productIsFeatured({ metadata: meta, tags: book.tags }) && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-primary/25 inline-flex items-center gap-1 ms-auto">
                            <Star className="w-3 h-3 fill-current" /> {t.featured}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reflection / shelf */}
                    <div className="absolute -bottom-1 inset-x-6 h-4 bg-gradient-to-b from-black/30 to-transparent rounded-full blur-md" />
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0">
                  {/* Title */}
                  <h1
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight tracking-tight"
                    {...textDir}
                  >
                    {title}
                  </h1>

                  {/* Author */}
                  {authorLine && (
                    <p className="text-lg text-muted-foreground mb-6">
                      <span className="text-sm uppercase tracking-wider me-2 opacity-60">
                        {t.by}
                      </span>
                      <span className="font-medium text-foreground/90">{authorLine}</span>
                    </p>
                  )}

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-8">
                    {paperOk || digitalOk ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        {t.available}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                        {t.outOfStock}
                      </span>
                    )}
                  </div>

                  {/* Purchase panel */}
                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 mb-10">
                    {/* Edition selector — every paper/digital variant the
                        product actually has, not just one of each. A book
                        can carry more than one edition per format (e.g. two
                        paper tiers); all of them must be choosable. */}
                    {(paperEditions.length > 0 || digitalEditions.length > 0) && (
                      <div className="mb-5">
                        <div className="text-xs font-semibold text-primary mb-3 uppercase tracking-[0.15em]">
                          {t.chooseEdition}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {paperEditions.map((edition) => (
                            <FormatOption
                              key={edition.variant.id}
                              id={edition.variant.id}
                              label={
                                paperEditions.length > 1 ? `${t.paper} — ${edition.label}` : t.paper
                              }
                              description={t.paperDesc}
                              price={edition.price}
                              currency="EGP"
                              available={edition.inStock}
                              disabledLabel={t.notAvailable}
                              selected={selectedVariantId === edition.variant.id}
                              onSelect={() => edition.inStock && setSelectedVariantId(edition.variant.id)}
                            />
                          ))}
                          {digitalEditions.map((edition) => (
                            <FormatOption
                              key={edition.variant.id}
                              id={edition.variant.id}
                              label={
                                digitalEditions.length > 1 ? `${t.digital} — ${edition.label}` : t.digital
                              }
                              description={t.digitalDesc}
                              price={edition.price}
                              currency="EGP"
                              available={edition.inStock}
                              disabledLabel={t.notAvailable}
                              selected={selectedVariantId === edition.variant.id}
                              onSelect={() => edition.inStock && setSelectedVariantId(edition.variant.id)}
                            />
                          ))}
                        </div>
                        {selectedFormat === "paper" && (
                          <p className="mt-3 text-xs text-muted-foreground">{t.paperShipping}</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      {canBuy && (
                        <Button
                          onClick={handleAddToCart}
                          size="lg"
                          data-testid="btn-add-to-cart"
                          className={`flex-1 gap-2 h-12 text-base font-semibold shadow-lg shadow-primary/15 ${
                            justAdded
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : inCart
                                ? "bg-primary/90 text-primary-foreground hover:bg-primary"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                        >
                          {justAdded ? (
                            <><Check className="w-5 h-5" /> {t.added}</>
                          ) : inCart ? (
                            <><ShoppingCart className="w-5 h-5" /> {t.inCart}</>
                          ) : (
                            <><ShoppingCart className="w-5 h-5" /> {t.addToCart}</>
                          )}
                        </Button>
                      )}
                      {addError && (
                        <p className="text-xs text-red-500 self-center">
                          {isArabic ? "تعذّرت إضافة المنتج إلى السلة. حاول مرة أخرى." : "Could not add this item to your cart. Please try again."}
                        </p>
                      )}
                      {externalLink && (
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => window.open(externalLink, "_blank")}
                          className="gap-2 h-12 text-base"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t.visitStore}
                        </Button>
                      )}
                    </div>

                    {/* Trust strip */}
                    <div className="mt-5 pt-5 border-t border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {isArabic ? "طلب آمن" : "Secure request"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {isArabic ? "رد سريع خلال 24 ساعة" : "Reply within 24 hours"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        {isArabic ? "دعم متعدد القنوات" : "Multi-channel support"}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {description && (
                    <div className="mb-10" {...textDir}>
                      <h2 className="text-xs font-semibold text-primary mb-3 uppercase tracking-[0.15em]">
                        {t.description}
                      </h2>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-line">
                          {description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  <div>
                    <h2 className="text-xs font-semibold text-primary mb-4 uppercase tracking-[0.15em]">
                      {t.details}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <DetailRow
                        icon={Layers}
                        label={t.format}
                        value={
                          paperOk && digitalOk
                            ? `${t.paper} + ${t.digital}`
                            : paperOk
                              ? t.paper
                              : digitalOk
                                ? t.digital
                                : t.notAvailable
                        }
                      />
                    </div>
                    {details?.profile && (
                      <BookProfilePanel profile={details.profile} categories={details.categories} isArabic={isArabic} />
                    )}
                  </div>
                </div>
              </motion.div>
              {details && <RelatedBooks productIds={details.related_product_ids} isArabic={isArabic} />}
            </div>
          </section>
        </>
      )}

      <SiteFooter />
    </div>
  );
}

function FormatOption({
  id,
  label,
  description,
  price,
  currency,
  available,
  disabledLabel,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  description: string;
  price: number;
  currency: string;
  available: boolean;
  disabledLabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!available}
      data-testid={`format-${id}`}
      className={`text-start p-4 rounded-xl border transition-all ${
        !available
          ? "border-border bg-muted/20 opacity-50 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border bg-card hover:border-primary/35"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {available ? (
          <span className="text-base font-bold text-primary whitespace-nowrap">
            {price.toLocaleString()} {currency}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {disabledLabel}
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
    </button>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-sm text-foreground font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
