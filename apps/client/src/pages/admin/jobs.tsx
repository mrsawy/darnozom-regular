import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Plus, Edit2, Trash2, Save, X, Loader2, Briefcase, Search, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Toast, useToast } from "./layout";

const API_BASE = "/api";

type JobStatus = "active" | "archived";

interface JobOpening {
  id: number;
  titleAr: string; titleEn: string;
  deptAr: string; deptEn: string;
  locationAr: string; locationEn: string;
  type: string; typeAr: string; typeEn: string;
  posted: string;
  remote: boolean;
  descAr: string; descEn: string;
  skillsAr: string[]; skillsEn: string[];
  category: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

const TYPE_OPTIONS: { value: string; ar: string; en: string }[] = [
  { value: "full-time", ar: "دوام كامل", en: "Full-time" },
  { value: "part-time", ar: "دوام جزئي", en: "Part-time" },
  { value: "contract", ar: "عقد مؤقت", en: "Contract" },
  { value: "internship", ar: "تدريب", en: "Internship" },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "consulting", label: "الاستشارات" },
  { value: "digital", label: "التحول الرقمي" },
  { value: "academy", label: "الأكاديمية" },
  { value: "research", label: "البحث والنشر" },
  { value: "management", label: "الإدارة" },
];

const EMPTY: Omit<JobOpening, "id" | "createdAt" | "updatedAt"> = {
  titleAr: "", titleEn: "",
  deptAr: "", deptEn: "",
  locationAr: "", locationEn: "",
  type: "full-time", typeAr: "دوام كامل", typeEn: "Full-time",
  posted: new Date().toISOString().slice(0, 10),
  remote: false,
  descAr: "", descEn: "",
  skillsAr: [], skillsEn: [],
  category: "consulting",
  status: "active",
};

