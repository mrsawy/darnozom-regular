import { useState, useEffect } from "react";
import type { HttpTypes } from "@medusajs/types";
import { getMedusaAdminUrl } from "@/lib/medusa-client";
import { listStoreBooks } from "@/lib/list-store-books";
import { listBookCategoryTree, type CategoryTreeNode } from "@/lib/book-catalog";
import { ExternalLink, Loader2, Search, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";

interface Book {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  categoryIds: string[];
  currency: string | null;
  isFeatured: boolean;
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
}

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
  const categoryIds = (product.categories ?? []).map((c) => c.id);
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
    categoryIds,
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
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { toast, show } = useToast();
  const medusaAdminUrl = getMedusaAdminUrl();

  async function load() {
    setLoading(true);
    try {
      const products = await listStoreBooks({ limit: 100 });
      setItems(products.map((product) => mapMedusaProduct(product)));
    } catch {
      show("تعذر تحميل منتجات Medusa", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    listBookCategoryTree().then(setTree).catch(() => setTree([]));
  }, []);

  const flat = tree.flatMap((s) => [
    { id: s.id, label: s.nameAr ?? s.name, sectionId: s.id },
    ...s.children.map((c) => ({ id: c.id, label: `${s.nameAr ?? s.name} › ${c.nameAr ?? c.name}`, sectionId: s.id })),
  ]);
  const labelOf = (b: Book) => flat.filter((f) => b.categoryIds.includes(f.id)).map((f) => f.label).join("، ") || "—";
  const inCategory = (b: Book, id: string) =>
    b.categoryIds.some((cid) => cid === id || flat.find((f) => f.id === cid)?.sectionId === id);

  const filtered = items.filter((b) => {
    if (filterCategory !== "all" && !inCategory(b, filterCategory)) return false;
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
          {flat.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
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
                    {labelOf(b)}
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
