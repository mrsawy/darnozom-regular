import { useState, useEffect } from "react";
import { adminFetch } from "../../../lib/admin-api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit2, Trash2, Save, X, Star, Link as LinkIcon,
  Loader2, Search, Upload, AlertTriangle, BookOpen, FileText, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Toast, useToast } from "../layout";

const API_BASE = "/api";

type BookStatus = "available" | "coming_soon" | "out_of_stock";
type BookCategory = "shariah" | "management" | "digital_transformation";

interface Book {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  coverImageUrl: string | null;
  category: BookCategory;
  price: string | null;
  currency: string | null;
  status: BookStatus;
  isFeatured: boolean;
  buyLink: string | null;
  externalUrl: string | null;
  paperAvailable: boolean;
  paperPrice: string | null;
  digitalAvailable: boolean;
  digitalPrice: string | null;
  digitalFileUrl: string | null;
  hasDigitalFile?: boolean;
  createdAt: string;
}

const EMPTY: Omit<Book, "id" | "createdAt"> = {
  title: "", author: "", description: "", coverImageUrl: "",
  category: "management", price: "", currency: "SAR", status: "available",
  isFeatured: false, buyLink: "", externalUrl: "",
  paperAvailable: true, paperPrice: "", digitalAvailable: false,
  digitalPrice: "", digitalFileUrl: null,
};

const CATEGORY_LABELS: Record<BookCategory, string> = {
  shariah: "الشريعة (Shariah)",
  management: "الإدارة (Management)",
  digital_transformation: "التحول الرقمي (Digital Transformation)",
};
const STATUS_LABELS: Record<BookStatus, string> = {
  available: "متاح", coming_soon: "قريبًا", out_of_stock: "نفذت الكمية",
};

