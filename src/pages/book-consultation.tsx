import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { Loader2, Calendar, Clock, CheckCircle2, Video, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

interface Slot {
  id: number;
  startsAt: string;
  durationMinutes: number;
  consultationType: string | null;
  notes: string | null;
}

interface BookingResult {
  id: number;
  clientName: string;
  clientEmail: string;
  consultationType: string | null;
  googleMeetLink: string | null;
  googleEventHtmlLink: string | null;
  calendarSyncError: string | null;
  status: string;
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-SA-u-ca-gregory", {
    timeZone: "Asia/Riyadh",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function timeFmt(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export default function BookConsultationPage() {
  const { user, isSignedIn } = useUser();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ booking: BookingResult; slot: Slot } | null>(null);
  const [form, setForm] = useState({ clientName: "", clientEmail: "", clientPhone: "", consultationType: "", notes: "" });

  useEffect(() => {
    if (isSignedIn && user) {
      setForm(f => ({
        ...f,
        clientName: f.clientName || user.fullName || user.firstName || "",
        clientEmail: f.clientEmail || user.primaryEmailAddress?.emailAddress || "",
      }));
    }
  }, [isSignedIn, user]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/consultation-slots/available");
      if (r.ok) setSlots(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.startsAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return Array.from(m.entries());
  }, [slots]);

  async function submit() {
    if (!selected) return;
    setError(null);
    if (!form.clientName.trim()) return setError("الاسم مطلوب");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail.trim())) return setError("بريد إلكتروني غير صالح");
    setSubmitting(true);
    try {
      const r = await fetch("/api/consultation-bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selected.id,
          clientName: form.clientName.trim(),
          clientEmail: form.clientEmail.trim(),
          clientPhone: form.clientPhone.trim() || undefined,
          consultationType: form.consultationType.trim() || undefined,
          notes: form.notes.trim() || undefined,
          userId: user?.id || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "تعذّر إتمام الحجز");
        if (r.status === 409) { setSelected(null); await load(); }
        return;
      }
      setResult({ booking: data.booking, slot: data.slot });
    } catch {
      setError("حدث خطأ في الشبكة");
    } finally { setSubmitting(false); }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="bg-primary text-primary-foreground py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-secondary mb-2">
              <Link href="/services/consulting" className="hover:underline">الاستشارات</Link>
              <ArrowRight className="w-3 h-3 rotate-180" />
              <span>حجز موعد</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">احجز استشارة عبر Google Meet</h1>
            <p className="text-primary-foreground/70 max-w-2xl">
              اختر الموعد المناسب لك، ستصلك رسالة تأكيد ورابط Google Meet عبر البريد الإلكتروني.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 py-10 bg-[#F4ECD7]">
          {result ? (
            <SuccessCard result={result} />
          ) : loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : slots.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">لا توجد مواعيد متاحة حالياً.</p>
              <p className="text-xs text-muted-foreground mt-1">يرجى المراجعة لاحقاً أو <Link href="/contact" className="text-primary underline">التواصل معنا</Link>.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-[1fr_360px] gap-6">
              <div className="space-y-6">
                {grouped.map(([day, daySlots]) => (
                  <div key={day}>
                    <h3 className="font-black text-primary text-sm mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-secondary" /> {day}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {daySlots.map(s => {
                        const on = selected?.id === s.id;
                        return (
                          <button key={s.id} onClick={() => setSelected(s)}
                            className={`p-3 border text-sm font-bold transition ${
                              on ? "bg-primary text-primary-foreground border-primary"
                                 : "bg-background border-border hover:border-secondary hover:bg-secondary/5"
                            }`}>
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {timeFmt(s.startsAt)}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${on ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {s.durationMinutes} دقيقة
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <aside className="bg-background border border-border p-5 sticky top-20 self-start">
                <h3 className="font-black text-primary mb-3">بيانات الحجز</h3>
                {selected ? (
                  <>
                    <div className="bg-secondary/10 border-r-2 border-secondary p-3 mb-4 text-sm">
                      <div className="font-bold text-primary">{dayKey(selected.startsAt)}</div>
                      <div className="text-muted-foreground text-xs mt-1">
                        الساعة {timeFmt(selected.startsAt)} • {selected.durationMinutes} دق
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold mb-1 block">الاسم الكامل *</label>
                        <Input value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold mb-1 block">البريد الإلكتروني *</label>
                        <Input type="email" dir="ltr" value={form.clientEmail} onChange={e => setForm({...form, clientEmail: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold mb-1 block">رقم الجوال (اختياري)</label>
                        <Input dir="ltr" value={form.clientPhone} onChange={e => setForm({...form, clientPhone: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-xs font-bold mb-1 block">نوع الاستشارة</label>
                        <Input value={form.consultationType} onChange={e => setForm({...form, consultationType: e.target.value})}
                          placeholder={selected.consultationType || "مثال: حوكمة شرعية"} />
                      </div>
                      <div>
                        <label className="text-xs font-bold mb-1 block">ملاحظات (اختياري)</label>
                        <Textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                      </div>
                      {error && (
                        <div className="text-xs bg-red-50 border border-red-200 text-red-700 p-2 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
                        </div>
                      )}
                      <Button onClick={submit} disabled={submitting} className="w-full">
                        {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        تأكيد الحجز
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">اختر موعداً من القائمة على اليمين.</p>
                )}
              </aside>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SuccessCard({ result }: { result: { booking: BookingResult; slot: Slot } }) {
  const { booking, slot } = result;
  return (
    <div className="max-w-xl mx-auto bg-background border border-border p-8 text-center">
      <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-primary mb-2">تم تأكيد الحجز ✓</h2>
      <p className="text-muted-foreground text-sm mb-5">شكراً {booking.clientName}، أرسلنا تفاصيل الموعد إلى {booking.clientEmail}.</p>
      <div className="bg-muted/30 p-4 text-right border-r-2 border-secondary mb-5">
        <div className="font-bold text-primary">{dayKey(slot.startsAt)}</div>
        <div className="text-sm text-muted-foreground mt-1">الساعة {timeFmt(slot.startsAt)} • {slot.durationMinutes} دق</div>
      </div>
      {booking.googleMeetLink ? (
        <a href={booking.googleMeetLink} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 font-bold hover:bg-primary/90 mb-3">
          <Video className="w-4 h-4" /> انضم عبر Google Meet
        </a>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 mb-3">
          سيتم إرسال رابط الاجتماع لاحقاً عبر بريد إلكتروني منفصل.
        </div>
      )}
      <div className="flex gap-2 justify-center mt-4">
        <Link href="/account/consultations" className="text-sm text-primary hover:underline">عرض استشاراتي</Link>
        <span className="text-muted-foreground">•</span>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
