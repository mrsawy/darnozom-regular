import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Plus, Trash2, Loader2, Clock, X, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Toast, useToast } from "./layout";

const API_BASE = "/api";

interface Slot {
  id: number;
  startsAt: string;
  durationMinutes: number;
  consultationType: string | null;
  notes: string | null;
  status: "available" | "booked" | "disabled";
  createdAt: string;
}

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: "Asia/Riyadh",
      weekday: "short",
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function statusLabel(s: Slot["status"]) {
  return s === "available" ? "متاح" : s === "booked" ? "محجوز" : "موقوف";
}
function statusClass(s: Slot["status"]) {
  return s === "available"
    ? "bg-emerald-100 text-emerald-800"
    : s === "booked" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-700";
}

export default function ConsultationSlotsPage() {
  const [items, setItems] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState({ startsAt: "", durationMinutes: 60, consultationType: "", notes: "" });
  const [bulk, setBulk] = useState({
    startDate: "", endDate: "",
    weekdays: [0, 1, 2, 3] as number[], // Sun-Wed default
    startHour: 10, endHour: 14, slotMinutes: 30,
    consultationType: "",
  });
  const [filter, setFilter] = useState<"all" | "available" | "booked" | "disabled">("all");
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/consultation-slots`, { credentials: "include" });
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function addSlot() {
    if (!form.startsAt) return show("اختر تاريخاً ووقتاً", "error");
    setSaving(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/consultation-slots`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(form.startsAt).toISOString(),
          durationMinutes: form.durationMinutes,
          consultationType: form.consultationType || null,
          notes: form.notes || null,
        }),
      });
      if (!r.ok) { show("فشل الإضافة", "error"); return; }
      show("تمت إضافة الموعد");
      setAdding(false);
      setForm({ startsAt: "", durationMinutes: 60, consultationType: "", notes: "" });
      await load();
    } finally { setSaving(false); }
  }

  async function bulkCreate() {
    if (!bulk.startDate || !bulk.endDate || bulk.weekdays.length === 0) {
      return show("اكمل الحقول وحدد أيام الأسبوع", "error");
    }
    setSaving(true);
    try {
      const r = await adminFetch(`${API_BASE}/admin/consultation-slots/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bulk, consultationType: bulk.consultationType || undefined, timeZone: "Asia/Riyadh" }),
      });
      const data = await r.json();
      if (!r.ok) { show(data.error || "فشل الإنشاء المجمّع", "error"); return; }
      show(`تم إنشاء ${data.count} موعد`);
      setBulkOpen(false);
      await load();
    } finally { setSaving(false); }
  }

  async function toggleStatus(s: Slot) {
    if (s.status === "booked") return;
    const newStatus = s.status === "available" ? "disabled" : "available";
    const r = await adminFetch(`${API_BASE}/admin/consultation-slots/${s.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (r.ok) { show("تم التحديث"); load(); } else show("فشل التحديث", "error");
  }

  async function del(s: Slot) {
    if (s.status === "booked") return show("لا يمكن حذف موعد محجوز", "error");
    if (!confirm("حذف هذا الموعد؟")) return;
    const r = await adminFetch(`${API_BASE}/admin/consultation-slots/${s.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) { show("تم الحذف"); load(); } else show("فشل الحذف", "error");
  }

  const filtered = items.filter(s => filter === "all" || s.status === filter);
  const weekdayNames = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="مواعيد الاستشارات"
        description="أضف المواعيد المتاحة للحجز من قبل العملاء — يتم عرضها فقط للمواعيد المستقبلية"
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <CalendarPlus className="w-4 h-4 ml-2" /> إنشاء مجمّع
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 ml-2" /> موعد جديد
            </Button>
          </>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all","available","booked","disabled"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold border ${filter===f ? "bg-primary text-primary-foreground border-primary":"bg-background text-muted-foreground border-border"}`}>
            {f === "all" ? "الكل" : statusLabel(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
          لا توجد مواعيد
        </div>
      ) : (
        <div className="border border-border bg-background overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="p-3 text-right font-bold">الموعد</th>
                <th className="p-3 text-right font-bold">المدة</th>
                <th className="p-3 text-right font-bold">النوع</th>
                <th className="p-3 text-right font-bold">الحالة</th>
                <th className="p-3 text-right font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{fmt(s.startsAt)}</td>
                  <td className="p-3">{s.durationMinutes} دق</td>
                  <td className="p-3 text-muted-foreground">{s.consultationType || "—"}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 text-xs font-bold ${statusClass(s.status)}`}>{statusLabel(s.status)}</span></td>
                  <td className="p-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleStatus(s)} disabled={s.status==="booked"}
                        className="text-xs px-2 py-1 border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                        {s.status === "available" ? "إيقاف" : s.status === "disabled" ? "تفعيل" : "محجوز"}
                      </button>
                      <button onClick={() => del(s)} disabled={s.status==="booked"}
                        className="text-xs px-2 py-1 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">
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

      {/* Add single modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-background w-full max-w-md p-6 border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-black text-primary">موعد جديد</h2>
              <button onClick={() => setAdding(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold mb-1 block">التاريخ والوقت (توقيت الرياض)</label>
                <Input type="datetime-local" value={form.startsAt} onChange={e => setForm({...form, startsAt: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">المدة (دقائق)</label>
                <Input type="number" min={15} step={15} value={form.durationMinutes}
                  onChange={e => setForm({...form, durationMinutes: parseInt(e.target.value) || 60})} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">نوع الاستشارة (اختياري)</label>
                <Input value={form.consultationType} onChange={e => setForm({...form, consultationType: e.target.value})}
                  placeholder="مثال: حوكمة شرعية" />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">ملاحظات داخلية (اختياري)</label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={addSlot} disabled={saving} className="flex-1">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />} حفظ
              </Button>
              <Button variant="outline" onClick={() => setAdding(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk modal */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setBulkOpen(false)}>
          <div className="bg-background w-full max-w-lg p-6 border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-black text-primary">إنشاء مواعيد بالجملة</h2>
              <button onClick={() => setBulkOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block">من تاريخ</label>
                  <Input type="date" value={bulk.startDate} onChange={e => setBulk({...bulk, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">إلى تاريخ</label>
                  <Input type="date" value={bulk.endDate} onChange={e => setBulk({...bulk, endDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">أيام الأسبوع</label>
                <div className="flex flex-wrap gap-1.5">
                  {weekdayNames.map((n, i) => {
                    const on = bulk.weekdays.includes(i);
                    return (
                      <button key={i} type="button"
                        onClick={() => setBulk({...bulk, weekdays: on ? bulk.weekdays.filter(d=>d!==i) : [...bulk.weekdays, i]})}
                        className={`px-3 py-1.5 text-xs font-bold border ${on?"bg-primary text-primary-foreground border-primary":"bg-background border-border"}`}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block">من ساعة</label>
                  <Input type="number" min={0} max={23} value={bulk.startHour} onChange={e => setBulk({...bulk, startHour: parseInt(e.target.value)||0})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">إلى ساعة</label>
                  <Input type="number" min={1} max={24} value={bulk.endHour} onChange={e => setBulk({...bulk, endHour: parseInt(e.target.value)||0})} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block">طول الموعد</label>
                  <Input type="number" min={15} step={15} value={bulk.slotMinutes} onChange={e => setBulk({...bulk, slotMinutes: parseInt(e.target.value)||30})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block">نوع الاستشارة (اختياري)</label>
                <Input value={bulk.consultationType} onChange={e => setBulk({...bulk, consultationType: e.target.value})} />
              </div>
              <p className="text-xs text-muted-foreground">الأوقات بتوقيت الرياض (UTC+3).</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={bulkCreate} disabled={saving} className="flex-1">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />} إنشاء
              </Button>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
