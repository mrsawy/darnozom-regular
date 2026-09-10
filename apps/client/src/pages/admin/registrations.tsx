import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Loader2, Users, Download, ChevronDown, ChevronLeft, FileText, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Toast, useToast } from "./layout";

const API_BASE = "/api";

interface Course {
  id: number;
  titleAr: string;
  titleEn: string;
  registrationCount: number;
  seats: number;
}

interface Registration {
  id: number;
  courseId: number;
  fullName: string;
  email: string;
  phone: string;
  organization: string | null;
  registeredAt: string;
}

interface Application {
  id: number;
  applyType: string;
  programId: string | null;
  levelCode: string | null;
  diplomaId: string | null;
  courseId: string | null;
  execProgramId: string | null;
  contextLabelAr: string | null;
  contextLabelEn: string | null;
  fullName: string;
  email: string;
  phone: string;
  organization: string | null;
  country: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

const APPLY_TYPE_LABEL: Record<string, string> = {
  program: "برنامج",
  level: "مستوى",
  diploma: "دبلوم",
  course: "كورس",
  exec: "تنفيذي",
  general: "عام",
};

type Tab = "courses" | "applications";

export default function RegistrationsPage() {
  const [tab, setTab] = useState<Tab>("courses");
  const { toast, show } = useToast();

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader title="تسجيلات الأكاديمية" description="تسجيلات الكورسات وطلبات التحاق الأكاديمية" />

      <div className="flex border-b border-border mb-6 -mt-2">
        <button
          type="button"
          onClick={() => setTab("courses")}
          data-testid="tab-courses"
          className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 ${
            tab === "courses"
              ? "border-secondary text-primary"
              : "border-transparent text-muted-foreground hover:text-primary"
          }`}
        >
          <Users className="w-4 h-4 inline ml-2" />
          تسجيلات الكورسات
        </button>
        <button
          type="button"
          onClick={() => setTab("applications")}
          data-testid="tab-applications"
          className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 ${
            tab === "applications"
              ? "border-secondary text-primary"
              : "border-transparent text-muted-foreground hover:text-primary"
          }`}
        >
          <FileText className="w-4 h-4 inline ml-2" />
          طلبات التحاق الأكاديمية
        </button>
      </div>

      {tab === "courses" ? <CourseRegistrationsPanel show={show} /> : <AcademyApplicationsPanel show={show} />}
    </div>
  );
}

