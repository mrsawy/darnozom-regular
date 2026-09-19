import { Link } from "wouter";
import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Truck,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart-context";
import { useLanguage } from "@/lib/language-context";

const COPY = {
  ar: {
    title: "سلة التسوق",
    empty: "سلتك فارغة حالياً",
    emptyDesc: "تصفح المتجر وأضف منتجاتك المفضلة إلى السلة.",
    browseStore: "تصفح المتجر",
    item: "المنتج",
    qty: "الكمية",
    price: "السعر",
    subtotal: "الإجمالي",
    remove: "حذف",
    summary: "ملخص الطلب",
    itemsCount: "عدد العناصر",
    total: "الإجمالي",
    checkout: "إتمام الطلب",
    continueShopping: "متابعة التسوق",
    types: { book: "كتاب", course: "دورة", app: "تطبيق" } as Record<string, string>,
    formats: { paper: "ورقي", digital: "رقمي PDF" } as Record<string, string>,
    shippingTitle: "حساب الشحن",
    shippingCityLabel: "المدينة",
    shippingCityPh: "مثال: الرياض",
    shippingItems: "الشحن",
    shippingDefault: "تعرفة افتراضية",
    shippingNotFound: "لم يتم العثور على المدينة. ستُحسب تعرفة افتراضية.",
    shippingLookupErr: "تعذر حساب الشحن، حاول لاحقاً.",
    shippingUnavailable: "خدمة الشحن غير متاحة حالياً، يرجى التواصل معنا.",
    grandTotal: "الإجمالي مع الشحن",
  },
  en: {
    title: "Shopping Cart",
    empty: "Your cart is empty",
    emptyDesc: "Browse the store and add your favorite products to your cart.",
    browseStore: "Browse the store",
    item: "Product",
    qty: "Qty",
    price: "Price",
    subtotal: "Subtotal",
    remove: "Remove",
    summary: "Order summary",
    itemsCount: "Items",
    total: "Total",
    checkout: "Checkout",
    continueShopping: "Continue shopping",
    types: { book: "Book", course: "Course", app: "App" } as Record<string, string>,
    formats: { paper: "Paper", digital: "Digital PDF" } as Record<string, string>,
    shippingTitle: "Shipping estimate",
    shippingCityLabel: "City",
    shippingCityPh: "e.g. Riyadh",
    shippingItems: "Shipping",
    shippingDefault: "Default rate",
    shippingNotFound: "City not found. A default rate will apply.",
    shippingLookupErr: "Couldn't fetch shipping, try again.",
    shippingUnavailable: "Shipping is currently unavailable. Please contact us.",
    grandTotal: "Total with shipping",
  },
};

type ShippingPreview =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; amount: number; matched: boolean; city: string }
  | { state: "error"; message: string };

