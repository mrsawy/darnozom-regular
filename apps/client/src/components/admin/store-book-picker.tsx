import { useEffect, useState } from "react";
import type { HttpTypes } from "@medusajs/types";
import { searchStoreBooks } from "@/lib/book-catalog";
import { adminFetchJson } from "@/lib/admin-api";

const timesLabel = (n: number) => (n === 0 ? "لم يُختر بعد" : n === 1 ? "اختير مرة واحدة" : n === 2 ? "اختير مرتين" : `اختير ${n} مرات`);
const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";

/** Search the bookstore (Medusa) and pick a book that was already added there. */
export function StoreBookPicker({ selectedId, onPick }: { selectedId?: string | null; onPick: (book: HttpTypes.StoreProduct) => void }) {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<HttpTypes.StoreProduct[]>([]);
  const [failed, setFailed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    adminFetchJson<{ counts: Record<string, number> }>("/api/admin/cms/book-usage").then((r) => setCounts(r.counts)).catch(() => {});
  }, [selectedId]);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      searchStoreBooks({ q: q.trim() || undefined, limit: 20 })
        .then((r) => { if (alive) { setBooks(r.products); setFailed(false); } })
        .catch(() => alive && setFailed(true));
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);
  return (
    <div className="space-y-2">
      <input aria-label="بحث في الكتب" className={inputCls} placeholder="ابحث بالعنوان أو المؤلف" value={q} onChange={(e) => setQ(e.target.value)} />
      {failed && <p className="text-sm text-destructive">تعذّر الوصول إلى متجر الكتب.</p>}
      <ul className="max-h-48 overflow-y-auto border border-line divide-y divide-line">
        {books.map((b) => (
          <li key={b.id}>
            <button type="button" onClick={() => onPick(b)} className={`w-full flex items-center justify-between gap-3 text-start px-3 py-2 hover:bg-mist ${selectedId === b.id ? "bg-mist" : ""}`}><span>{b.title ?? b.id}</span>
              <span className="text-xs text-ink-muted shrink-0" data-testid={`usage-${b.id}`}>
                {timesLabel(counts[b.id] ?? 0)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
