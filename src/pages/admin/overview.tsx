import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Link } from "wouter";
import { BookOpen, GraduationCap, School, CalendarDays, Users, ArrowLeft, Loader2, Package, AlertTriangle } from "lucide-react";
import { PageHeader } from "./layout";

// Checks whether Paymob card payments are configured (same endpoint the
// checkout page uses) so the owner is told when the card option is disabled.
function useCardEligibility(): "checking" | "eligible" | "ineligible" {
  const [state, setState] = useState<"checking" | "eligible" | "ineligible">("checking");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/paymob-config", { credentials: "include" });
        const cfg = await res.json().catch(() => ({}));
        if (cancelled) return;
        setState(res.ok && cfg.cardEnabled ? "eligible" : "ineligible");
      } catch {
        if (!cancelled) setState("ineligible");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

interface Stats {
  books: number;
  storeCourses: number;
  academyCourses: number;
  upcomingEvents: number;
  totalEvents: number;
  registrationsThisMonth: number;
  totalRegistrations: number;
  pendingOrders: number;
  totalOrders: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cardEligibility = useCardEligibility();

  useEffect(() => {
    adminFetch("/api/admin/stats", { credentials: "include" })
      .then(async r => {
        if (!r.ok) throw new Error("فشل تحميل الإحصائيات");
        return r.json();
      })
      .then((data: Stats) => setStats(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> جارٍ التحميل...
      </div>
    );
  }
  if (error || !stats) {
    return <div className="text-red-600 text-sm">{error || "تعذّر تحميل البيانات"}</div>;
  }

  const cards = [
    { label: "الكتب", value: stats.books, icon: BookOpen, href: "/admin/books", color: "from-blue-500/10 to-blue-500/5", iconColor: "text-blue-500" },
    { label: "دورات المتجر", value: stats.storeCourses, icon: GraduationCap, href: "/admin/store-courses", color: "from-purple-500/10 to-purple-500/5", iconColor: "text-purple-500" },
    { label: "دورات الأكاديمية", value: stats.academyCourses, icon: School, href: "/admin/academy", color: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-500" },
    { label: "فعاليات قادمة", value: stats.upcomingEvents, sub: `من إجمالي ${stats.totalEvents}`, icon: CalendarDays, href: "/admin/events", color: "from-secondary/10 to-secondary/5", iconColor: "text-secondary" },
    { label: "طلبات المتجر قيد الانتظار", value: stats.pendingOrders, sub: `من إجمالي ${stats.totalOrders}`, icon: Package, href: "/admin/orders", color: "from-indigo-500/10 to-indigo-500/5", iconColor: "text-indigo-500" },
    { label: "تسجيلات هذا الشهر", value: stats.registrationsThisMonth, sub: `من إجمالي ${stats.totalRegistrations}`, icon: Users, href: "/admin/registrations", color: "from-teal-500/10 to-teal-500/5", iconColor: "text-teal-500" },
  ];

  return (
    <div>
      <PageHeader title="نظرة عامة" description="ملخّص سريع لمحتوى المتجر والأكاديمية والفعاليات" />

      {cardEligibility === "ineligible" && (
        <div
          className="mb-6 flex items-start gap-3 border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm"
          data-testid="note-card-ineligible"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <div className="font-bold mb-1">الدفع بالبطاقة غير مفعّل في المتجر</div>
            <p className="text-xs leading-relaxed">
              الدفع بالبطاقة يعمل عبر بوابة Paymob ويتطلب إعداد أربعة مفاتيح سرّية في إعدادات
              التطبيق: <span dir="ltr" className="font-mono">PAYMOB_API_KEY</span>،{" "}
              <span dir="ltr" className="font-mono">PAYMOB_INTEGRATION_ID</span>،{" "}
              <span dir="ltr" className="font-mono">PAYMOB_IFRAME_ID</span>،{" "}
              <span dir="ltr" className="font-mono">PAYMOB_HMAC_SECRET</span>. تجدها في لوحة تحكم
              Paymob (Settings → Account Info وPayment Integrations وiFrames). حتى اكتمال الإعداد
              يظهر خيار البطاقة للعملاء مع تنبيه بأنه غير مفعّل بعد.
            </p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}>
              <div className={`bg-gradient-to-bl ${c.color} border border-border p-5 cursor-pointer hover:border-secondary/40 transition-colors group`}>
                <div className="flex items-start justify-between mb-3">
                  <Icon className={`w-6 h-6 ${c.iconColor}`} />
                  <ArrowLeft className="w-4 h-4 text-muted-foreground/40 group-hover:text-secondary group-hover:-translate-x-1 transition-all" />
                </div>
                <div className="text-3xl font-black text-primary">{c.value.toLocaleString("ar-SA")}</div>
                <div className="text-sm font-bold text-muted-foreground mt-1">{c.label}</div>
                {c.sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{c.sub}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
