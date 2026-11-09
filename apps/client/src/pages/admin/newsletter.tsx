import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { adminFetchJson } from "@/lib/admin-api";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";

type Row = { id: number; email: string; status: "pending" | "confirmed" | "unsubscribed"; locale: string; createdAt: string; confirmedAt: string | null };
const STATUS_AR: Record<Row["status"], string> = { pending: "بانتظار التأكيد", confirmed: "مؤكَّد", unsubscribed: "ملغى" };

export default function AdminNewsletter() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [confirmed, setConfirmed] = useState(0);
  const { toast, show } = useToast();

  useEffect(() => {
    adminFetchJson<{ items: Row[]; confirmed: number }>("/api/admin/newsletter/subscribers")
      .then((r) => { setRows(r.items); setConfirmed(r.confirmed); })
      .catch((e) => show((e as Error).message, "error"));
  }, []);

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="مشتركو النشرة البريدية"
        description={rows ? `${confirmed} مشترك مؤكَّد من أصل ${rows.length}` : undefined}
        actions={
          <a href="/api/admin/newsletter/subscribers.csv" className="inline-flex items-center gap-2 text-sm underline">
            <Download className="w-4 h-4" /> تصدير CSV
          </a>
        }
      />
      {rows === null ? <p className="text-sm text-ink-muted">جارٍ التحميل…</p> : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">لا يوجد مشتركون بعد.</p>
      ) : (
        <div className="overflow-x-auto border border-line rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr><th className="p-3 text-start">البريد</th><th className="p-3 text-start">الحالة</th><th className="p-3 text-start">اللغة</th><th className="p-3 text-start">تاريخ الاشتراك</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="p-3" dir="ltr">{r.email}</td>
                  <td className="p-3">{STATUS_AR[r.status]}</td>
                  <td className="p-3">{r.locale === "en" ? "English" : "العربية"}</td>
                  <td className="p-3">{new Date(r.createdAt).toLocaleDateString("ar-EG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
