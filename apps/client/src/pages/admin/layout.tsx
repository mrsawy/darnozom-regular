import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { signOut, useSession } from "@/lib/auth-client";
import {
  LayoutDashboard, BookOpen, GraduationCap, School, CalendarDays,
  Users, LogOut, Loader2, Menu, X, ShieldAlert, ShieldCheck,
  Briefcase, FileText, Package, RefreshCw, Truck, Video, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminStatus } from "@/lib/use-admin-status";

export { useAdminStatus };

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/books", label: "الكتب", icon: BookOpen },
  { href: "/admin/store-courses", label: "دورات المتجر", icon: GraduationCap },
  { href: "/admin/academy", label: "الأكاديمية", icon: School },
  { href: "/admin/events", label: "الفعاليات", icon: CalendarDays },
  { href: "/admin/consultation-slots", label: "مواعيد الاستشارات", icon: Clock },
  { href: "/admin/consultation-bookings", label: "حجوزات الاستشارات", icon: Video },
  { href: "/admin/orders", label: "طلبات المتجر", icon: Package },
  { href: "/admin/shipping", label: "أسعار الشحن", icon: Truck },
  { href: "/admin/service-registrations", label: "تسجيلات الخدمات", icon: FileText },
  { href: "/admin/registrations", label: "تسجيلات الطلاب", icon: Users },
  { href: "/admin/jobs", label: "الوظائف", icon: Briefcase },
  { href: "/admin/job-applications", label: "طلبات التوظيف", icon: FileText },
  { href: "/admin/admins", label: "المشرفون", icon: ShieldCheck },
];

function VerifyingScreen({ onRetry }: { onRetry?: () => void }) {
  useEffect(() => {
    if (!onRetry) return;
    const id = setTimeout(() => onRetry(), 1500);
    return () => clearTimeout(id);
  }, [onRetry]);
  return (
    <div className="min-h-[100dvh] flex items-center justify-center dark bg-[#0F3D2E] text-white" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحقق...
      </div>
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { status, loading, refetch } = useAdminStatus();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const isLoaded = !isPending;
  const [location] = useLocation();

  // Wait until both the session and the admin check have resolved.
  if (!isLoaded || loading) {
    return <VerifyingScreen />;
  }

  // Only treat the user as signed out when the session itself says so. This
  // avoids a redirect loop: /sign-in forwards a signed-in user to /account.
  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  // The client has a session but /api/admin/me hasn't confirmed it yet
  // (transient/unresolved). Keep showing the verifying state and auto-retry
  // instead of bouncing to sign-in.
  if (!status?.signedIn) {
    return <VerifyingScreen onRetry={refetch} />;
  }

  if (!status.isAdmin) {
    const displayEmail = status.email || user?.email;
    return (
      <div className="min-h-[100dvh] flex items-center justify-center dark bg-[#0F3D2E] px-4" dir="rtl">
        <div className="bg-background border border-red-400/30 max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-primary mb-2">ليس لديك صلاحية الوصول إلى لوحة الإدارة</h1>
          <p className="text-sm text-muted-foreground mb-3">
            أنت مسجّل دخول حالياً، لكن حسابك لا يحمل صلاحية الإشراف. لو كان من المفترض أن تكون مديراً، اطلب من مدير حالي منح حسابك الصلاحية من صفحة "المشرفون"، أو تأكّد من ضبط متغير <span className="font-mono">ADMIN_EMAILS</span> في الخادم.
          </p>
          {displayEmail && (
            <p className="text-xs text-muted-foreground mb-4 font-mono break-all bg-muted/40 px-2 py-1.5 inline-block">
              {displayEmail}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
            <Button
              onClick={() => refetch()}
              variant="default"
              className="rounded-none gap-2"
              data-testid="admin-gate-retry"
            >
              <RefreshCw className="w-4 h-4" /> إعادة فحص الصلاحيات
            </Button>
            <SignOutButton label="تسجيل خروج وتسجيل دخول بحساب آخر" />
          </div>
        </div>
      </div>
    );
  }

  return <AdminShell currentPath={location}>{children}</AdminShell>;
}

function SignOutButton({ label }: { label?: string } = {}) {
  return (
    <Button
      onClick={() =>
        void signOut({
          fetchOptions: {
            onSuccess: () => {
              window.location.href = `${basePath}/sign-in`;
            },
          },
        })
      }
      variant="outline"
      className="rounded-none gap-2"
      data-testid="admin-gate-signout"
    >
      <LogOut className="w-4 h-4" /> {label ?? "تسجيل الخروج"}
    </Button>
  );
}

function AdminShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const [mobileOpen, setMobileOpen] = useState(false);
  const email = user?.email;
  const name = user?.name || email?.split("@")[0] || "مشرف";

  return (
    <div className="min-h-[100dvh] bg-muted/20 text-foreground" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground border-b border-secondary/20">
        <div className="h-1 bg-secondary" />
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-primary-foreground/80 hover:text-secondary"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="القائمة"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-7 h-7 bg-secondary flex items-center justify-center text-primary font-black text-sm">ن</div>
                <div className="font-black text-white leading-none text-sm">دار نظم</div>
              </div>
            </Link>
            <div className="hidden md:block w-px h-5 bg-primary-foreground/20" />
            <span className="hidden md:inline text-secondary font-bold text-sm">لوحة التحكم</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right text-xs">
              <div className="text-white font-bold leading-tight">{name}</div>
              <div className="text-primary-foreground/60 leading-tight">{email}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:block w-60 border-l border-border bg-background min-h-[calc(100dvh-49px)] sticky top-[49px]">
          <SidebarNav currentPath={currentPath} />
        </aside>

        {/* Sidebar - mobile */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMobileOpen(false)}>
            <aside
              className="absolute right-0 top-[49px] w-64 bg-background border-l border-border h-[calc(100dvh-49px)] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <SidebarNav currentPath={currentPath} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ currentPath, onNavigate }: { currentPath: string; onNavigate?: () => void }) {
  return (
    <nav className="p-3 space-y-1">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const active = item.href === "/admin"
          ? currentPath === "/admin" || currentPath === "/admin/"
          : currentPath === item.href || currentPath.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold transition-colors border-r-2 ${
              active
                ? "bg-secondary/15 text-secondary border-secondary"
                : "text-muted-foreground hover:text-primary hover:bg-muted/40 border-transparent"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
      <div className="border-r-2 border-secondary pr-3">
        <h1 className="text-2xl font-black text-primary">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Toast({ toast }: { toast: { msg: string; type: "success" | "error" } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 font-bold text-sm shadow-lg border ${
      toast.type === "success" ? "bg-background border-secondary text-primary" : "bg-background border-red-400 text-red-600"
    }`}>
      {toast.msg}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  function show(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }
  return { toast, show };
}

