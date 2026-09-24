import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ShoppingCart, ExternalLink, Star, Plus, Check, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";

export interface ProductCardItem {
  id: string;
  type: "book" | "course" | "app";
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  currency?: string | null;
  badge?: string | null;
  isFeatured?: boolean;
  isNewRelease?: boolean;
  externalUrl?: string | null;
  detailUrl?: string | null;
  /** For books: which format(s) are available. */
  paperAvailable?: boolean;
  digitalAvailable?: boolean;
  /** When the book has a single format, the price for that format. */
  singleFormatPrice?: number | null;
  /** "starting from" prefix when multiple formats with different prices exist. */
  pricePrefix?: string | null;
  /** Medusa variant id to buy directly from the card (single-format items only). */
  variantId?: string | null;
  /** Whether this item is already in the cart (best-effort, by variant id). */
  inCart?: boolean;
}

interface Props {
  item: ProductCardItem;
}

export default function ProductCard({ item }: Props) {
  const { isArabic } = useLanguage();
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const tFree = isArabic ? "مجاني" : "Free";
  const tNew = isArabic ? "جديد" : "New";
  const tFeatured = isArabic ? "مميز" : "Featured";
  const tAdd = isArabic ? "أضف للسلة" : "Add to cart";
  const tInCart = isArabic ? "في السلة" : "In cart";
  const tAdded = isArabic ? "تمت الإضافة" : "Added";

  // Parse the price string ("50.00", "50 SAR", etc) into a clean number.
  const numericPrice = (() => {
    if (item.singleFormatPrice && item.singleFormatPrice > 0) return item.singleFormatPrice;
    if (!item.price) return 0;
    const cleaned = String(item.price).replace(/[^\d.]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  })();
  // Books with multiple available formats need an explicit choice on the
  // detail page; the card only links there instead of adding directly.
  const isMultiFormatBook =
    item.type === "book" && !!item.paperAvailable && !!item.digitalAvailable;
  const canBuyNow = !isMultiFormatBook && numericPrice > 0 && !!item.variantId;
  const inCart = !!item.inCart;

  async function handleAddToCart() {
    if (!item.variantId) return;
    try {
      await cart.addItem(item.variantId, 1);
    } catch {
      const msg = isArabic
        ? "تعذّرت إضافة المنتج إلى السلة. حاول مرة أخرى."
        : "Could not add this item to your cart. Please try again.";
      window.alert(msg);
      return;
    }
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col"
    >
      <CoverWrap detailUrl={item.detailUrl}>
        <div className="relative aspect-[4/3] bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-5xl font-bold">
              {item.title.charAt(0)}
            </div>
          )}
          <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
            {item.isNewRelease && (
              <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                {tNew}
              </span>
            )}
            {item.isFeatured && (
              <span className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 ms-auto">
                <Star className="w-2.5 h-2.5 fill-current" /> {tFeatured}
              </span>
            )}
          </div>
        </div>
      </CoverWrap>

      <div className="p-4 flex flex-col flex-1">
        {item.badge && (
          <div className="text-xs text-primary mb-1">{item.badge}</div>
        )}
        {item.detailUrl ? (
          <Link href={item.detailUrl}>
            <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-2 mb-1 hover:text-primary cursor-pointer transition-colors">
              {item.title}
            </h3>
          </Link>
        ) : (
          <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-2 mb-1">
            {item.title}
          </h3>
        )}
        {item.subtitle && (
          <div className="text-sm text-muted-foreground mb-2 line-clamp-1">{item.subtitle}</div>
        )}
        {item.description && (
          <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-3">{item.description}</p>
        )}

        {item.type === "book" && (item.paperAvailable || item.digitalAvailable) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {item.paperAvailable && (
              <span
                data-testid="card-edition-paper"
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 border border-primary/30 bg-primary/5 text-primary"
              >
                <BookOpen className="w-3 h-3" aria-hidden />
                {isArabic ? "نسخة ورقية" : "Paper"}
              </span>
            )}
            {item.digitalAvailable && (
              <span
                data-testid="card-edition-digital"
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 border border-secondary/40 bg-secondary/10 text-secondary"
              >
                <Download className="w-3 h-3" aria-hidden />
                {isArabic ? "نسخة رقمية" : "Digital"}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="text-sm font-bold text-primary">
            {item.price ? (
              <>
                {item.pricePrefix && (
                  <span className="text-[10px] text-muted-foreground font-normal me-1">
                    {item.pricePrefix}
                  </span>
                )}
                {item.price} {item.currency || "EGP"}
              </>
            ) : (
              <span className="text-muted-foreground font-medium">{tFree}</span>
            )}
          </div>
          <div className="flex gap-2">
            {item.externalUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(item.externalUrl!, "_blank")}
                className="h-8 px-2"
                title="External link"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
            {isMultiFormatBook && item.detailUrl && (
              <Link href={item.detailUrl}>
                <Button
                  size="sm"
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="btn-view-options"
                >
                  {isArabic ? "اختر النسخة" : "Choose edition"}
                </Button>
              </Link>
            )}
            {canBuyNow && (
              <Button
                size="sm"
                onClick={handleAddToCart}
                title={inCart ? tInCart : tAdd}
                className={`h-8 ${
                  justAdded
                    ? "bg-emerald-600 text-white hover:bg-emerald-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 me-1" /> {tAdded}
                  </>
                ) : inCart ? (
                  <>
                    <Plus className="w-3.5 h-3.5 me-1" /> {tInCart}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5 me-1" /> {tAdd}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CoverWrap({ detailUrl, children }: { detailUrl?: string | null; children: React.ReactNode }) {
  if (detailUrl) {
    return (
      <Link href={detailUrl} className="block cursor-pointer">
        {children}
      </Link>
    );
  }
  return <>{children}</>;
}
