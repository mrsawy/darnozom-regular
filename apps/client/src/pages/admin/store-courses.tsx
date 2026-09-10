import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Plus, Edit2, Trash2, Save, X, Loader2, Star, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoreCourse } from "@/lib/store-types";
import { PageHeader, Toast, useToast } from "./layout";
import { ImageUploadField } from "./_image-upload";

const API_BASE = "/api";

export default function StoreCoursesPage() {
  const [items, setItems] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<StoreCourse> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDelivery, setFilterDelivery] = useState("all");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/store/courses`);
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.titleAr) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const r = await adminFetch(isNew ? `${API_BASE}/store/courses` : `${API_BASE}/store/courses/${editing.id}`, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!r.ok) { show("فشل الحفظ", "error"); return; }
      show(isNew ? "تمت الإضافة" : "تم التحديث");
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  }

  async function del(id: number) {
    if (!confirm("حذف الدورة؟")) return;
    const r = await adminFetch(`${API_BASE}/store/courses/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { show("تم الحذف"); load(); } else show("فشل الحذف", "error");
  }

  const filtered = items.filter(c => {
    if (filterDelivery !== "all" && c.delivery !== filterDelivery) return false;
    if (search && !c.titleAr.includes(search) && !(c.titleEn || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="دورات المتجر" description={`${items.length} دورة`} actions={
        <Button onClick={() => setEditing({ titleAr: "", delivery: "online_self", level: "all_levels", language: "ar", status: "available", currency: "SAR" })} className="gap-2 rounded-none font-bold">
          <Plus size={16} /> دورة جديدة
        </Button>
      } />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="rounded-none flex-1 min-w-[200px]" />
        <select value={filterDelivery} onChange={e => setFilterDelivery(e.target.value)} className="border border-input bg-background px-3 py-2 text-sm rounded-none">
          <option value="all">كل أنواع التقديم</option>
          <option value="online_self">أونلاين ذاتي</option>
          <option value="online_live">أونلاين مباشر</option>
          <option value="onsite">حضوري</option>
          <option value="hybrid">هجين</option>
        </select>
      </div>

      {editing && <CourseForm value={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} saving={saving} />}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد دورات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-background border border-border p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-primary flex items-center gap-2 flex-wrap">
                  {c.titleAr}
                  {c.isFeatured && <Star className="w-3.5 h-3.5 text-secondary fill-current" />}
                  {c.isNewRelease && <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5">جديد</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.delivery} · {c.level} · {c.price ? `${c.price} ${c.currency}` : "—"}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(c)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-muted/40"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => del(c.id)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseForm({ value, onChange, onSave, onCancel, saving }: {
  value: Partial<StoreCourse>;
  onChange: (v: Partial<StoreCourse>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = (k: keyof StoreCourse, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="bg-background border border-secondary/30 p-5 mb-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-primary">{value.id ? "تعديل دورة" : "دورة جديدة"}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-primary"><X size={18} /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={value.titleAr || ""} onChange={e => set("titleAr", e.target.value)} placeholder="العنوان (عربي) *" className="rounded-none" />
        <Input value={value.titleEn || ""} onChange={e => set("titleEn", e.target.value)} placeholder="Title (EN)" className="rounded-none" dir="ltr" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Textarea value={value.descriptionAr || ""} onChange={e => set("descriptionAr", e.target.value)} placeholder="الوصف (عربي)" rows={3} className="rounded-none" />
        <Textarea value={value.descriptionEn || ""} onChange={e => set("descriptionEn", e.target.value)} placeholder="Description (EN)" rows={3} className="rounded-none" dir="ltr" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={value.instructor || ""} onChange={e => set("instructor", e.target.value)} placeholder="المدرب" className="rounded-none" />
        <Input value={value.upcomingDate || ""} onChange={e => set("upcomingDate", e.target.value)} placeholder="تاريخ البدء" className="rounded-none" />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">صورة الدورة</label>
        <ImageUploadField value={value.thumbnailUrl || ""} onChange={url => set("thumbnailUrl", url)} folder="store-courses" />
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <select value={value.delivery || "online_self"} onChange={e => set("delivery", e.target.value)} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
          <option value="online_self">أونلاين ذاتي</option>
          <option value="online_live">أونلاين مباشر</option>
          <option value="onsite">حضوري</option>
          <option value="hybrid">هجين</option>
        </select>
        <select value={value.level || "all_levels"} onChange={e => set("level", e.target.value)} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
          <option value="beginner">مبتدئ</option>
          <option value="intermediate">متوسط</option>
          <option value="advanced">متقدم</option>
          <option value="all_levels">كل المستويات</option>
        </select>
        <select value={value.language || "ar"} onChange={e => set("language", e.target.value)} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
          <option value="ar">العربية</option>
          <option value="en">English</option>
          <option value="both">كلاهما</option>
        </select>
        <select value={value.status || "available"} onChange={e => set("status", e.target.value)} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
          <option value="available">متاح</option>
          <option value="coming_soon">قريبًا</option>
          <option value="archived">مؤرشف</option>
        </select>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <Input type="number" value={value.durationHours || ""} onChange={e => set("durationHours", parseInt(e.target.value) || null)} placeholder="ساعات" className="rounded-none" dir="ltr" />
        <Input type="number" value={value.modules || ""} onChange={e => set("modules", parseInt(e.target.value) || null)} placeholder="وحدات" className="rounded-none" dir="ltr" />
        <Input value={value.price || ""} onChange={e => set("price", e.target.value)} placeholder="السعر" className="rounded-none" dir="ltr" />
        <Input value={value.currency || "SAR"} onChange={e => set("currency", e.target.value)} placeholder="العملة" className="rounded-none" dir="ltr" />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!value.certification} onChange={e => set("certification", e.target.checked)} /> شهادة</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!value.isFeatured} onChange={e => set("isFeatured", e.target.checked)} /> مميز</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!value.isNewRelease} onChange={e => set("isNewRelease", e.target.checked)} /> إصدار جديد</label>
      </div>
      <div className="flex gap-2 pt-3 border-t border-border">
        <Button onClick={onSave} disabled={saving} className="rounded-none gap-2"><Save className="w-4 h-4" /> {saving ? "حفظ..." : "حفظ"}</Button>
        <Button variant="outline" onClick={onCancel} className="rounded-none">إلغاء</Button>
      </div>
    </div>
  );
}
