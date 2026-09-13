import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Loader2, Plus, Trash2, ShieldCheck, Lock, AlertTriangle, History, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Toast, useToast } from "./layout";

interface DbAdmin {
  /** The user's id — admin is a role on the account, not a separate row. */
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "super_admin";
  addedByEmail: string | null;
  note: string | null;
  createdAt: string;
  source: "db";
}
interface EnvAdmin {
  email: string;
  source: "env";
}
interface AdminsResponse {
  currentEmail: string | null;
  admins: DbAdmin[];
  bootstrapAdmins: EnvAdmin[];
}
interface AdminEvent {
  id: number;
  action: string;
  targetEmail: string;
  actorEmail: string | null;
  note: string | null;
  createdAt: string;
}

export default function AdminsPage() {
  const [data, setData] = useState<AdminsResponse | null>(null);
  const [eventsData, setEventsData] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try {
      const [r, er] = await Promise.all([
        adminFetch("/api/admin/admins", { credentials: "include" }),
        adminFetch("/api/admin/admins/events", { credentials: "include" }),
      ]);
      if (!r.ok) throw new Error("failed");
      setData(await r.json());
      if (er.ok) {
        const body = await er.json();
        setEventsData(Array.isArray(body.events) ? body.events : []);
      }
    } catch {
      show("تعذّر تحميل قائمة المشرفين", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/admins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), note: note.trim() || undefined }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        show(body.error || "فشل منح الصلاحية", "error");
        return;
      }
      show("تم منح الصلاحية");
      setEmail(""); setNote(""); setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const r = await adminFetch(`/api/admin/admins/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        show(body.error || "فشل سحب الصلاحية", "error");
        return;
      }
      show("تم سحب الصلاحية");
      setConfirmId(null);
      load();
    } finally {
      setDeletingId(null);
    }
  }

  const currentEmail = data?.currentEmail?.toLowerCase() ?? "";

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="المشرفون"
        description="امنح أو اسحب صلاحية الإشراف لحسابات موجودة بالبريد الإلكتروني."
        actions={
          <Button onClick={() => setShowForm((s) => !s)} className="gap-2 rounded-none">
            <Plus className="w-4 h-4" /> {showForm ? "إغلاق" : "منح صلاحية إشراف"}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={add} className="bg-background border border-border p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-bold text-primary mb-1">البريد الإلكتروني *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              dir="ltr"
              className="rounded-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              يجب أن يكون لدى الشخص حساب على الموقع بهذا البريد بالفعل. إن لم يكن كذلك، اطلب منه إنشاء حساب أولاً ثم امنحه الصلاحية.
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-1">ملاحظة (اختياري)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="مثال: مدير المحتوى"
              className="rounded-none"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="gap-2 rounded-none">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              حفظ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowForm(false); setEmail(""); setNote(""); }}
              className="rounded-none"
            >
              إلغاء
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل...
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-black text-primary mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> المشرفون الحاليون ({data?.admins.length ?? 0})
            </h2>
            {data && data.admins.length > 0 ? (
              <div className="bg-background border border-border divide-y divide-border">
                {data.admins.map((a) => {
                  const isSelf = a.email.toLowerCase() === currentEmail;
                  return (
                    <div key={a.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-bold text-primary text-sm break-all" dir="ltr">
                          {a.email}
                          {isSelf && (
                            <span className="mr-2 text-xs font-normal text-secondary">(أنت)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {a.name ? `${a.name} · ` : ""}
                          {a.role === "super_admin" ? "مشرف عام · " : ""}
                          {a.addedByEmail ? `منحه: ${a.addedByEmail}` : "مُنح مباشرة"}
                          {" · "}
                          {new Date(a.createdAt).toLocaleDateString("ar")}
                        </div>
                        {a.note && (
                          <div className="text-xs text-muted-foreground mt-1">{a.note}</div>
                        )}
                      </div>
                      {confirmId === a.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> تأكيد؟
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => remove(a.id)}
                            disabled={deletingId === a.id}
                            className="rounded-none"
                          >
                            {deletingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "حذف"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmId(null)}
                            className="rounded-none"
                          >
                            إلغاء
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmId(a.id)}
                          disabled={isSelf}
                          title={isSelf ? "لا يمكنك حذف نفسك" : "حذف المشرف"}
                          className="gap-1 rounded-none"
                        >
                          <Trash2 className="w-3 h-3" /> حذف
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-background border border-border p-4">
                لا يوجد مشرفون في قاعدة البيانات. أضف الأول من الزر أعلاه.
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-black text-primary mb-2 flex items-center gap-2">
              <History className="w-4 h-4" /> سجل النشاط ({eventsData.length})
            </h2>
            {eventsData.length > 0 ? (
              <div className="bg-background border border-border divide-y divide-border max-h-96 overflow-y-auto">
                {eventsData.map((ev) => {
                  const isAdd = ev.action === "added";
                  return (
                    <div key={ev.id} className="p-3 flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-6 h-6 flex items-center justify-center shrink-0 ${
                          isAdd ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isAdd ? <UserPlus className="w-3 h-3" /> : <UserMinus className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-primary">
                          <span className="font-bold" dir="ltr">{ev.actorEmail || "النظام"}</span>
                          <span className="mx-1">{isAdd ? "أضاف" : "حذف"}</span>
                          <span className="font-bold" dir="ltr">{ev.targetEmail}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(ev.createdAt).toLocaleString("ar")}
                        </div>
                        {ev.note && (
                          <div className="text-xs text-muted-foreground mt-1">{ev.note}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-background border border-border p-4">
                لا توجد أحداث مسجلة بعد.
              </div>
            )}
          </section>

          {data && data.bootstrapAdmins.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-primary mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" /> مشرفون من متغيرات البيئة ({data.bootstrapAdmins.length})
              </h2>
              <p className="text-xs text-muted-foreground mb-2">
                هؤلاء المشرفون مُعرَّفون عبر <code className="font-mono">ADMIN_EMAILS</code> ولا يمكن حذفهم من هنا.
              </p>
              <div className="bg-background border border-border divide-y divide-border">
                {data.bootstrapAdmins.map((a) => (
                  <div key={a.email} className="p-3 flex items-center justify-between gap-3">
                    <div className="font-bold text-primary text-sm break-all" dir="ltr">{a.email}</div>
                    <span className="text-xs text-muted-foreground">من البيئة</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
