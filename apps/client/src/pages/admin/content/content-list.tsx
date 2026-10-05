import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson } from "@/lib/admin-api";
import type { ContentItem, ContentStatus, ContentType, ListResponse } from "@/lib/cms-types";
import { contentPath, formatDate } from "@/lib/cms-labels";
import { TYPE_CONFIG } from "@/lib/content-types";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";

export const STATUS_LABELS: Record<ContentStatus, string> = { draft: "مسودة", review: "قيد المراجعة", published: "منشور", archived: "مؤرشف" };

function ContentList({ type }: { type: ContentType }) {
  const cfg = TYPE_CONFIG[type];
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const { toast, show } = useToast();

  const load = async () => {
    const qs = new URLSearchParams({ type, pageSize: "100" });
    if (status) qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    try {
      setData(await adminFetchJson<ListResponse>(`/api/admin/cms/items?${qs}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => { void load(); }, [type, status]);

  const remove = async (item: ContentItem) => {
    if (!window.confirm(`حذف «${item.titleAr}» نهائيًا؟`)) return;
    const r = await adminFetch(`/api/admin/cms/items/${item.id}`, { method: "DELETE" });
    if (r.ok) { show("تم الحذف"); void load(); } else show("تعذّر الحذف", "error");
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title={cfg.pluralAr}
        description={`إدارة ${cfg.pluralAr}: إضافة وتعديل ونشر وأرشفة.`}
        actions={<Button asChild className="rounded-none gap-2"><Link href={`/admin/content/${type}/new`}><Plus className="w-4 h-4" /> {`${cfg.labelAr} جديد`}</Link></Button>}
      />
      <form className="flex flex-wrap gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في العناوين والملخصات" className="min-h-10 px-3 border border-line rounded flex-1 min-w-[220px]" />
        <select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-10 px-3 border border-line rounded">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Button type="submit" variant="outline" className="rounded-none">بحث</Button>
      </form>
      {error && <p className="text-destructive mb-3">{error}</p>}
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-mist text-navy">
            <tr><th className="p-3 text-start">العنوان</th><th className="p-3 text-start">الحالة</th><th className="p-3 text-start">تاريخ النشر</th><th className="p-3 text-start">إجراءات</th></tr>
          </thead>
          <tbody>
            {data?.items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="p-3 font-semibold">{item.titleAr}{item.details?.legacyDateText && <span className="ms-2 text-xs text-amber-700">(راجع الموعد: {item.details.legacyDateText})</span>}</td>
                <td className="p-3">{STATUS_LABELS[item.status]}</td>
                <td className="p-3">{formatDate(item.publishedAt, "ar")}</td>
                <td className="p-3 flex gap-1">
                  <Link href={`/admin/content/${type}/${item.id}`} aria-label="تعديل" className="p-2 hover:bg-mist rounded"><Pencil className="w-4 h-4" /></Link>
                  <a href={`${contentPath(item.type, item.slug)}?preview=1`} target="_blank" rel="noreferrer" aria-label="معاينة" className="p-2 hover:bg-mist rounded"><Eye className="w-4 h-4" /></a>
                  <button type="button" onClick={() => remove(item)} aria-label="حذف" className="p-2 hover:bg-red-50 text-destructive rounded"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-ink-muted">لا توجد عناصر.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminContentList(props: { type: ContentType }) {
  return props.type in TYPE_CONFIG ? <ContentList {...props} /> : <NotFound />;
}
