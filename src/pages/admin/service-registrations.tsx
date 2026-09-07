import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import {
  Loader2, FileText, Download, ChevronDown, ChevronLeft, Mail, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Toast, useToast } from "./layout";

const API_BASE = "/api";

interface ServiceRegistration {
  id: number;
  fullName: string;
  jobTitle: string | null;
  organization: string;
  email: string;
  phone: string | null;
  country: string | null;
  servicesOfInterest: string[];
  projectDescription: string;
  submissionType: string;
  status: string;
  createdAt: string;
}

// Currently selectable service types (kept in sync with the website's
// service-registration form and the API's ALLOWED_SERVICE_REGISTRATION_TYPES).
// AI Consulting Agent ("ai-agent") is intentionally excluded — it is a
// standalone platform, not a service that can be registered for.
const SERVICE_LABEL: Record<string, string> = {
  "islamic-systems": "أنظمة الحوكمة والامتثال الشرعي",
  "management-systems": "الإدارة",
  "digital-transformation": "التحول الرقمي",
  "academy": "أكاديمية دار نظم",
  "research": "البحث والتطوير",
  "publishing": "النشر والترجمة",
  "store": "المتجر الإلكتروني",
  "other": "أخرى",
};

// Read-only labels for legacy service ids that may appear on historical
// records. Used for display only; never offered in filters or new submissions.
const LEGACY_SERVICE_LABEL: Record<string, string> = {
  "ai-agent": "وكيل الاستشارات الذكي",
};

function serviceLabel(id: string): string {
  return SERVICE_LABEL[id] || LEGACY_SERVICE_LABEL[id] || id;
}

export default function ServiceRegistrationsPage() {
  const [items, setItems] = useState<ServiceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [filterService, setFilterService] = useState<string>("all");
  const { toast, show } = useToast();

  useEffect(() => {
    adminFetch(`${API_BASE}/service-registrations`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ServiceRegistration[]) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((s) => {
    if (filterService !== "all") {
      const sv = s.servicesOfInterest?.[0];
      if (sv !== filterService) return false;
    }
    return true;
  });

  function exportCsv(list: ServiceRegistration[]) {
    const rows = [
      ["#", "الاسم", "المؤسسة", "المسمى", "البريد", "الهاتف", "الدولة", "الخدمة", "ملاحظات", "التاريخ"],
      ...list.map((a) => [
        a.id,
        a.fullName,
        a.organization,
        a.jobTitle || "",
        a.email,
        a.phone || "",
        a.country || "",
        serviceLabel(a.servicesOfInterest?.[0] || ""),
        a.projectDescription || "",
        new Date(a.createdAt).toLocaleString("ar-SA"),
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `service-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    show("تم تصدير الملف");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="تسجيلات الخدمات"
        description="طلبات تسجيل الخدمات الواردة من صفحات الخدمات الاستشارية"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            data-testid="filter-service"
            className="px-3 py-2 text-xs border border-border bg-background text-primary"
          >
            <option value="all">كل الخدمات</option>
            {Object.entries(SERVICE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} طلب</span>
        </div>
        {filtered.length > 0 && (
          <Button
            variant="outline"
            onClick={() => exportCsv(filtered)}
            className="rounded-none gap-2 text-xs h-8"
            data-testid="export-service-registrations"
          >
            <Download size={12} /> تصدير CSV
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-background border border-border p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">لا توجد تسجيلات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const isOpen = openId === a.id;
            const svc = a.servicesOfInterest?.[0] || "";
            return (
              <div key={a.id} className="bg-background border border-border" data-testid={`service-registration-${a.id}`}>
                <button
                  onClick={() => setOpenId(isOpen ? null : a.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-right hover:bg-muted/20"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-secondary/15 text-primary uppercase tracking-wider">
                        {serviceLabel(svc)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <div className="font-bold text-primary truncate">{a.fullName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.organization}</div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
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
                      {a.phone && (
                        <div>
                          <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">الهاتف</div>
                          <a href={`tel:${a.phone}`} className="text-primary hover:text-secondary inline-flex items-center gap-1.5" dir="ltr">
                            <Phone className="w-3 h-3" />{a.phone}
                          </a>
                        </div>
                      )}
                      {a.jobTitle && (
                        <div>
                          <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">المسمى الوظيفي</div>
                          <div className="text-primary">{a.jobTitle}</div>
                        </div>
                      )}
                      {a.country && (
                        <div>
                          <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">الدولة</div>
                          <div className="text-primary">{a.country}</div>
                        </div>
                      )}
                    </div>
                    {a.projectDescription && (
                      <div>
                        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">ملاحظات</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{a.projectDescription}</div>
                      </div>
                    )}
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
