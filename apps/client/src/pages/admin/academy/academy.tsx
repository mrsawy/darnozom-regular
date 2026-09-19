import { useEffect, useState } from "react";
import { adminFetch } from "../../../lib/admin-api";
import { Plus, Edit2, Trash2, Save, X, Loader2, School, Users, Search } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Toast, useToast } from "../layout";
import { ImageUploadField } from "../_image-upload";

const API_BASE = "/api";

interface Course {
  id: number;
  titleAr: string; titleEn: string;
  descriptionAr: string | null; descriptionEn: string | null;
  track: string | null; level: string | null;
  duration: string | null; seats: number;
  price: string | null; startDate: string | null;
  imageUrl: string | null;
  createdAt: string;
  registrationCount: number;
}

const EMPTY = {
  titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "",
  track: "islamic", level: "intermediate", duration: "", seats: 20,
  price: "", startDate: "", imageUrl: "",
};

export default function AcademyPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/academy/courses`);
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.titleAr || !editing.titleEn) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const r = await adminFetch(isNew ? `${API_BASE}/academy/courses` : `${API_BASE}/academy/courses/${editing.id}`, {
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
    const r = await adminFetch(`${API_BASE}/academy/courses/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { show("تم الحذف"); load(); } else show("فشل الحذف", "error");
  }

  const filtered = items.filter(c => {
    if (trackFilter !== "all" && c.track !== trackFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [c.titleAr, c.titleEn, c.descriptionAr, c.descriptionEn].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="الأكاديمية" description={`${items.length} دورة`} actions={
        <Button onClick={() => setEditing({ ...EMPTY })} className="gap-2 rounded-none font-bold">
          <Plus size={16} /> دورة جديدة
        </Button>
      } />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في العنوان أو الوصف..." className="rounded-none pr-8" />
        </div>
        <select value={trackFilter} onChange={e => setTrackFilter(e.target.value)} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
          <option value="all">كل المسارات</option>
          <option value="islamic">إدارية إسلامية</option>
          <option value="leadership">قيادية</option>
          <option value="strategic">استراتيجية</option>
          <option value="general">عامة</option>
        </select>
      </div>

      {editing && (
        <div className="bg-background border border-secondary/30 p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-primary">{editing.id ? "تعديل دورة" : "دورة جديدة"}</h3>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-primary"><X size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input value={editing.titleAr || ""} onChange={e => setEditing({ ...editing, titleAr: e.target.value })} placeholder="العنوان (عربي) *" className="rounded-none" />
            <Input value={editing.titleEn || ""} onChange={e => setEditing({ ...editing, titleEn: e.target.value })} placeholder="Title (EN) *" className="rounded-none" dir="ltr" />
            <Textarea value={editing.descriptionAr || ""} onChange={e => setEditing({ ...editing, descriptionAr: e.target.value })} placeholder="الوصف (عربي)" rows={3} className="rounded-none sm:col-span-2" />
            <Textarea value={editing.descriptionEn || ""} onChange={e => setEditing({ ...editing, descriptionEn: e.target.value })} placeholder="Description (EN)" rows={3} className="rounded-none sm:col-span-2" dir="ltr" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={editing.track || "islamic"} onChange={e => setEditing({ ...editing, track: e.target.value })} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
              <option value="islamic">إدارية إسلامية</option>
              <option value="leadership">قيادية</option>
              <option value="strategic">استراتيجية</option>
              <option value="general">عامة</option>
            </select>
            <select value={editing.level || "intermediate"} onChange={e => setEditing({ ...editing, level: e.target.value })} className="bg-background border border-input px-3 py-2 text-sm rounded-none">
              <option value="beginner">مبتدئ</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
              <option value="all">كل المستويات</option>
            </select>
            <Input value={editing.duration || ""} onChange={e => setEditing({ ...editing, duration: e.target.value })} placeholder="المدة (مثال: 4 أسابيع)" className="rounded-none" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Input type="number" value={editing.seats ?? 20} onChange={e => setEditing({ ...editing, seats: parseInt(e.target.value) || 0 })} placeholder="المقاعد" className="rounded-none" dir="ltr" />
            <Input value={editing.price || ""} onChange={e => setEditing({ ...editing, price: e.target.value })} placeholder="السعر" className="rounded-none" dir="ltr" />
            <Input value={editing.startDate || ""} onChange={e => setEditing({ ...editing, startDate: e.target.value })} placeholder="تاريخ البدء" className="rounded-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">صورة الدورة</label>
            <ImageUploadField value={editing.imageUrl || ""} onChange={url => setEditing({ ...editing, imageUrl: url })} folder="academy" />
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <Button onClick={save} disabled={saving} className="rounded-none gap-2"><Save className="w-4 h-4" /> {saving ? "حفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-none">إلغاء</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <School className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد دورات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-background border border-border p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-primary">{c.titleAr}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.track || "—"} · {c.duration || "—"} · {c.startDate || "—"}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link href="/admin/registrations" className="text-xs flex items-center gap-1.5 text-secondary font-bold hover:underline">
                  <Users className="w-3.5 h-3.5" /> {c.registrationCount}
                </Link>
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