export default function AdminJobsPage() {
  const [items, setItems] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<JobOpening> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | JobStatus>("all");
  const [search, setSearch] = useState("");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/jobs`, { credentials: "include" });
      if (r.ok) setItems(await r.json());
      else show("فشل التحميل", "error");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (!editing.titleAr || !editing.titleEn) { show("العنوان مطلوب", "error"); return; }
    if (!editing.deptAr || !editing.deptEn) { show("القسم مطلوب", "error"); return; }
    if (!editing.locationAr || !editing.locationEn) { show("الموقع مطلوب", "error"); return; }
    if (!editing.posted || !/^\d{4}-\d{2}-\d{2}$/.test(editing.posted)) { show("تاريخ النشر غير صالح", "error"); return; }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const payload = {
        titleAr: editing.titleAr,
        titleEn: editing.titleEn,
        deptAr: editing.deptAr,
        deptEn: editing.deptEn,
        locationAr: editing.locationAr,
        locationEn: editing.locationEn,
        type: editing.type || "full-time",
        typeAr: editing.typeAr || "دوام كامل",
        typeEn: editing.typeEn || "Full-time",
        posted: editing.posted,
        remote: !!editing.remote,
        descAr: editing.descAr || "",
        descEn: editing.descEn || "",
        skillsAr: editing.skillsAr || [],
        skillsEn: editing.skillsEn || [],
        category: editing.category || "consulting",
        status: editing.status || "active",
      };
      const r = await adminFetch(isNew ? `${API_BASE}/jobs` : `${API_BASE}/jobs/${editing.id}`, {
        method: isNew ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        show((err as { error?: string }).error || "فشل الحفظ", "error");
        return;
      }
      show(isNew ? "تمت الإضافة" : "تم التحديث");
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  }

  async function del(id: number) {
    if (!confirm("حذف الوظيفة نهائياً؟")) return;
    const r = await adminFetch(`${API_BASE}/jobs/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { show("تم الحذف"); load(); } else show("فشل الحذف", "error");
  }

  async function toggleArchive(job: JobOpening) {
    const newStatus: JobStatus = job.status === "active" ? "archived" : "active";
    const r = await adminFetch(`${API_BASE}/jobs/${job.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (r.ok) { show(newStatus === "archived" ? "تم الأرشفة" : "تم التفعيل"); load(); }
    else show("فشل التحديث", "error");
  }

  const filtered = useMemo(() => items.filter(j => {
    if (filter !== "all" && j.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [j.titleAr, j.titleEn, j.deptAr, j.deptEn, j.locationAr, j.locationEn].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [items, filter, search]);

  const counts = useMemo(() => ({
    active: items.filter(j => j.status === "active").length,
    archived: items.filter(j => j.status === "archived").length,
  }), [items]);

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="الوظائف"
        description={`${counts.active} نشطة · ${counts.archived} مؤرشفة`}
        actions={
          <Button onClick={() => setEditing({ ...EMPTY })} className="gap-2 rounded-none font-bold">
            <Plus size={16} /> وظيفة جديدة
          </Button>
        }
      />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في العنوان أو القسم أو الموقع..."
            className="rounded-none pr-8"
          />
        </div>
        {(["all", "active", "archived"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-bold border ${filter === f ? "bg-secondary text-primary border-secondary" : "border-border text-muted-foreground"}`}
          >
            {f === "all" ? "الكل" : f === "active" ? "نشطة" : "مؤرشفة"}
          </button>
        ))}
      </div>

      {editing && (
        <JobForm
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد وظائف</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => (
            <div key={job.id} className="bg-background border border-border p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-primary">{job.titleAr}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 ${job.status === "active" ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}>
                    {job.status === "active" ? "نشطة" : "مؤرشفة"}
                  </span>
                  {job.remote && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-700">عن بُعد</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {job.deptAr} · {job.locationAr} · {job.typeAr}
                </div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5" dir="ltr">
                  {job.titleEn} · {job.deptEn} · {job.locationEn}
                </div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5">نُشرت: {job.posted}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleArchive(job)}
                  title={job.status === "active" ? "أرشفة" : "تفعيل"}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-muted/40"
                >
                  {job.status === "active" ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditing(job)}
                  title="تعديل"
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-muted/40"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => del(job.id)}
                  title="حذف"
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JobForm({ value, onChange, onSave, onCancel, saving }: {
  value: Partial<JobOpening>;
  onChange: (v: Partial<JobOpening>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = (k: keyof JobOpening, v: unknown) => onChange({ ...value, [k]: v });
  const [skillsArInput, setSkillsArInput] = useState((value.skillsAr || []).join("، "));
  const [skillsEnInput, setSkillsEnInput] = useState((value.skillsEn || []).join(", "));

  useEffect(() => {
    setSkillsArInput((value.skillsAr || []).join("، "));
    setSkillsEnInput((value.skillsEn || []).join(", "));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.id]);

  function commitSkillsAr(v: string) {
    setSkillsArInput(v);
    set("skillsAr", v.split(/[،,]/).map(s => s.trim()).filter(Boolean));
  }
  function commitSkillsEn(v: string) {
    setSkillsEnInput(v);
    set("skillsEn", v.split(/[,،]/).map(s => s.trim()).filter(Boolean));
  }

  function setType(typeValue: string) {
    const opt = TYPE_OPTIONS.find(t => t.value === typeValue);
    onChange({
      ...value,
      type: typeValue,
      typeAr: opt?.ar || value.typeAr || "",
      typeEn: opt?.en || value.typeEn || "",
    });
  }

  return (
    <div className="bg-background border border-secondary/30 p-5 mb-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-primary">{value.id ? "تعديل وظيفة" : "وظيفة جديدة"}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-primary"><X size={18} /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={value.titleAr || ""} onChange={e => set("titleAr", e.target.value)} placeholder="عنوان الوظيفة (عربي) *" className="rounded-none" />
        <Input value={value.titleEn || ""} onChange={e => set("titleEn", e.target.value)} placeholder="Job Title (EN) *" className="rounded-none" dir="ltr" />
        <Input value={value.deptAr || ""} onChange={e => set("deptAr", e.target.value)} placeholder="القسم (عربي) *" className="rounded-none" />
        <Input value={value.deptEn || ""} onChange={e => set("deptEn", e.target.value)} placeholder="Department (EN) *" className="rounded-none" dir="ltr" />
        <Input value={value.locationAr || ""} onChange={e => set("locationAr", e.target.value)} placeholder="الموقع (عربي) *" className="rounded-none" />
        <Input value={value.locationEn || ""} onChange={e => set("locationEn", e.target.value)} placeholder="Location (EN) *" className="rounded-none" dir="ltr" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">نوع الدوام</label>
          <select
            value={value.type || "full-time"}
            onChange={e => setType(e.target.value)}
            className="w-full bg-background border border-input px-3 py-2 text-sm rounded-none"
          >
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.ar} / {t.en}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">التصنيف</label>
          <select
            value={value.category || "consulting"}
            onChange={e => set("category", e.target.value)}
            className="w-full bg-background border border-input px-3 py-2 text-sm rounded-none"
          >
            {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">تاريخ النشر</label>
          <Input
            type="date"
            value={value.posted || ""}
            onChange={e => set("posted", e.target.value)}
            className="rounded-none"
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Input value={value.typeAr || ""} onChange={e => set("typeAr", e.target.value)} placeholder="تسمية النوع (عربي)" className="rounded-none" />
        <Input value={value.typeEn || ""} onChange={e => set("typeEn", e.target.value)} placeholder="Type Label (EN)" className="rounded-none" dir="ltr" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Textarea value={value.descAr || ""} onChange={e => set("descAr", e.target.value)} placeholder="الوصف (عربي)" rows={3} className="rounded-none" />
        <Textarea value={value.descEn || ""} onChange={e => set("descEn", e.target.value)} placeholder="Description (EN)" rows={3} className="rounded-none" dir="ltr" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">المهارات (عربي) — افصل بفاصلة</label>
          <Input value={skillsArInput} onChange={e => commitSkillsAr(e.target.value)} placeholder="الفقه الإسلامي، الحوكمة الشرعية" className="rounded-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Skills (EN) — comma separated</label>
          <Input value={skillsEnInput} onChange={e => commitSkillsEn(e.target.value)} placeholder="Governance, Strategy" className="rounded-none" dir="ltr" />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value.remote}
            onChange={e => set("remote", e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-bold">عمل عن بُعد</span>
        </label>
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1 block">الحالة</label>
          <select
            value={value.status || "active"}
            onChange={e => set("status", e.target.value as JobStatus)}
            className="bg-background border border-input px-3 py-2 text-sm rounded-none w-40"
          >
            <option value="active">نشطة</option>
            <option value="archived">مؤرشفة</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <Button onClick={onSave} disabled={saving} className="rounded-none gap-2">
          <Save className="w-4 h-4" /> {saving ? "حفظ..." : "حفظ"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-none">إلغاء</Button>
      </div>
    </div>
  );
}
