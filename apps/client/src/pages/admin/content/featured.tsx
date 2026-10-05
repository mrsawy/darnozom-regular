import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import { searchStoreBooks } from "@/lib/book-catalog";
import type { ContentItem, ListResponse } from "@/lib/cms-types";
import { TYPE_CONFIG } from "@/lib/content-types";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { ImageUploadField } from "@/pages/admin/_image-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Source = "content" | "book" | "custom";
interface Slide {
  id: number; position: number; isActive: boolean; sourceKind: Source;
  contentItemId: number | null; medusaProductId: string | null;
  badgeAr: string; badgeEn: string; titleAr: string; titleEn: string; summaryAr: string; summaryEn: string;
  imageUrl: string; ctaLabelAr: string; ctaLabelEn: string; href: string;
  linkedTitleAr: string | null; linkedStatus: string | null;
}
type Draft = Omit<Slide, "id" | "position" | "linkedTitleAr" | "linkedStatus"> & { id?: number; pickedLabel?: string };

const emptyDraft = (): Draft => ({
  isActive: true, sourceKind: "content", contentItemId: null, medusaProductId: null,
  badgeAr: "", badgeEn: "", titleAr: "", titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "", ctaLabelAr: "", ctaLabelEn: "", href: "",
});
const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";
const SOURCE_LABELS: Record<Source, string> = { content: "محتوى من الموقع", book: "كتاب من المتجر", custom: "بطاقة مخصصة" };