export default function BooksPage() {
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/books`, { credentials: "include" });
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(data: Omit<Book, "id" | "createdAt">) {
    setSaving(true);
    try {
      const url = editing ? `${API_BASE}/books/${editing.id}` : `${API_BASE}/books`;
      const r = await adminFetch(url, {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        show(err.error || "فشل الحفظ", "error"); return;
      }
      show(editing ? "تم تحديث الكتاب" : "تمت إضافة الكتاب");
      setShowForm(false); setEditing(null);
      await load();
    } finally { setSaving(false); }
  }

  async function del(id: number) {
    const r = await adminFetch(`${API_BASE}/books/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) { show("فشل الحذف", "error"); return; }
    show("تم حذف الكتاب");
    setDeleteConfirm(null);
    await load();
  }

  async function toggleFeatured(b: Book) {
    const r = await adminFetch(`${API_BASE}/books/${b.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: !b.isFeatured }),
    });
    if (r.ok) { show(b.isFeatured ? "تم إلغاء التمييز" : "تم تمييز الكتاب"); load(); }
  }

  const filtered = items.filter(b => {
    if (filterCategory !== "all" && b.category !== filterCategory) return false;
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (search && !b.title.includes(search) && !(b.author || "").includes(search)) return false;
    return true;
  });

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="الكتب" description={`${items.length} كتاب`} actions={
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 rounded-none font-bold">
          <Plus size={16} /> إضافة كتاب
        </Button>
      } />

      <div className="bg-background border border-border p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="rounded-none pr-8" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-input bg-background px-3 py-2 text-sm rounded-none">
          <option value="all">كل الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-input bg-background px-3 py-2 text-sm rounded-none">
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <AnimatePresence>
        {(showForm || editing) && (
          <BookForm
            initial={editing || undefined}
            onSave={save}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد كتب مطابقة</p>
        </div>
      ) : (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-right p-3 font-bold">الكتاب</th>
                <th className="text-right p-3 font-bold hidden md:table-cell">الفئة</th>
                <th className="text-right p-3 font-bold hidden md:table-cell">السعر</th>
                <th className="text-right p-3 font-bold hidden sm:table-cell">الحالة</th>
                <th className="text-left p-3 font-bold w-32">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {b.coverImageUrl ? (
                        <img src={b.coverImageUrl} alt="" className="w-10 h-14 object-cover border border-border shrink-0" />
                      ) : (
                        <div className="w-10 h-14 bg-muted flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-primary truncate flex items-center gap-1.5">
                          {b.title}
                          {b.isFeatured && <Star className="w-3 h-3 text-secondary fill-current shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{b.author || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs hidden md:table-cell">{CATEGORY_LABELS[b.category]}</td>
                  <td className="p-3 text-xs hidden md:table-cell" dir="ltr">
                    <div className="flex flex-col gap-0.5">
                      {b.paperAvailable && (
                        <span>📦 {b.paperPrice || "—"} {b.currency}</span>
                      )}
                      {b.digitalAvailable && (
                        <span className="flex items-center gap-1">
                          📄 {b.digitalPrice || "—"} {b.currency}
                          {!b.hasDigitalFile && !b.digitalFileUrl && (
                            <AlertTriangle className="w-3 h-3 text-secondary" />
                          )}
                        </span>
                      )}
                      {!b.paperAvailable && !b.digitalAvailable && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 bg-muted/50 border border-border">{STATUS_LABELS[b.status]}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleFeatured(b)} title="تمييز" className={`w-7 h-7 flex items-center justify-center hover:bg-secondary/20 ${b.isFeatured ? "text-secondary" : "text-muted-foreground"}`}>
                        <Star className="w-3.5 h-3.5" fill={b.isFeatured ? "currentColor" : "none"} />
                      </button>
                      <button onClick={() => { setEditing(b); setShowForm(false); }} title="تعديل" className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-secondary hover:bg-muted/40">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(b.id)} title="حذف" className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm !== null && (
        <DeleteConfirm onCancel={() => setDeleteConfirm(null)} onConfirm={() => del(deleteConfirm)} />
      )}
    </div>
  );
}

function DeleteConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-red-300 max-w-sm w-full p-6">
        <div className="flex items-center gap-2 mb-3"><AlertTriangle className="text-red-500 w-5 h-5" /><h3 className="font-bold text-primary">تأكيد الحذف</h3></div>
        <p className="text-sm text-muted-foreground mb-5">هل أنت متأكد من حذف هذا الكتاب؟ لا يمكن التراجع.</p>
        <div className="flex gap-2">
          <Button onClick={onConfirm} className="rounded-none bg-red-600 hover:bg-red-700 text-white flex-1 gap-2"><Trash2 className="w-4 h-4" /> حذف</Button>
          <Button onClick={onCancel} variant="outline" className="rounded-none">إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

function BookForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<Book>;
  onSave: (d: Omit<Book, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<Book, "id" | "createdAt">>({ ...EMPTY, ...initial });
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [scrapeInfo, setScrapeInfo] = useState<{ fetched: string[]; missing: string[]; warnings?: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  async function uploadPdf(file: File) {
    if (file.type !== "application/pdf") {
      setPdfError("الملف يجب أن يكون PDF");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPdfError("حجم الملف لا يتجاوز 50 ميجابايت");
      return;
    }
    setPdfUploading(true);
    setPdfError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await adminFetch(`${API_BASE}/books/upload-pdf`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setPdfError(e.error || "فشل رفع الملف");
        return;
      }
      const { fileUrl } = await r.json();
      set("digitalFileUrl", fileUrl);
    } finally {
      setPdfUploading(false);
    }
  }

  async function scrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true); setScrapeError(""); setScrapeInfo(null);
    try {
      const r = await adminFetch(`${API_BASE}/books/scrape-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setScrapeError(e.error || "فشل جلب البيانات");
        return;
      }
      const d = await r.json();
      if (d.title) set("title", d.title);
      if (d.description) set("description", d.description);
      if (d.image) set("coverImageUrl", d.image);
      if (d.author) set("author", d.author);
      if (d.price) set("price", d.price);
      if (d.currency) set("currency", d.currency);
      set("externalUrl", scrapeUrl.trim());
      setScrapeInfo({ fetched: d.fetched || [], missing: d.missing || [], warnings: d.warnings || [] });
    } catch {
      setScrapeError("تعذّر الاتصال بالخادم");
    } finally { setScraping(false); }
  }

  const FIELD_LABELS_AR: Record<string, string> = {
    title: "العنوان",
    author: "المؤلف",
    description: "الوصف",
    image: "صورة الغلاف",
    price: "السعر",
  };

  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("صيغ الصور المسموحة: JPG, PNG, WebP"); return;
    }
    setUploading(true); setUploadError("");
    try {
      const fd = new FormData(); fd.append("image", file);
      const r = await adminFetch(`${API_BASE}/books/upload-cover`, {
        method: "POST", credentials: "include", body: fd,
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); setUploadError(e.error || "فشل الرفع"); return; }
      const { coverUrl } = await r.json();
      set("coverImageUrl", coverUrl);
    } finally { setUploading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-background border border-secondary/30 p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-black text-primary">{initial?.id ? "تعديل الكتاب" : "إضافة كتاب جديد"}</h2>
        <button onClick={onCancel} className="text-muted-foreground hover:text-primary"><X size={18} /></button>
      </div>

      <div className="mb-5 border border-border p-4 bg-muted/20">
        <p className="text-sm font-bold text-primary mb-2 flex items-center gap-2"><LinkIcon size={13} className="text-secondary" /> استيراد من رابط</p>
        <div className="flex gap-2">
          <Input value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} placeholder="https://..." className="rounded-none flex-1" dir="ltr" />
          <Button type="button" onClick={scrape} disabled={scraping || !scrapeUrl.trim()} variant="outline" className="rounded-none gap-2 shrink-0">
            {scraping ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} جلب
          </Button>
        </div>
        {scrapeError && <p className="text-red-500 text-xs mt-2">{scrapeError}</p>}
        {scrapeInfo && (
          <div className="mt-2 space-y-1 text-xs">
            {scrapeInfo.fetched.length > 0 && (
              <p className="text-green-600">
                تم تعبئة: {scrapeInfo.fetched.map(f => FIELD_LABELS_AR[f] || f).join("، ")}
              </p>
            )}
            {scrapeInfo.missing.length > 0 && (
              <p className="text-secondary">
                يحتاج إدخال يدوي: {scrapeInfo.missing.map(f => FIELD_LABELS_AR[f] || f).join("، ")}
              </p>
            )}
            {(scrapeInfo.warnings || []).map((w, i) => (
              <p key={i} className="text-secondary flex items-start gap-1">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> <span>{w}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        // Client-side guards mirroring the server validators so the user
        // gets an immediate, localized error instead of a 400 round-trip.
        if (!form.paperAvailable && !form.digitalAvailable) {
          alert("يجب تفعيل صيغة واحدة على الأقل (ورقي أو رقمي).");
          return;
        }
        if (form.paperAvailable && !form.paperPrice) {
          alert("يرجى إدخال سعر النسخة الورقية.");
          return;
        }
        if (form.digitalAvailable && !form.digitalPrice) {
          alert("يرجى إدخال سعر النسخة الرقمية.");
          return;
        }
        if (form.digitalAvailable && !form.digitalFileUrl) {
          alert("يرجى رفع ملف PDF للنسخة الرقمية.");
          return;
        }
        onSave(form);
      }} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="عنوان الكتاب *"><Input value={form.title} onChange={e => set("title", e.target.value)} required className="rounded-none" /></Field>
          <Field label="المؤلف"><Input value={form.author || ""} onChange={e => set("author", e.target.value)} className="rounded-none" /></Field>
        </div>
        <Field label="الوصف">
          <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} className="rounded-none" />
        </Field>
        <Field label="صورة الغلاف">
          <div className="flex gap-2">
            <Input value={form.coverImageUrl || ""} onChange={e => set("coverImageUrl", e.target.value)} placeholder="رابط أو ارفع" className="rounded-none flex-1" dir="ltr" />
            <label className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-bold cursor-pointer shrink-0 ${uploading ? "border-border text-muted-foreground" : "border-secondary/50 text-secondary hover:bg-secondary/10"}`}>
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} رفع
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </label>
          </div>
          {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
          {form.coverImageUrl && <img src={form.coverImageUrl} alt="" className="h-20 mt-2 border border-border" />}
        </Field>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="الفئة">
            <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="الحالة">
            <select value={form.status} onChange={e => set("status", e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none">
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="العملة">
            <select value={form.currency || "SAR"} onChange={e => set("currency", e.target.value)} className="w-full border border-input bg-background px-3 py-2 text-sm rounded-none">
              <option>SAR</option><option>USD</option><option>EGP</option><option>AED</option>
            </select>
          </Field>
        </div>

        {/* Format sections */}
        <div className="border border-border bg-muted/10 p-4 space-y-3">
          <p className="text-sm font-bold text-primary flex items-center gap-2">
            <BookOpen size={14} className="text-secondary" /> صيغ الكتاب
          </p>
          <p className="text-xs text-muted-foreground">
            يجب تفعيل صيغة واحدة على الأقل. عند تفعيل النسخة الرقمية يجب رفع ملف PDF.
          </p>

          {/* Paper */}
          <div className="border border-border bg-background p-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={form.paperAvailable}
                onChange={e => set("paperAvailable", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-bold text-primary">📦 نسخة ورقية (يتم شحنها)</span>
            </label>
            {form.paperAvailable && (
              <div className="ms-6">
                <label className="text-xs font-bold text-muted-foreground mb-1 block">
                  سعر النسخة الورقية ({form.currency || "SAR"}) *
                </label>
                <Input
                  value={form.paperPrice || ""}
                  onChange={e => set("paperPrice", e.target.value)}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  className="rounded-none max-w-[200px]"
                  required={form.paperAvailable}
                />
              </div>
            )}
          </div>

          {/* Digital */}
          <div className="border border-border bg-background p-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={form.digitalAvailable}
                onChange={e => set("digitalAvailable", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="font-bold text-primary">📄 نسخة رقمية PDF (تحميل وقراءة)</span>
            </label>
            {form.digitalAvailable && (
              <div className="ms-6 space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">
                    سعر النسخة الرقمية ({form.currency || "SAR"}) *
                  </label>
                  <Input
                    value={form.digitalPrice || ""}
                    onChange={e => set("digitalPrice", e.target.value)}
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    className="rounded-none max-w-[200px]"
                    required={form.digitalAvailable}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">
                    ملف PDF * (حد أقصى 50MB)
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-bold cursor-pointer ${
                        pdfUploading
                          ? "border-border text-muted-foreground"
                          : "border-secondary/50 text-secondary hover:bg-secondary/10"
                      }`}
                    >
                      {pdfUploading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      {form.digitalFileUrl ? "استبدال الملف" : "رفع PDF"}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        disabled={pdfUploading}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) uploadPdf(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {form.digitalFileUrl && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                        <Check size={14} />
                        <FileText size={13} /> تم رفع الملف
                      </span>
                    )}
                  </div>
                  {pdfError && <p className="text-red-500 text-xs mt-1">{pdfError}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    لن يتم عرض الرابط للزوار. يصل العملاء إلى الملف من صفحة طلباتهم فقط.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="رابط الشراء"><Input value={form.buyLink || ""} onChange={e => set("buyLink", e.target.value)} className="rounded-none" dir="ltr" /></Field>
          <Field label="رابط المصدر"><Input value={form.externalUrl || ""} onChange={e => set("externalUrl", e.target.value)} className="rounded-none" dir="ltr" /></Field>
        </div>
        <button type="button" onClick={() => set("isFeatured", !form.isFeatured)} className={`flex items-center gap-2 px-3 py-1.5 border text-sm font-bold ${form.isFeatured ? "bg-secondary text-primary border-secondary" : "border-border text-muted-foreground"}`}>
          <Star size={14} className={form.isFeatured ? "fill-primary" : ""} /> {form.isFeatured ? "كتاب مميز" : "تحديد كمميّز"}
        </button>
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="gap-2 rounded-none font-bold">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {saving ? "حفظ..." : "حفظ"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-none">إلغاء</Button>
        </div>
      </form>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
