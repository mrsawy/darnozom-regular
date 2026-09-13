import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import { useSession } from "@/lib/auth-client";
import { Loader2, Video, ExternalLink, Calendar, ArrowRight, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

interface Booking {
  id: number;
  slotId: number;
  clientName: string;
  clientEmail: string;
  consultationType: string | null;
  notes: string | null;
  status: "confirmed" | "cancelled" | "completed";
  googleMeetLink: string | null;
  googleEventHtmlLink: string | null;
  calendarSyncError: string | null;
  startsAt: string;
  durationMinutes: number;
  createdAt: string;
}

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: "Asia/Riyadh",
      weekday: "long", year: "numeric", month: "long", day: "numeric",
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

export default function AccountConsultationsPage() {
  const { data: session, isPending } = useSession();
  const isSignedIn = !!session?.user;
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/account/me/bookings", {
        credentials: "include",
      });
      if (r.ok) {
        const data = await r.json();
        setItems(data.bookings || []);
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { if (isSignedIn) load(); }, [isSignedIn]);

  async function cancel(b: Booking) {
    if (!confirm("إلغاء هذه الاستشارة؟")) return;
    const r = await fetch(`/api/account/me/bookings/${b.id}/cancel`, {
      method: "POST",
      credentials: "include",
    });
    if (r.ok) load();
  }

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!isSignedIn) return <Redirect to="/sign-in" />;

  return (
    <div dir="rtl" className="min-h-screen bg-background islamic-pattern flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-28 pb-16">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/account" className="hover:underline">حسابي</Link>
              <ArrowRight className="w-3 h-3 rotate-180" />
              <span>استشاراتي</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-secondary tracking-[0.2em] uppercase mb-2">
              <span className="h-px w-10 bg-secondary" />
              <span>Consultations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-primary">استشاراتي</h1>
          </div>
          <Link href="/services/consulting/book">
            <Button>احجز استشارة جديدة</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground mb-4">لا توجد استشارات بعد.</p>
            <Link href="/services/consulting/book"><Button>احجز استشارتك الأولى</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(b => {
              const upcoming = new Date(b.startsAt).getTime() > Date.now();
              return (
                <div key={b.id} className="border border-secondary/20 bg-card shadow-[0_12px_40px_rgba(15,61,46,0.06)] p-4">
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 text-xs font-bold ${statusClass(b.status)}`}>{statusLabel(b.status)}</span>
                        {b.consultationType && <span className="text-xs text-muted-foreground">{b.consultationType}</span>}
                      </div>
                      <div className="font-bold text-primary">{fmt(b.startsAt)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{b.durationMinutes} دقيقة</div>
                      {b.notes && <div className="text-sm text-muted-foreground mt-2">{b.notes}</div>}
                      {b.calendarSyncError && b.status === "confirmed" && (
                        <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>سيتم إرسال رابط الاجتماع قريباً عبر البريد الإلكتروني.</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      {b.status === "confirmed" && b.googleMeetLink && (
                        <a href={b.googleMeetLink} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 text-sm font-bold hover:bg-primary/90">
                          <Video className="w-3.5 h-3.5" /> انضم Meet
                        </a>
                      )}
                      {b.status === "confirmed" && b.googleEventHtmlLink && (
                        <a href={b.googleEventHtmlLink} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                          Calendar <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {b.status === "confirmed" && upcoming && (
                        <button onClick={() => cancel(b)}
                          className="text-xs text-red-600 hover:underline flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> إلغاء
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
