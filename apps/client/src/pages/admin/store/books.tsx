import { useState, useEffect } from "react";
import type { HttpTypes } from "@medusajs/types";
import { getMedusaAdminUrl, getMedusaClient } from "@/lib/medusa-client";
import { ExternalLink, Loader2, Search, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";

type BookCategory = "shariah" | "management" | "digital_transformation" | "other";

interface Book {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  category: BookCategory;
  currency: string | null;
  isFeatured: boolean;
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
}

const CATEGORY_LABELS: Record<BookCategory, string> = {
  shariah: "الشريعة (Shariah)",
  management: "الإدارة (Management)",
  digital_transformation: "التحول الرقمي (Digital Transformation)",
  other: "—",
};

const BOOK_CATEGORIES: BookCategory[] = [
  "shariah",
  "management",
  "digital_transformation",
];

function priceAmount(variant: HttpTypes.StoreProductVariant | undefined): string | null {
  const amount = variant?.calculated_price?.calculated_amount;
  return typeof amount === "number" ? String(amount) : null;
}

function mapMedusaProduct(
  product: HttpTypes.StoreProduct,
  fallbackCurrency?: string,
): Book {
  const meta = (product.metadata ?? {}) as Record<string, unknown>;
  const variants = product.variants ?? [];
  const paper = variants.find(
    (variant) => (variant.metadata as Record<string, unknown> | null)?.kind === "paper",
  );
  const digital = variants.find(
    (variant) => (variant.metadata as Record<string, unknown> | null)?.kind === "digital",
  );
  const priced = variants.find(
    (variant) => typeof variant.calculated_price?.calculated_amount === "number",
  );
  const rawCategory = typeof meta.category === "string" ? meta.category : "";
  const category = BOOK_CATEGORIES.includes(rawCategory as BookCategory)
    ? (rawCategory as BookCategory)
    : "other";
  const currency = (
    paper?.calculated_price?.currency_code ||
    digital?.calculated_price?.currency_code ||
    priced?.calculated_price?.currency_code ||
    fallbackCurrency ||
    "egp"
  ).toUpperCase();

  return {
    id: product.id,
    title: product.title || "",
    author: typeof meta.author === "string" ? meta.author : product.subtitle,
    coverImageUrl: product.thumbnail,
    category,
    currency,
    isFeatured: meta.isFeatured === true,
    paperAvailable: Boolean(paper) || (!digital && Boolean(priced)),
    paperPrice: priceAmount(paper) ?? (!digital ? priceAmount(priced) : null),
    digitalAvailable: Boolean(digital),
    digitalPrice: priceAmount(digital),
  };
}

export default function BooksPage() {
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { toast, show } = useToast();
  const medusaAdminUrl = getMedusaAdminUrl();

  async function load() {
    setLoading(true);
    try {
      const sdk = getMedusaClient();
      const { regions } = await sdk.store.region.list({ limit: 50 });
      const region =
        regions.find((item) => item.currency_code === "egp") ??
        regions.find((item) => item.currency_code === "eur") ??
        regions[0];
      const { products } = await sdk.store.product.list({
        limit: 100,
        region_id: region?.id,
        fields:
          "id,title,subtitle,description,thumbnail,metadata,created_at,*variants,*variants.calculated_price,*variants.metadata",
      });
      setItems(products.map((product) => mapMedusaProduct(product, region?.currency_code)));
    } catch {
      show("تعذر تحميل منتجات Medusa", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((b) => {
    if (filterCategory !== "all" && b.category !== filterCategory) return false;
    if (search && !b.title.includes(search) && !(b.author || "").includes(search)) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="الكتب"
        description={`${items.length} كتاب — الإدارة عبر Medusa`}
        actions={
          <Button asChild className="gap-2 rounded-none font-bold">
            <a href={medusaAdminUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> إدارة المتجر
            </a>
          </Button>
        }
      />

      <div className="bg-background border border-border p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          لإضافة أو تعديل أو حذف الكتب والمنتجات، استخدم لوحة Medusa.
        </p>
        <Button asChild variant="outline" className="gap-2 rounded-none shrink-0">
          <a href={medusaAdminUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Manage Store
          </a>
        </Button>
      </div>

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث..."
            className="rounded-none pr-8"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-input bg-background px-3 py-2 text-sm rounded-none"
        >
          <option value="all">كل الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">لا توجد كتب مطابقة</p>
          <Button asChild className="gap-2 rounded-none font-bold">
            <a href={medusaAdminUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> إدارة المتجر
            </a>
          </Button>
        </div>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-right p-3 font-bold">الكتاب</th>
                <th className="text-right p-3 font-bold hidden md:table-cell">الفئة</th>
                <th className="text-right p-3 font-bold hidden md:table-cell">السعر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {b.coverImageUrl ? (
                        <img
                          src={b.coverImageUrl}
                          alt=""
                          className="w-10 h-14 object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-muted flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-primary truncate flex items-center gap-1.5">
                          {b.title}
                          {b.isFeatured && (
                            <Star className="w-3 h-3 text-secondary fill-current shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {b.author || "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell">
                    {CATEGORY_LABELS[b.category]}
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell" dir="ltr">
                    <div className="flex flex-col gap-0.5">
                      {b.paperAvailable && (
                        <span>
                          Paper: {b.paperPrice || "—"} {b.currency}
                        </span>
                      )}
                      {b.digitalAvailable && (
                        <span>
                          Digital: {b.digitalPrice || "—"} {b.currency}
                        </span>
                      )}
                      {!b.paperAvailable && !b.digitalAvailable && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
