import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { ImageUploadField } from "@/pages/admin/_image-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Logo {
  id: number; position: number; isActive: boolean; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string;
  logoUrl: string; websiteUrl: string; darkBackground: boolean;
}
type Draft = Omit<Logo, "id" | "position"> & { id?: number };

const emptyDraft = (): Draft => ({ isActive: true, nameAr: "", nameEn: "", descriptionAr: "", descriptionEn: "", logoUrl: "", websiteUrl: "", darkBackground: false });
const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";
/** Width / height of the logo cards on the site (w-40 h-24), so every uploaded logo is cropped to fit them. */
const LOGO_ASPECT = 5 / 3;
const API = "/api/admin/cms/client-logos";

export default function AdminClientLogos() {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { toast, show } = useToast();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = () => adminFetchJson<Logo[]>(API).then(setLogos).catch((e) => show((e as Error).message, "error"));
  useEffect(() => { void load(); }, []);

  const saveOrder = async (next: Logo[]) => {
    setLogos(next);
    const r = await adminFetch(`${API}/order`, { method: "PUT", headers: adminJsonHeaders(), body: JSON.stringify({ ids: next.map((l) => l.id) }) });
    if (!r.ok) { show("تعذّر حفظ الترتيب", "error"); void load(); }
  };
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= logos.length) return;
    void saveOrder(arrayMove(logos, i, j));
  };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = logos.findIndex((l) => l.id === e.active.id);
    const to = logos.findIndex((l) => l.id === e.over!.id);
    void saveOrder(arrayMove(logos, from, to));
  };

  const persist = async (d: Draft) => {
    const { id, ...body } = d;
    const r = await adminFetch(id ? `${API}/${id}` : API, { method: id ? "PUT" : "POST", headers: adminJsonHeaders(), body: JSON.stringify(body) });
    const res = await r.json().catch(() => ({}));
    if (!r.ok) return show(res.issues?.map((i: { message: string }) => i.message).join("، ") || res.error || "تعذّر الحفظ", "error");
    show("تم الحفظ"); setDraft(null); void load();
  };
  const toggle = (l: Logo) => persist({ ...l, isActive: !l.isActive });
  const remove = async (l: Logo) => {
    if (!window.confirm(`حذف شعار «${l.nameAr}» من قائمة العملاء؟`)) return;
    const r = await adminFetch(`${API}/${l.id}`, { method: "DELETE" });
    if (r.ok) void load(); else show("تعذّر الحذف", "error");
  };

  return (
    <div className="max-w-4xl">
      <Toast toast={toast} />
      <PageHeader
        title="عملاؤنا"
        description="العملاء الذين يظهرون في شريط «عملاؤنا» بالصفحة الرئيسية (القسم الثاني) وفي صفحة /clients. كل شعار يفتح صفحة العميل. اسحب لإعادة الترتيب، وأخفِ أي شعار دون حذفه. إن لم يوجد شعار ظاهر يختفي الشريط."
        actions={<Button type="button" className="rounded-none gap-2" onClick={() => setDraft(emptyDraft())}><Plus className="w-4 h-4" /> إضافة عميل</Button>}
      />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={logos.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {logos.map((l, i) => (
              <Row key={l.id} logo={l} index={i} total={logos.length} onMove={move} onEdit={() => setDraft({ ...l })} onToggle={() => toggle(l)} onRemove={() => remove(l)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {logos.length === 0 && <p className="text-ink-muted py-8 text-center">لا يوجد عملاء بعد.</p>}
      {draft && <LogoDialog draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={() => persist(draft)} />}
    </div>
  );
}

function Row({ logo, index, total, onMove, onEdit, onToggle, onRemove }: {
  logo: Logo; index: number; total: number; onMove: (i: number, d: number) => void; onEdit: () => void; onToggle: () => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: logo.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 bg-white border border-line p-3">
      <button type="button" {...attributes} {...listeners} aria-label="سحب لإعادة الترتيب" className="cursor-grab p-1"><GripVertical className="w-4 h-4" /></button>
      <div className={`w-20 aspect-[5/3] flex items-center justify-center overflow-hidden border border-line ${logo.darkBackground ? "bg-[#244B70]" : "bg-white"}`}>
        {logo.logoUrl ? <img src={logo.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] text-ink-muted">بلا شعار</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{logo.nameAr}</p>
        <p className="text-xs text-ink-muted truncate" dir="ltr">{logo.nameEn}{!logo.isActive && " · hidden"}</p>
      </div>
      <button type="button" aria-label="تحريك لأعلى" disabled={index === 0} onClick={() => onMove(index, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
      <button type="button" aria-label="تحريك لأسفل" disabled={index === total - 1} onClick={() => onMove(index, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={logo.isActive} onChange={onToggle} /> ظاهر</label>
      <button type="button" aria-label="تعديل" onClick={onEdit} className="p-1"><Pencil className="w-4 h-4" /></button>
      <button type="button" aria-label="حذف" onClick={onRemove} className="p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
    </li>
  );
}

function LogoDialog({ draft, onChange, onClose, onSave }: { draft: Draft; onChange: (d: Draft) => void; onClose: () => void; onSave: () => void }) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => onChange({ ...draft, [k]: v });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogTitle>{draft.id ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm">الاسم (عربي)</span><input aria-label="الاسم (عربي)" className={inputCls} value={draft.nameAr} onChange={(e) => set("nameAr", e.target.value)} /></label>
          <label className="block"><span className="text-sm">الاسم (إنجليزي)</span><input aria-label="الاسم (إنجليزي)" dir="ltr" className={inputCls} value={draft.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="text-sm">نبذة (عربي) — تظهر في صفحة العميل</span><textarea aria-label="نبذة (عربي)" rows={3} className={`${inputCls} py-2`} value={draft.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="text-sm">نبذة (إنجليزي)</span><textarea aria-label="نبذة (إنجليزي)" dir="ltr" rows={3} className={`${inputCls} py-2`} value={draft.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} /></label>
          <label className="block sm:col-span-2"><span className="text-sm">رابط الموقع (اختياري)</span><input aria-label="رابط الموقع" dir="ltr" className={inputCls} placeholder="https://" value={draft.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} /></label>
          <div className="sm:col-span-2"><span className="text-sm">الشعار</span><ImageUploadField value={draft.logoUrl} onChange={(v) => set("logoUrl", v)} folder="clients" aspect={LOGO_ASPECT} /><p className="text-xs text-ink-muted mt-1">عند رفع صورة ستُطلب منك قصّها بنسبة 5:3 لتناسب بطاقة الشعار في الموقع. الصورة المقصوصة تملأ البطاقة كاملة بلا هوامش، فاقصصها على حدود الشعار.</p></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.darkBackground} onChange={(e) => set("darkBackground", e.target.checked)} /> الشعار فاتح/أبيض (يُعرض على خلفية داكنة)</label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} /> ظاهر في الموقع</label>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-none" onClick={onClose}>إلغاء</Button>
          <Button type="button" className="rounded-none" onClick={onSave}>حفظ</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
