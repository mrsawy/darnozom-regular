import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Loader2, Briefcase, Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { PageHeader, Toast, useToast } from "./layout";

const API_BASE = "/api";

interface JobApplication {
  id: number;
  jobId: number;
  jobTitleAr: string;
  jobTitleEn: string;
  fullName: string;
  email: string;
  phone: string;
  yearsExperience: number | null;
  coverLetter: string | null;
  resumePath: string;
  resumeFileName: string;
  resumeMimeType: string;
  resumeSize: number;
  status: "new" | "reviewing" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

const COPY = {
  ar: {
    title: "طلبات التوظيف",
    countSuffix: "طلب",
    searchPlaceholder: "بحث بالاسم أو الوظيفة أو البريد...",
    allStatuses: "كل الحالات",
    empty: "لا توجد طلبات",
    yearsLabel: "سنوات خبرة",
    cv: "السيرة الذاتية",
    details: "التفاصيل",
    detailsTitle: "طلب توظيف",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    years: "سنوات الخبرة",
    status: "الحالة",
    submittedAt: "تاريخ التقديم",
    coverLetter: "رسالة التغطية",
    downloadCv: "تحميل السيرة الذاتية",
    updated: "تم التحديث",
    updateFailed: "فشل التحديث",
    downloadFailed: "فشل تحميل الملف",
    close: "إغلاق",
  },
  en: {
    title: "Job Applications",
    countSuffix: "applications",
    searchPlaceholder: "Search by name, job, or email...",
    allStatuses: "All statuses",
    empty: "No applications yet",
    yearsLabel: "years experience",
    cv: "Resume",
    details: "Details",
    detailsTitle: "Application",
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    years: "Years of Experience",
    status: "Status",
    submittedAt: "Submitted at",
    coverLetter: "Cover Letter",
    downloadCv: "Download Resume",
    updated: "Updated",
    updateFailed: "Update failed",
    downloadFailed: "Download failed",
    close: "Close",
  },
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  reviewing: { ar: "قيد المراجعة", en: "Reviewing" },
  accepted: { ar: "مقبول", en: "Accepted" },
  rejected: { ar: "مرفوض", en: "Rejected" },
};

function statusClass(s: string) {
  if (s === "new") return "border-blue-500/40 bg-blue-500/10 text-blue-700";
  if (s === "reviewing") return "border-secondary/40 bg-secondary/10 text-secondary";
  if (s === "accepted") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  return "border-red-500/40 bg-red-500/10 text-red-700";
}

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminJobApplicationsPage() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];
  const dateLocale = isArabic ? "ar-SA" : "en-US";
  const statusLabel = (s: string) => STATUS_LABELS[s]?.[language] || s;

  const [items, setItems] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/job-applications`, { credentials: "include" });
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!items.length) return;
    const params = new URLSearchParams(window.location.search);
    const idParam = Number(params.get("id"));
    if (Number.isFinite(idParam) && idParam > 0) {
      const found = items.find(it => it.id === idParam);
      if (found) setSelected(found);
    }
  }, [items]);

  async function updateStatus(id: number, status: string) {
    const r = await adminFetch(`${API_BASE}/job-applications/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      show(t.updated);
      const updated = await r.json();
      setItems(prev => prev.map(it => (it.id === id ? { ...it, ...updated } : it)));
      if (selected?.id === id) setSelected(s => (s ? { ...s, ...updated } : s));
    } else {
      show(t.updateFailed, "error");
    }
  }

  async function downloadResume(app: JobApplication) {
    try {
      const r = await adminFetch(`${API_BASE}/job-applications/${app.id}/resume`, { credentials: "include" });
      if (!r.ok) { show(t.downloadFailed, "error"); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = app.resumeFileName || `resume-${app.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      show(t.downloadFailed, "error");
    }
  }

  const filtered = items.filter(r => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![r.fullName, r.email, r.phone, r.jobTitleAr, r.jobTitleEn].some(v => (v || "").toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const dirSide = isArabic ? "left" : "right";

  return (
    <div dir={isArabic ? "rtl" : "ltr"}>
      <Toast toast={toast} />
      <PageHeader title={t.title} description={`${items.length} ${t.countSuffix}`} />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute ${isArabic ? "right-2" : "left-2"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`rounded-none ${isArabic ? "pr-8" : "pl-8"}`}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-input bg-background px-3 py-2 text-sm rounded-none">
          <option value="all">{t.allStatuses}</option>
          {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div className="bg-background border border-border divide-y divide-border">
          {filtered.map(r => (
            <div key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs px-1.5 py-0.5 bg-muted/50 border border-border">#{r.id}</span>
                    <span className="font-bold text-primary">{isArabic ? r.jobTitleAr : r.jobTitleEn}</span>
                    <span className="text-xs text-muted-foreground">— {isArabic ? r.jobTitleEn : r.jobTitleAr}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>{r.fullName}</strong> · {r.email} · {r.phone}
                    {r.yearsExperience !== null && <> · {r.yearsExperience} {t.yearsLabel}</>}
                  </div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{new Date(r.createdAt).toLocaleString(dateLocale)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button variant="outline" size="sm" className="rounded-none gap-1.5 font-bold" onClick={() => downloadResume(r)}>
                    <Download size={14} /> {t.cv}
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-none font-bold" onClick={() => setSelected(r)}>
                    {t.details}
                  </Button>
                  <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                    className={`border px-3 py-1.5 text-sm rounded-none font-bold ${statusClass(r.status)}`}>
                    {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
          dir={isArabic ? "rtl" : "ltr"}
        >
          <div className="bg-background w-full max-w-2xl my-8 border border-border shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className={`absolute top-3 ${dirSide}-3 text-foreground/40 hover:text-secondary p-1`}>
              <X size={18} />
            </button>
            <div className="p-6 md:p-8">
              <div className="text-xs font-bold text-secondary/80 uppercase tracking-widest mb-1">{t.detailsTitle} #{selected.id}</div>
              <h3 className="text-xl font-black text-primary">{isArabic ? selected.jobTitleAr : selected.jobTitleEn}</h3>
              <p className="text-xs text-foreground/50 mt-1">{isArabic ? selected.jobTitleEn : selected.jobTitleAr}</p>
              <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
                <Row label={t.fullName} value={selected.fullName} />
                <Row label={t.email} value={<a href={`mailto:${selected.email}`} className="text-secondary">{selected.email}</a>} />
                <Row label={t.phone} value={selected.phone} />
                <Row label={t.years} value={selected.yearsExperience !== null ? String(selected.yearsExperience) : "—"} />
                <Row label={t.status} value={statusLabel(selected.status)} />
                <Row label={t.submittedAt} value={new Date(selected.createdAt).toLocaleString(dateLocale)} />
              </div>
              {selected.coverLetter && (
                <div className="mt-4">
                  <div className="text-xs font-bold text-foreground/60 mb-1.5">{t.coverLetter}</div>
                  <div className="text-sm text-foreground/80 bg-muted/30 border border-border p-3 whitespace-pre-wrap">{selected.coverLetter}</div>
                </div>
              )}
              <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center gap-3">
                <Button onClick={() => downloadResume(selected)} className="rounded-none gap-2 font-bold">
                  <Download size={14} /> {t.downloadCv}
                </Button>
                <span className="text-xs text-muted-foreground">{selected.resumeFileName} · {formatBytes(selected.resumeSize)}</span>
                <select
                  value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value)}
                  className={`ms-auto border px-3 py-1.5 text-sm rounded-none font-bold ${statusClass(selected.status)}`}
                >
                  {Object.keys(STATUS_LABELS).map(k => <option key={k} value={k}>{statusLabel(k)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-foreground/50 mb-0.5">{label}</div>
      <div className="text-foreground/90">{value}</div>
    </div>
  );
}
