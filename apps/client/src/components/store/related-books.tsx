import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import ProductCard from "@/components/store/product-card";
import { listProductsByIds } from "@/lib/book-catalog";
import { getBookVariantInfo } from "@/lib/book-variants";

export default function RelatedBooks({ productIds, isArabic }: { productIds: string[]; isArabic: boolean }) {
  const [products, setProducts] = useState<HttpTypes.StoreProduct[]>([]);
  useEffect(() => {
    let cancelled = false;
    listProductsByIds(productIds).then((p) => !cancelled && setProducts(p)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [productIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!products.length) return null;
  return (
    <section className="mt-12">
      <h2 className="text-xl font-black text-primary mb-4">{isArabic ? "كتب ذات صلة" : "Related books"}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => {
          const info = getBookVariantInfo(p);
          const prices = [...info.paperEditions, ...info.digitalEditions].filter((e) => e.inStock).map((e) => e.price);
          const meta = (p.metadata ?? {}) as Record<string, unknown>;
          return (
            <ProductCard
              key={p.id}
              item={{
                id: p.id,
                type: "book",
                title: p.title ?? "",
                subtitle: (meta.author as string) || undefined,
                imageUrl: p.thumbnail,
                price: prices.length ? String(Math.min(...prices)) : null,
                currency: "EGP",
                detailUrl: `/services/store/books/${p.id}`,
                paperAvailable: info.paperEditions.some((e) => e.inStock),
                digitalAvailable: info.digitalEditions.some((e) => e.inStock),
                pricePrefix: prices.length > 1 ? (isArabic ? "يبدأ من" : "from") : null,
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
