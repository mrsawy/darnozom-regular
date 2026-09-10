import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Plus, Edit2, Trash2, Save, X, Loader2, CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Toast, useToast } from "./layout";
import { ImageUploadField } from "./_image-upload";

const API_BASE = "/api";

interface EventItem {
  id: number;
  titleAr: string; titleEn: string;
  dateAr: string; dateEn: string;
  timeAr: string | null; timeEn: string | null;
  locationAr: string | null; locationEn: string | null;
  categoryAr: string | null; categoryEn: string | null;
  descriptionAr: string | null; descriptionEn: string | null;
  imageUrl?: string | null;
  status: "upcoming" | "past";
  createdAt: string;
}

const EMPTY: Omit<EventItem, "id" | "createdAt"> = {
  titleAr: "", titleEn: "", dateAr: "", dateEn: "", timeAr: "", timeEn: "",
  locationAr: "", locationEn: "", categoryAr: "", categoryEn: "",
  descriptionAr: "", descriptionEn: "", imageUrl: "", status: "upcoming",
};

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EventItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [search, setSearch] = useState("");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/events`);
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.titleAr || !editing.titleEn) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const r = await adminFetch(isNew ? `${API_BASE}/events` : `${API_BASE}/events/${editing.id}`, {
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
    if (!confirm("حذف الفعالية؟")) return;
    const r = await adminFetch(`${API_BASE}/events/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { show("تم الحذف"); load(); } else show("فشل الحذف", "error");
  }

  const filtered = items.filter(e => {
    if (filter !== "all" && e.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.titleAr, e.titleEn, e.locationAr, e.locationEn, e.categoryAr, e.categoryEn].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="الفعاليات" description={`${items.length} فعالية`} actions={
        <Button onClick={() => setEditing({ ...EMPTY })} className="gap-2 rounded-none font-bold">
          <Plus size={16} /> فعالية جديدة
        </Button>
      } />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في العنوان أو المكان أو الفئة..." className="rounded-none pr-8" />
        </div>
        {(["all", "upcoming", "past"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-bold border ${filter === f ? "bg-secondary text-primary border-secondary" : "border-border text-muted-foreground"}`}>
            {f === "all" ? "الكل" : f === "upcoming" ? "قادمة" : "سابقة"}
          </button>
        ))}
      </div>

      {editing && <EventForm value={editing} onChange={setEditing} onSave={save} onCancel={() => setEditing(null)} saving={saving} />}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد فعاليات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <div key={e.id} className="bg-background border border-border p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-primary flex items-center gap-2">
                  {e.titleAr}
                  <span className={`text-[10px] px-1.5 py-0.5 ${e.status === "upcoming" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}>
                    {e.status === "upcoming" ? "قادمة" : "سابقة"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.dateAr} · {e.locationAr || "—"}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(e)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-muted/40"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => del(e.id)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventForm({ value, onChange, onSave, onCancel, saving }: {
  value: Partial<EventItem>;
  onChange: (v: Partial<EventItem>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = (k: keyof EventItem, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="bg-background border border-secondary/30 p-5 mb-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-primary">{value.id ? "تعديل فعالية" : "فعالية جديدة"}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-primary"><X size={18} /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={value.titleAr || ""} onChange={e => set("titleAr", e.target.value)} placeholder="العنوان (عربي) *" className="rounded-none" />
        <Input value={value.titleEn || ""} onChange={e => set("titleEn", e.target.value)} placeholder="Title (EN) *" className="rounded-none" dir="ltr" />
        <Input value={value.dateAr || ""} onChange={e => set("dateAr", e.target.value)} placeholder="التاريخ (عربي)" className="rounded-none" />
        <Input value={value.dateEn || ""} onChange={e => set("dateEn", e.target.value)} placeholder="Date (EN)" className="rounded-none" dir="ltr" />
        <Input value={value.timeAr || ""} onChange={e => set("timeAr", e.target.value)} placeholder="الوقت (عربي)" className="rounded-none" />
        <Input value={value.timeEn || ""} onChange={e => set("timeEn", e.target.value)} placeholder="Time (EN)" className="rounded-none" dir="ltr" />
        <Input value={value.locationAr || ""} onChange={e => set("locationAr", e.target.value)} placeholder="المكان (عربي)" className="rounded-none" />
        <Input value={value.locationEn || ""} onChange={e => set("locationEn", e.target.value)} placeholder="Location (EN)" className="rounded-none" dir="ltr" />
        <Input value={value.categoryAr || ""} onChange={e => set("categoryAr", e.target.value)} placeholder="الفئة (عربي)" className="rounded-none" />
        <Input value={value.categoryEn || ""} onChange={e => set("categoryEn", e.target.value)} placeholder="Category (EN)" className="rounded-none" dir="ltr" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Textarea value={value.descriptionAr || ""} onChange={e => set("descriptionAr", e.target.value)} placeholder="الوصف (عربي)" rows={3} className="rounded-none" />
        <Textarea value={value.descriptionEn || ""} onChange={e => set("descriptionEn", e.target.value)} placeholder="Description (EN)" rows={3} className="rounded-none" dir="ltr" />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-1 block">صورة الفعالية</label>
        <ImageUploadField value={value.imageUrl || ""} onChange={url => set("imageUrl", url)} folder="events" />
      </div>
      <select value={value.status || "upcoming"} onChange={e => set("status", e.target.value)} className="bg-background border border-input px-3 py-2 text-sm rounded-none w-48">
        <option value="upcoming">قادمة</option><option value="past">سابقة</option>
      </select>
      <div className="flex gap-2 pt-3 border-t border-border">
        <Button onClick={onSave} disabled={saving} className="rounded-none gap-2"><Save className="w-4 h-4" /> {saving ? "حفظ..." : "حفظ"}</Button>
        <Button variant="outline" onClick={onCancel} className="rounded-none">إلغاء</Button>
      </div>
    </div>
  );
}
