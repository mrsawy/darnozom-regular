import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import { resetAreasCache, type ContentAreaRow } from "@/lib/cms-areas";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Draft = { id?: number; slug: string; labelAr: string; labelEn: string; isActive: boolean };
const empty = (): Draft => ({ slug: "", labelAr: "", labelEn: "", isActive: true });
const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";

export default function AdminContentAreas() {
  const [areas, setAreas] = useState<ContentAreaRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { toast, show } = useToast();

  const load = () =>
    adminFetchJson<ContentAreaRow[]>("/api/admin/cms/areas").then(setAreas).catch((e) => show((e as Error).message, "error"));
  useEffect(() => { void load(); }, []);

  const failure = async (r: Response, fallback: string) => {
    const res = await r.json().catch(() => ({}));
    show(res.issues?.map((i: { message: string }) => i.message).join("، ") || res.error || fallback, "error");
  };

  const save = async (d: Draft) => {
    const { id, slug, ...rest } = d;
    const r = await adminFetch(id ? `/api/admin/cms/areas/${id}` : "/api/admin/cms/areas", {
      method: id ? "PUT" : "POST", headers: adminJsonHeaders(), body: JSON.stringify(id ? rest : { slug, ...rest }),
    });
    if (!r.ok) return failure(r, "تعذّر الحفظ");
    resetAreasCache(); show("تم الحفظ"); setDraft(null); void load();
  };

  const move = async (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= areas.length) return;
    const next = [...areas];
    [next[i], next[j]] = [next[j], next[i]];
    setAreas(next);
    const r = await adminFetch("/api/admin/cms/areas/order", { method: "PUT", headers: adminJsonHeaders(), body: JSON.stringify({ ids: next.map((a) => a.id) }) });
    if (!r.ok) { show("تعذّر حفظ الترتيب", "error"); void load(); } else resetAreasCache();
  };

  const toggle = (a: ContentAreaRow) => save({ id: a.id, slug: a.slug, labelAr: a.labelAr, labelEn: a.labelEn, isActive: !a.isActive });

  const remove = async (a: ContentAreaRow) => {
    if (!window.confirm(`حذف المجال «${a.labelAr}»؟`)) return;
    const r = await adminFetch(`/api/admin/cms/areas/${a.id}`, { method: "DELETE" });
    if (r.ok) { resetAreasCache(); show("تم الحذف"); void load(); } else void failure(r, "تعذّر الحذف");
  };

  return (
    <div className="max-w-3xl">
      <Toast toast={toast} />
      <PageHeader
        title="المجالات"
        description="مجالات المحتوى التي تظهر في فلاتر الموقع وفي محرر المحتوى. المجال المستخدم لا يُحذف — عطّله بدلًا من ذلك."
        actions={<Button type="button" className="rounded-none gap-2" onClick={() => setDraft(empty())}><Plus className="w-4 h-4" /> مجال جديد</Button>}
      />
      <ol className="space-y-2">
        {areas.map((a, i) => (
          <li key={a.id} className="flex items-center gap-3 bg-white border border-line p-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{a.labelAr}</p>
              <p className="text-xs text-ink-muted truncate"><span dir="ltr">{a.labelEn || "—"}</span> · <span dir="ltr" className="font-mono">{a.slug}</span>{!a.isActive && " · معطّل"}</p>
            </div>
            <button type="button" aria-label="تحريك لأعلى" disabled={i === 0} onClick={() => void move(i, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
            <button type="button" aria-label="تحريك لأسفل" disabled={i === areas.length - 1} onClick={() => void move(i, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={a.isActive} onChange={() => void toggle(a)} /> مفعّل</label>
            <button type="button" aria-label="تعديل" onClick={() => setDraft({ id: a.id, slug: a.slug, labelAr: a.labelAr, labelEn: a.labelEn, isActive: a.isActive })} className="p-1"><Pencil className="w-4 h-4" /></button>
            <button type="button" aria-label="حذف" onClick={() => void remove(a)} className="p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ol>
      {areas.length === 0 && <p className="text-ink-muted py-8 text-center">لا توجد مجالات بعد.</p>}
      {draft && (
        <Dialog open onOpenChange={(o) => !o && setDraft(null)}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogTitle>{draft.id ? "تعديل مجال" : "مجال جديد"}</DialogTitle>
            <label className="block">
              <span className="text-sm font-semibold">الاسم بالعربية</span>
              <input aria-label="الاسم بالعربية" className={inputCls} value={draft.labelAr} onChange={(e) => setDraft({ ...draft, labelAr: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">الاسم بالإنجليزية</span>
              <input aria-label="الاسم بالإنجليزية" dir="ltr" className={inputCls} value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">المعرّف (slug){draft.id && " — لا يمكن تغييره"}</span>
              <input aria-label="المعرّف" dir="ltr" className={inputCls} value={draft.slug} disabled={!!draft.id} placeholder="e.g. economy_finance" onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> <span className="text-sm">مفعّل (يظهر في الفلاتر والمحرر)</span></label>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" className="rounded-none" onClick={() => setDraft(null)}>إلغاء</Button>
              <Button type="button" className="rounded-none" onClick={() => void save(draft)}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
