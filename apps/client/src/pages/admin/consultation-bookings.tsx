import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Loader2, Video, ExternalLink, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Toast, useToast } from "./layout";

const API_BASE = "/api";

interface Booking {
  id: number;
  slotId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  consultationType: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed";
  googleEventId: string | null;
  googleMeetLink: string | null;
  googleEventHtmlLink: string | null;
  calendarSyncError: string | null;
  createdAt: string;
  startsAt: string;
  durationMinutes: number;
}

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: "Asia/Riyadh",
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function statusLabel(s: Booking["status"]) {
  return s === "confirmed" ? "مؤكّد" : s === "cancelled" ? "ملغى" : "مكتمل";
}
function statusClass(s: Booking["status"]) {
  return s === "confirmed" ? "bg-emerald-100 text-emerald-800"
    : s === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";
}

export default function ConsultationBookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "confirmed" | "cancelled" | "completed">("all");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const url = filter === "all"
        ? `${API_BASE}/admin/consultation-bookings`
        : `${API_BASE}/admin/consultation-bookings?status=${filter}`;
      const r = await adminFetch(url, { credentials: "include" });
      if (r.ok) setItems(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [filter]);

  async function cancel(b: Booking) {
    if (!confirm(`إلغاء حجز ${b.clientName}؟ سيتم حذف الحدث من Google Calendar.`)) return;
    const r = await adminFetch(`${API_BASE}/admin/consultation-bookings/${b.id}/cancel`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) { show("تم الإلغاء"); load(); } else show("فشل الإلغاء", "error");
  }
  async function markComplete(b: Booking) {
    const r = await adminFetch(`${API_BASE}/admin/consultation-bookings/${b.id}/complete`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) { show("تم وضع علامة 'مكتمل'"); load(); } else show("فشل التحديث", "error");
  }

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="حجوزات الاستشارات" description="إدارة حجوزات العملاء وروابط Google Meet" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all","confirmed","completed","cancelled"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold border ${filter===f ? "bg-primary text-primary-foreground border-primary":"bg-background text-muted-foreground border-border"}`}>
            {f === "all" ? "الكل" : statusLabel(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border border-dashed border-border">
          <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
          لا توجد حجوزات
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(b => (
            <div key={b.id} className="border border-border bg-background p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-primary">{b.clientName}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold ${statusClass(b.status)}`}>{statusLabel(b.status)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>📅 {fmt(b.startsAt)} • {b.durationMinutes} دق</div>
                    <div>✉️ {b.clientEmail} {b.clientPhone && <>• 📞 {b.clientPhone}</>}</div>
                    {b.consultationType && <div>📋 {b.consultationType}</div>}
                  </div>
                  {b.notes && (
                    <div className="mt-2 text-sm bg-muted/40 border-r-2 border-secondary p-2">
                      <span className="font-bold text-xs">ملاحظات العميل: </span>{b.notes}
                    </div>
                  )}
                  {b.calendarSyncError && (
                    <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>تنبيه Google Calendar: {b.calendarSyncError}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end shrink-0">
                  {b.googleMeetLink && (
                    <a href={b.googleMeetLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-primary hover:text-secondary flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> رابط Meet <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {b.googleEventHtmlLink && (
                    <a href={b.googleEventHtmlLink} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                      الحدث على Calendar <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {b.status === "confirmed" && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => markComplete(b)}>
                        <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> مكتمل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => cancel(b)}
                        className="text-red-600 hover:bg-red-50">
                        <XCircle className="w-3.5 h-3.5 ml-1" /> إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