export default function AdminFeatured() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { toast, show } = useToast();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = () => adminFetchJson<Slide[]>("/api/admin/cms/featured").then(setSlides).catch((e) => show((e as Error).message, "error"));
  useEffect(() => { void load(); }, []);

  const saveOrder = async (next: Slide[]) => {
    setSlides(next);
    const r = await adminFetch("/api/admin/cms/featured/order", { method: "PUT", headers: adminJsonHeaders(), body: JSON.stringify({ ids: next.map((s) => s.id) }) });
    if (!r.ok) { show("تعذّر حفظ الترتيب", "error"); void load(); }
  };
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= slides.length) return;
    void saveOrder(arrayMove(slides, i, j));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = slides.findIndex((s) => s.id === e.active.id);
    const to = slides.findIndex((s) => s.id === e.over!.id);
    void saveOrder(arrayMove(slides, from, to));
  };

  const persist = async (d: Draft) => {
    const { id, pickedLabel: _p, ...body } = d;
    const r = await adminFetch(id ? `/api/admin/cms/featured/${id}` : "/api/admin/cms/featured", {
      method: id ? "PUT" : "POST", headers: adminJsonHeaders(), body: JSON.stringify(body),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) return show(res.issues?.map((i: { message: string }) => i.message).join("، ") || res.error || "تعذّر الحفظ", "error");
    show("تم الحفظ"); setDraft(null); void load();
  };
  const toggle = (s: Slide) => persist({ ...s, isActive: !s.isActive });
  const remove = async (s: Slide) => {
    if (!window.confirm("حذف هذه البطاقة من المختارات؟")) return;
    const r = await adminFetch(`/api/admin/cms/featured/${s.id}`, { method: "DELETE" });
    if (r.ok) void load(); else show("تعذّر الحذف", "error");
  };

  return (
    <div className="max-w-4xl">
      <Toast toast={toast} />
      <PageHeader
        title="مختارات الرئيسية"
        description="البطاقة الأولى تظهر كبيرة، وتليها ثلاث بطاقات جانبية. يُنصح بأربع إلى ست بطاقات. اسحب لإعادة الترتيب."
        actions={<Button type="button" className="rounded-none gap-2" onClick={() => setDraft(emptyDraft())}><Plus className="w-4 h-4" /> إضافة بطاقة</Button>}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {slides.map((s, i) => (
              <SortableRow key={s.id} slide={s} index={i} total={slides.length} onMove={move} onEdit={() => setDraft({ ...s })} onToggle={() => toggle(s)} onRemove={() => remove(s)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {slides.length === 0 && <p className="text-ink-muted py-8 text-center">لا توجد بطاقات بعد.</p>}
      {draft && <SlideDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={() => persist(draft)} />}
    </div>
  );
}

function SortableRow({ slide, index, total, onMove, onEdit, onToggle, onRemove }: {
  slide: Slide; index: number; total: number; onMove: (i: number, d: number) => void; onEdit: () => void; onToggle: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id });
  const title = slide.titleAr || slide.linkedTitleAr || slide.medusaProductId || "—";
  const warn = slide.sourceKind === "content" && slide.linkedStatus !== "published";
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-3 bg-white border p-3 ${index === 0 ? "border-gold" : "border-line"}`}>
      <button type="button" {...attributes} {...listeners} aria-label="سحب لإعادة الترتيب" className="cursor-grab p-1"><GripVertical className="w-4 h-4" /></button>
      {slide.imageUrl && <img src={slide.imageUrl} alt="" className="w-16 h-10 object-cover" />}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        <p className="text-xs text-ink-muted">
          {SOURCE_LABELS[slide.sourceKind]}{index === 0 && " · البطاقة الكبيرة"}{!slide.isActive && " · مخفية"}
          {warn && <span className="text-amber-700"> · المحتوى المرتبط غير منشور، فلن تظهر البطاقة</span>}
        </p>
      </div>
      <button type="button" aria-label="تحريك لأعلى" disabled={index === 0} onClick={() => onMove(index, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
      <button type="button" aria-label="تحريك لأسفل" disabled={index === total - 1} onClick={() => onMove(index, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={slide.isActive} onChange={onToggle} /> ظاهرة</label>
      <button type="button" aria-label="تعديل" onClick={onEdit} className="p-1"><Pencil className="w-4 h-4" /></button>
      <button type="button" aria-label="حذف" onClick={onRemove} className="p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
    </li>
  );
}

function SlideDialog({ draft, onChange, onClose, onSave }: { draft: Draft; onChange: (d: Draft) => void; onClose: () => void; onSave: () => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...draft, [k]: v });
  const custom = draft.sourceKind === "custom";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogTitle>{draft.id ? "تعديل بطاقة" : "إضافة بطاقة"}</DialogTitle>
        <div role="tablist" className="flex gap-2 border-b border-line">
          {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={draft.sourceKind === s} onClick={() => onChange({ ...draft, sourceKind: s, contentItemId: null, medusaProductId: null, pickedLabel: undefined })} className={`px-3 min-h-10 border-b-2 ${draft.sourceKind === s ? "border-gold text-navy font-semibold" : "border-transparent"}`}>
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
        {draft.sourceKind === "content" && <ContentPicker draft={draft} onPick={(id, label) => onChange({ ...draft, contentItemId: id, pickedLabel: label })} />}
        {draft.sourceKind === "book" && <BookPicker draft={draft} onPick={(id, label) => onChange({ ...draft, medusaProductId: id, pickedLabel: label })} />}
        <p className="text-xs text-ink-muted">{custom ? "كل الحقول التالية مطلوبة للبطاقة المخصصة (العنوان والرابط والصورة على الأقل)." : "اترك الحقول التالية فارغة لاستخدام بيانات المادة المرتبطة، أو املأها لتجاوزها."}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["badgeAr", "الشارة (عربي)"], ["badgeEn", "الشارة (إنجليزي)"], ["titleAr", "العنوان (عربي)"], ["titleEn", "العنوان (إنجليزي)"], ["ctaLabelAr", "نص الزر (عربي)"], ["ctaLabelEn", "نص الزر (إنجليزي)"]] as const).map(([k, label]) => (
            <label key={k} className="block"><span className="text-sm">{label}</span><input aria-label={label} className={inputCls} value={draft[k]} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
          {([["summaryAr", "الملخص (عربي)"], ["summaryEn", "الملخص (إنجليزي)"]] as const).map(([k, label]) => (
            <label key={k} className="block sm:col-span-2"><span className="text-sm">{label}</span><textarea aria-label={label} rows={2} className={`${inputCls} py-2`} value={draft[k]} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
          <label className="block sm:col-span-2"><span className="text-sm">الرابط</span><input aria-label="الرابط" dir="ltr" className={inputCls} value={draft.href} placeholder="/academy" onChange={(e) => set("href", e.target.value)} /></label>
          <div className="sm:col-span-2"><span className="text-sm">الصورة</span><ImageUploadField value={draft.imageUrl} onChange={(v) => set("imageUrl", v)} folder="featured" /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-none" onClick={onClose}>إلغاء</Button>
          <Button type="button" className="rounded-none" onClick={onSave}>حفظ البطاقة</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentPicker({ draft, onPick }: { draft: Draft; onPick: (id: number, label: string) => void }) {
  const [type, setType] = useState<keyof typeof TYPE_CONFIG>("study");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ContentItem[]>([]);
  useEffect(() => {
    const qs = new URLSearchParams({ type, status: "published", pageSize: "20" });
    if (q.trim()) qs.set("q", q.trim());
    const ctrl = new AbortController();
    adminFetch(`/api/admin/cms/items?${qs}`, { signal: ctrl.signal }).then((r) => r.json()).then((d: ListResponse) => setItems(d.items ?? [])).catch(() => {});
    return () => ctrl.abort();
  }, [type, q]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select aria-label="نوع المحتوى" className={inputCls} value={type} onChange={(e) => setType(e.target.value as keyof typeof TYPE_CONFIG)}>
          {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.pluralAr}</option>)}
        </select>
        <input aria-label="بحث في المحتوى" className={inputCls} placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {draft.contentItemId && <p className="text-sm">المختار: <strong>{draft.pickedLabel ?? `#${draft.contentItemId}`}</strong></p>}
      <ul className="max-h-48 overflow-y-auto border border-line divide-y divide-line">
        {items.map((i) => (
          <li key={i.id}><button type="button" onClick={() => onPick(i.id, i.titleAr)} className={`w-full text-start px-3 py-2 hover:bg-mist ${draft.contentItemId === i.id ? "bg-mist" : ""}`}>{i.titleAr}</button></li>
        ))}
        {items.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">لا يوجد محتوى منشور مطابق.</li>}
      </ul>
    </div>
  );
}

function BookPicker({ draft, onPick }: { draft: Draft; onPick: (id: string, label: string) => void }) {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<{ id: string; title: string }[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      searchStoreBooks({ q: q.trim() || undefined, limit: 20 })
        .then((r) => alive && (setBooks(r.products.map((p) => ({ id: p.id, title: p.title ?? p.id }))), setFailed(false)))
        .catch(() => alive && setFailed(true));
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);
  return (
    <div className="space-y-2">
      <input aria-label="بحث في الكتب" className={inputCls} placeholder="ابحث بالعنوان أو المؤلف" value={q} onChange={(e) => setQ(e.target.value)} />
      {draft.medusaProductId && <p className="text-sm">المختار: <strong>{draft.pickedLabel ?? draft.medusaProductId}</strong></p>}
      {failed && <p className="text-sm text-destructive">تعذّر الوصول إلى متجر الكتب.</p>}
      <ul className="max-h-48 overflow-y-auto border border-line divide-y divide-line">
        {books.map((b) => (
          <li key={b.id}><button type="button" onClick={() => onPick(b.id, b.title)} className={`w-full text-start px-3 py-2 hover:bg-mist ${draft.medusaProductId === b.id ? "bg-mist" : ""}`}>{b.title}</button></li>
        ))}
      </ul>
    </div>
  );
}