function CourseRegistrationsPanel({ show }: { show: (msg: string) => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCourseId, setOpenCourseId] = useState<number | null>(null);
  const [regs, setRegs] = useState<Record<number, Registration[]>>({});
  const [loadingRegs, setLoadingRegs] = useState<number | null>(null);

  useEffect(() => {
    adminFetch(`${API_BASE}/academy/courses`)
      .then(r => r.json())
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  async function loadRegs(id: number) {
    if (regs[id]) return;
    setLoadingRegs(id);
    try {
      const r = await adminFetch(`${API_BASE}/academy/courses/${id}/registrations`, { credentials: "include" });
      if (r.ok) {
        const data: Registration[] = await r.json();
        setRegs(prev => ({ ...prev, [id]: data }));
      }
    } finally { setLoadingRegs(null); }
  }

  function toggle(id: number) {
    if (openCourseId === id) { setOpenCourseId(null); return; }
    setOpenCourseId(id);
    loadRegs(id);
  }

  function exportCsv(course: Course, list: Registration[]) {
    const rows = [
      ["#", "الاسم", "البريد", "الهاتف", "الجهة", "تاريخ التسجيل"],
      ...list.map(r => [r.id, r.fullName, r.email, r.phone, r.organization || "", new Date(r.registeredAt).toLocaleString("ar-SA")]),
    ];
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `registrations-${course.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    show("تم تصدير الملف");
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>;
  }
  if (courses.length === 0) {
    return (
      <div className="bg-background border border-border p-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">لا توجد دورات</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {courses.map(c => {
        const open = openCourseId === c.id;
        const list = regs[c.id] || [];
        return (
          <div key={c.id} className="bg-background border border-border">
            <button onClick={() => toggle(c.id)} className="w-full p-4 flex items-center justify-between gap-3 text-right hover:bg-muted/20">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-primary">{c.titleAr}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.registrationCount} مسجّل{c.seats > 0 && ` من ${c.seats} مقعد`}
                </div>
              </div>
              {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            {open && (
              <div className="border-t border-border bg-muted/10">
                {loadingRegs === c.id ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : list.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">لا يوجد مسجّلون بعد</div>
                ) : (
                  <>
                    <div className="p-3 flex justify-end border-b border-border">
                      <Button variant="outline" onClick={() => exportCsv(c, list)} className="rounded-none gap-2 text-xs h-8">
                        <Download size={12} /> تصدير CSV
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs bg-muted/40">
                          <tr>
                            <th className="text-right p-3 font-bold">الاسم</th>
                            <th className="text-right p-3 font-bold">البريد</th>
                            <th className="text-right p-3 font-bold">الهاتف</th>
                            <th className="text-right p-3 font-bold hidden sm:table-cell">الجهة</th>
                            <th className="text-right p-3 font-bold hidden md:table-cell">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {list.map(r => (
                            <tr key={r.id}>
                              <td className="p-3 font-bold text-primary">{r.fullName}</td>
                              <td className="p-3 text-muted-foreground" dir="ltr">{r.email}</td>
                              <td className="p-3 text-muted-foreground" dir="ltr">{r.phone}</td>
                              <td className="p-3 text-muted-foreground hidden sm:table-cell">{r.organization || "—"}</td>
                              <td className="p-3 text-muted-foreground hidden md:table-cell">{new Date(r.registeredAt).toLocaleDateString("ar-SA")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AcademyApplicationsPanel({ show }: { show: (msg: string) => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    adminFetch(`${API_BASE}/academy/applications`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: Application[]) => setApps(d))
      .finally(() => setLoading(false));
  }, []);

  const filtered = apps.filter(a => {
    if (filterType !== "all" && a.applyType !== filterType) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  function exportCsv(list: Application[]) {
    const rows = [
      ["#", "النوع", "السياق", "الاسم", "البريد", "الهاتف", "الجهة", "الدولة", "الحالة", "ملاحظات", "التاريخ"],
      ...list.map(a => [
        a.id,
        APPLY_TYPE_LABEL[a.applyType] || a.applyType,
        a.contextLabelAr || a.contextLabelEn || "—",
        a.fullName,
        a.email,
        a.phone,
        a.organization || "",
        a.country || "",
        a.status,
        a.notes || "",
        new Date(a.createdAt).toLocaleString("ar-SA"),
      ]),
    ];
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `academy-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    show("تم تصدير الملف");
  }

  async function updateStatus(id: number, status: string) {
    const r = await adminFetch(`${API_BASE}/academy/applications/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (r.ok) {
      setApps(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
      show("تم تحديث الحالة");
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-secondary" /></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            data-testid="filter-apply-type"
            className="px-3 py-2 text-xs border border-border bg-background text-primary"
          >
            <option value="all">كل الأنواع</option>
            <option value="program">برنامج</option>
            <option value="level">مستوى</option>
            <option value="diploma">دبلوم</option>
            <option value="course">كورس</option>
            <option value="exec">تنفيذي</option>
            <option value="general">عام</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            data-testid="filter-apply-status"
            className="px-3 py-2 text-xs border border-border bg-background text-primary"
          >
            <option value="all">كل الحالات</option>
            <option value="new">جديد</option>
            <option value="contacted">تم التواصل</option>
            <option value="enrolled">تم التسجيل</option>
            <option value="declined">مرفوض</option>
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} طلب</span>
        </div>
        {filtered.length > 0 && (
          <Button variant="outline" onClick={() => exportCsv(filtered)} className="rounded-none gap-2 text-xs h-8" data-testid="export-applications">
            <Download size={12} /> تصدير CSV
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد طلبات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const isOpen = openId === a.id;
            return (
              <div key={a.id} className="bg-background border border-border" data-testid={`application-${a.id}`}>
                <button
                  onClick={() => setOpenId(isOpen ? null : a.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-right hover:bg-muted/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-secondary/15 text-primary uppercase tracking-wider">
                        {APPLY_TYPE_LABEL[a.applyType] || a.applyType}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        a.status === "new" ? "bg-blue-100 text-blue-800" :
                        a.status === "contacted" ? "bg-secondary/15 text-primary" :
                        a.status === "enrolled" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {a.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <div className="font-bold text-primary truncate">{a.fullName}</div>
                    {(a.contextLabelAr || a.contextLabelEn) && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {a.contextLabelAr || a.contextLabelEn}
                      </div>
                    )}
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/10 p-4 space-y-3 text-sm">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">البريد</div>
                        <a href={`mailto:${a.email}`} className="text-primary hover:text-secondary inline-flex items-center gap-1.5" dir="ltr">
                          <Mail className="w-3 h-3" />{a.email}
                        </a>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">الهاتف</div>
                        <a href={`tel:${a.phone}`} className="text-primary hover:text-secondary inline-flex items-center gap-1.5" dir="ltr">
                          <Phone className="w-3 h-3" />{a.phone}
                        </a>
                      </div>
                      {a.organization && (
                        <div>
                          <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">الجهة</div>
                          <div className="text-primary">{a.organization}</div>
                        </div>
                      )}
                      {a.country && (
                        <div>
                          <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">الدولة</div>
                          <div className="text-primary">{a.country}</div>
                        </div>
                      )}
                    </div>
                    {a.notes && (
                      <div>
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">ملاحظات</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{a.notes}</div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">تحديث الحالة:</span>
                      {["new", "contacted", "enrolled", "declined"].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateStatus(a.id, s)}
                          disabled={a.status === s}
                          data-testid={`set-status-${a.id}-${s}`}
                          className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                            a.status === s
                              ? "bg-primary text-primary-foreground border-primary cursor-default"
                              : "bg-background text-primary border-border hover:border-secondary"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