export default function CartPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  const { items, count, total, currency, removeItem, updateQuantity, hasPaperItems } = useCart();
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  // Cart-side shipping preview: lets the customer see the shipping cost
  // (and therefore the grand total) before clicking checkout. Only relevant
  // when the cart contains at least one paper item.
  const [city, setCity] = useState("");
  const [shipping, setShipping] = useState<ShippingPreview>({ state: "idle" });

  useEffect(() => {
    if (!hasPaperItems) {
      setShipping({ state: "idle" });
      return;
    }
    const trimmed = city.trim();
    if (!trimmed) {
      setShipping({ state: "idle" });
      return;
    }
    setShipping({ state: "loading" });
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/shipping-rates/lookup?city=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data: {
          matched: boolean;
          rate: { price: string | number; city: string } | null;
        } = await res.json();
        if (!data.rate) {
          setShipping({ state: "error", message: t.shippingUnavailable });
          return;
        }
        setShipping({
          state: "ok",
          amount: Number(data.rate.price) || 0,
          matched: !!data.matched,
          city: data.rate.city,
        });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setShipping({ state: "error", message: t.shippingLookupErr });
      }
    }, 350);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [city, hasPaperItems, t.shippingLookupErr]);

  const shippingAmount = shipping.state === "ok" ? shipping.amount : 0;
  const grandTotal = total + shippingAmount;

  return (
    <div className="min-h-screen bg-background" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <div className="bg-primary text-primary-foreground py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-7 h-7 text-secondary" />
            <h1 className="text-3xl md:text-4xl font-black">{t.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        {items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border bg-card">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">{t.empty}</h2>
            <p className="text-muted-foreground mb-6">{t.emptyDesc}</p>
            <Link href="/services/store">
              <Button className="rounded-none gap-2">
                {t.browseStore}
                <Arrow className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items list */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-secondary/20 shadow-[0_12px_40px_rgba(15,61,46,0.06)]">
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-secondary/15 bg-secondary/[0.04]">
                  <div>{t.item}</div>
                  <div className="text-center w-32">{t.qty}</div>
                  <div className="text-end w-28">{t.subtotal}</div>
                  <div className="w-10" />
                </div>

                {items.map((it) => {
                  const lineTotal = it.unitPrice * it.quantity;
                  return (
                    <div
                      key={it.lineItemId}
                      className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 border-b border-border last:border-b-0 items-center"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-16 h-16 shrink-0 bg-muted/40 border border-border overflow-hidden">
                          {it.thumbnail ? (
                            <img
                              src={it.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-xl font-bold">
                              {it.title.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-secondary mb-0.5 flex items-center gap-2 flex-wrap">
                            <span>{t.types[it.type]}</span>
                            {it.format && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/20 text-secondary uppercase tracking-wide">
                                {t.formats[it.format]}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-primary line-clamp-2">{it.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {it.unitPrice.toFixed(2)} {currency}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-1 border border-border w-32 mx-auto md:mx-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.lineItemId, it.quantity - 1)}
                          disabled={it.quantity <= 1}
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted/60 disabled:opacity-40"
                          aria-label="-"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={it.quantity}
                          onChange={(e) =>
                            updateQuantity(it.lineItemId, Number(e.target.value))
                          }
                          className="w-12 h-8 text-center text-sm font-bold bg-transparent border-0 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.lineItemId, it.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-muted/60"
                          aria-label="+"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-end w-28 font-bold text-primary">
                        {lineTotal.toFixed(2)} {currency}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(it.lineItemId)}
                        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors mx-auto md:mx-0"
                        aria-label={t.remove}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <Link href="/services/store">
                  <Button variant="outline" size="sm" className="rounded-none gap-2">
                    <Arrow className="w-3.5 h-3.5 rotate-180" />
                    {t.continueShopping}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Summary */}
            <aside className="lg:col-span-1">
              <div className="bg-card border border-border p-6 sticky top-24">
                <h2 className="text-lg font-black text-primary mb-4">{t.summary}</h2>
                <div className="space-y-2 text-sm border-b border-border pb-4 mb-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t.itemsCount}</span>
                    <span className="font-bold text-primary">{count}</span>
                  </div>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-bold text-primary">{t.subtotal}</span>
                  <span className="text-lg font-bold text-primary">
                    {total.toFixed(2)}{" "}
                    <span className="text-xs font-bold text-muted-foreground">{currency}</span>
                  </span>
                </div>
                {hasPaperItems && (
                  <div className="mt-4 mb-4 border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-secondary" />
                      <span className="text-sm font-bold text-primary">{t.shippingTitle}</span>
                    </div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">
                      {t.shippingCityLabel}
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.shippingCityPh}
                      className="rounded-none h-9 mb-2"
                    />
                    {shipping.state === "loading" && (
                      <p className="text-[11px] text-muted-foreground">…</p>
                    )}
                    {shipping.state === "ok" && (
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="text-muted-foreground">
                          {t.shippingItems}
                          {!shipping.matched && (
                            <span className="ms-1 text-[10px] text-muted-foreground">
                              ({t.shippingDefault})
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-primary">
                          {shipping.amount.toFixed(2)}{" "}
                          <span className="text-xs text-muted-foreground">{currency}</span>
                        </span>
                      </div>
                    )}
                    {shipping.state === "ok" && !shipping.matched && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t.shippingNotFound}
                      </p>
                    )}
                    {shipping.state === "error" && (
                      <p className="text-[11px] text-destructive">{shipping.message}</p>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-baseline mb-4 border-t border-border pt-4">
                  <span className="text-sm font-bold text-primary">
                    {hasPaperItems && shipping.state === "ok" ? t.grandTotal : t.total}
                  </span>
                  <span className="text-2xl font-black text-secondary">
                    {grandTotal.toFixed(2)}{" "}
                    <span className="text-sm font-bold text-primary">{currency}</span>
                  </span>
                </div>
                <Link href="/checkout">
                  <Button className="w-full rounded-none gap-2 h-11">
                    {t.checkout}
                    <Arrow className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
