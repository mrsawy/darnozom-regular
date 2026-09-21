import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Globe, ChevronDown, User, LogIn, LogOut, ShieldCheck, UserCircle2, ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";
import { signOut, useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart-context";

// Local stand-ins for Clerk's <SignedIn>/<SignedOut> control components.
// Both render nothing until the session has resolved, so the nav never
// flashes a Sign In link at someone who is already signed in.
function SignedIn({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending || !session?.user) return null;
  return <>{children}</>;
}
function SignedOut({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  if (isPending || session?.user) return null;
  return <>{children}</>;
}

interface SiteNavProps {
  mode?: "home" | "page";
  theme?: "emerald" | "light";
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV_LABELS = {
  ar: {
    langToggle: "English",
    rfp: "طلب خدمة",
    signIn: "تسجيل الدخول",
    myAccount: "حسابي",
    adminPanel: "لوحة الإدارة",
    signOut: "تسجيل الخروج",
    userMenu: "قائمة المستخدم",
    cart: "السلة",
    myOrders: "طلباتي",
  },
  en: {
    langToggle: "العربية",
    rfp: "Request Service",
    signIn: "Sign In",
    myAccount: "My Account",
    adminPanel: "Admin Panel",
    signOut: "Sign Out",
    userMenu: "User menu",
    cart: "Cart",
    myOrders: "My Orders",
  },
};

function CartCountBadge() {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <span className="ms-auto min-w-[22px] h-[22px] px-1.5 rounded-full bg-secondary text-primary text-xs font-bold flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function CartButton({ language }: { language: "ar" | "en" }) {
  const { count } = useCart();
  const label = language === "ar" ? "السلة" : "Cart";
  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center justify-center w-10 h-10 text-primary-foreground hover:text-secondary border border-primary-foreground/15 hover:border-secondary/40 transition-colors"
      aria-label={label}
      data-testid="nav-cart"
    >
      <ShoppingCart size={16} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-primary text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export type NavChild = {
  labelAr: string;
  labelEn: string;
  href: string;
  descAr?: string;
  descEn?: string;
};

export type NavItem = {
  key: string;
  labelAr: string;
  labelEn: string;
  href: string;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    labelAr: "الرئيسية",
    labelEn: "Home",
    href: "/",
  },
  {
    key: "about",
    labelAr: "من نحن",
    labelEn: "About",
    href: "/about",
    children: [
      { labelAr: "نبذة عن دار نظم", labelEn: "About DarNozom", href: "/about#overview" },
      { labelAr: "رؤيتنا ورسالتنا", labelEn: "Vision & Mission", href: "/about#vision" },
      { labelAr: "قيمنا", labelEn: "Our Values", href: "/about#values" },
      { labelAr: "فريقنا", labelEn: "Our Team", href: "/about#team" },
      { labelAr: "شركاؤنا", labelEn: "Our Partners", href: "/about#success-partners" },
    ],
  },
  {
    key: "services",
    labelAr: "خدماتنا",
    labelEn: "Services",
    href: "/services",
    children: [
      { labelAr: "أنظمة الحوكمة والامتثال الشرعي", labelEn: "Shariah Governance & Compliance Systems", href: "/services/islamic-systems" },
      { labelAr: "أنظمة الإدارة", labelEn: "Management Systems", href: "/services/management-systems" },
      { labelAr: "التحول الرقمي", labelEn: "Digital Transformation", href: "/services/digital-transformation" },
      { labelAr: "الاستشارات", labelEn: "Consulting", href: "/services/consulting" },
      { labelAr: "البحث والتطوير", labelEn: "Research & Development", href: "/services/research" },
      { labelAr: "النشر", labelEn: "Publishing", href: "/services/publishing" },
      { labelAr: "الأكاديمية", labelEn: "Academy", href: "/academy" },
      { labelAr: "متجر الكتب", labelEn: "Book Store", href: "/services/store" },
    ],
  },
  {
    key: "book-store",
    labelAr: "متجر الكتب",
    labelEn: "Book Store",
    href: "/services/store",
  },
  {
    key: "case-studies",
    labelAr: "نماذج الأعمال",
    labelEn: "Case Studies",
    href: "/case-studies",
  },
  {
    key: "careers",
    labelAr: "الوظائف",
    labelEn: "Careers",
    href: "/careers",
  },
  {
    key: "contact",
    labelAr: "تواصل معنا",
    labelEn: "Contact",
    href: "/contact",
  },
];

interface AdminMeData {
  signedIn: boolean;
  isAdmin: boolean;
  email?: string;
}

function useIsAdmin(enabled: boolean) {
  return useQuery<AdminMeData>({
    queryKey: ["admin-me"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/admin/me", {
        credentials: "include",
      });
      if (!res.ok) return { signedIn: false, isAdmin: false };
      return res.json();
    },
    staleTime: 60_000,
    retry: false,
  });
}

function UserMenu({
  isRTL,
  language,
  onNavigate,
}: {
  isRTL: boolean;
  language: "ar" | "en";
  onNavigate: (href: string) => void;
}) {
  const t = NAV_LABELS[language];
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const adminQuery = useIsAdmin(!!isSignedIn);
  const isAdmin = adminQuery.data?.isAdmin === true;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const email = user?.email || "";
  const name = user?.name || email.split("@")[0] || (isRTL ? "حسابي" : "Account");
  const imageUrl = user?.image;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t.userMenu}
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1.5 border border-primary-foreground/15 hover:border-secondary/40 transition-colors text-primary-foreground/80 hover:text-secondary"
        data-testid="nav-user-button"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-secondary text-primary flex items-center justify-center">
            <UserCircle2 size={18} />
          </div>
        )}
        <span className="hidden md:inline text-xs font-medium max-w-[120px] truncate">{name}</span>
        <ChevronDown size={12} className="opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{ "--primary-foreground": "44 45% 96%", "--secondary": "40 60% 52%" } as React.CSSProperties}
            className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} min-w-[240px] bg-primary border border-secondary/20 shadow-2xl shadow-black/40 z-50`}
          >
            <div className="px-4 py-3 border-b border-primary-foreground/10">
              <div className="text-xs text-primary-foreground/60">{isRTL ? "مسجّل بإسم" : "Signed in as"}</div>
              <div className="text-sm text-primary-foreground font-bold truncate">{name}</div>
              {email && <div className="text-xs text-primary-foreground/60 truncate">{email}</div>}
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate("/account");
                }}
                className="w-full text-start px-4 py-2.5 text-sm text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 flex items-center gap-2"
                data-testid="nav-user-account"
              >
                <User size={14} />
                {t.myAccount}
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setOpen(false);
                    onNavigate("/admin");
                  }}
                  className="w-full text-start px-4 py-2.5 text-sm text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 flex items-center gap-2"
                  data-testid="nav-user-admin"
                >
                  <ShieldCheck size={14} />
                  {t.adminPanel}
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate("/account");
                }}
                className="w-full text-start px-4 py-2.5 text-sm text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 flex items-center gap-2"
              >
                <UserCircle2 size={14} />
                {isRTL ? "تعديل البروفايل" : "Edit Profile"}
              </button>
            </div>
            <div className="border-t border-primary-foreground/10 py-2">
              <button
                onClick={() => {
                  setOpen(false);
                  void signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = `${basePath}/`;
                      },
                    },
                  });
                }}
                className="w-full text-start px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                data-testid="nav-user-sign-out"
              >
                <LogOut size={14} />
                {t.signOut}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SignInLink({
  language,
  compact,
}: {
  language: "ar" | "en";
  compact?: boolean;
}) {
  const t = NAV_LABELS[language];
  return (
    <Link
      href="/sign-in"
      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary-foreground/80 hover:text-secondary transition-colors border border-primary-foreground/15 hover:border-secondary/40 ${
        compact ? "" : "whitespace-nowrap"
      }`}
      data-testid="nav-sign-in"
    >
      <LogIn size={12} />
      {t.signIn}
    </Link>
  );
}

function AdminNavButton({
  language,
  onNavigate,
}: {
  language: "ar" | "en";
  onNavigate: (href: string) => void;
}) {
  const t = NAV_LABELS[language];
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const adminQuery = useIsAdmin(!!isSignedIn);
  if (adminQuery.data?.isAdmin !== true) return null;
  return (
    <button
      onClick={() => onNavigate("/admin")}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary bg-secondary hover:bg-secondary/90 transition-colors"
      data-testid="nav-admin-button"
    >
      <ShieldCheck size={14} />
      {t.adminPanel}
    </button>
  );
}

function AuthSlot({
  isRTL,
  language,
  onNavigate,
}: {
  isRTL: boolean;
  language: "ar" | "en";
  onNavigate: (href: string) => void;
}) {
  return (
    <>
      <SignedOut>
        <SignInLink language={language} />
      </SignedOut>
      <SignedIn>
        <AdminNavButton language={language} onNavigate={onNavigate} />
        <UserMenu isRTL={isRTL} language={language} onNavigate={onNavigate} />
      </SignedIn>
    </>
  );
}

function MobileAuthSlot({
  language,
  onNavigate,
}: {
  language: "ar" | "en";
  onNavigate: (href: string) => void;
}) {
  return <MobileAuthSlotInner language={language} onNavigate={onNavigate} />;
}

function MobileAuthSlotInner({
  language,
  onNavigate,
}: {
  language: "ar" | "en";
  onNavigate: (href: string) => void;
}) {
  const t = NAV_LABELS[language];
  const { data: session } = useSession();
  const user = session?.user;
  const isSignedIn = !!user;
  const adminQuery = useIsAdmin(!!isSignedIn);
  const isAdmin = adminQuery.data?.isAdmin === true;
  const email = user?.email || "";
  const name = user?.name || email.split("@")[0] || "";

  return (
    <>
      <SignedOut>
        <button
          onClick={() => onNavigate("/sign-in")}
          className="py-3 text-primary-foreground font-medium hover:text-secondary flex items-center gap-2"
        >
          <LogIn size={16} />
          {t.signIn}
        </button>
      </SignedOut>
      <SignedIn>
        <div className="border-t border-primary-foreground/10 pt-3 mt-3 space-y-1">
          {(name || email) && (
            <div className="pb-2">
              {name && <div className="text-sm text-primary-foreground font-bold">{name}</div>}
              {email && <div className="text-xs text-primary-foreground/60 truncate">{email}</div>}
            </div>
          )}
          <button
            onClick={() => onNavigate("/account")}
            className="w-full py-2.5 text-sm text-primary-foreground hover:text-secondary flex items-center gap-2 text-start"
          >
            <User size={14} /> {t.myAccount}
          </button>
          {isAdmin && (
            <button
              onClick={() => onNavigate("/admin")}
              className="w-full py-2.5 text-sm text-primary-foreground hover:text-secondary flex items-center gap-2 text-start"
            >
              <ShieldCheck size={14} /> {t.adminPanel}
            </button>
          )}
          <button
            onClick={() =>
              void signOut({
                fetchOptions: {
                  onSuccess: () => {
                    window.location.href = `${basePath}/`;
                  },
                },
              })
            }
            className="w-full py-2.5 text-sm text-red-400 hover:text-red-300 flex items-center gap-2 text-start"
          >
            <LogOut size={14} /> {t.signOut}
          </button>
        </div>
      </SignedIn>
    </>
  );
}

export default function SiteNav({ mode = "page", theme = "light" }: SiteNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<string | null>(null);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const t = NAV_LABELS[language];
  const isRTL = language === "ar";
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigate = (href: string) => {
    setMobileMenuOpen(false);
    setOpenMobileGroup(null);
    setOpenDesktopGroup(null);
    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
      const targetPath = (path || "/").replace(/\/$/, "") || "/";
      if (path && currentPath !== targetPath) {
        window.location.href = href;
      } else {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", href);
      }
      return;
    }
    navigate(href);
  };

  const openGroup = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDesktopGroup(key);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenDesktopGroup(null), 150);
  };

  const solid = isScrolled || mode === "page";
  const light = theme === "light";
  const underlineOrigin = isRTL ? "origin-right" : "origin-left";

  const renderDesktopItem = (item: NavItem) => {
    const label = language === "ar" ? item.labelAr : item.labelEn;
    const hasChildren = !!item.children?.length;

    return (
      <div
        key={item.key}
        className="relative"
        onMouseEnter={() => hasChildren && openGroup(item.key)}
        onMouseLeave={() => hasChildren && scheduleClose()}
      >
        <button
          onClick={() => handleNavigate(item.href)}
          className="px-3 py-2 text-sm font-medium text-primary-foreground/80 hover:text-secondary transition-colors relative group inline-flex items-center gap-1"
          data-testid={`nav-${item.key}`}
        >
          {label}
          {hasChildren && <ChevronDown size={12} className="opacity-60" />}
          <span
            className={`absolute bottom-0 right-0 left-0 h-0.5 bg-secondary scale-x-0 group-hover:scale-x-100 transition-transform ${underlineOrigin}`}
          />
        </button>

        {hasChildren && (
          <AnimatePresence>
            {openDesktopGroup === item.key && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                style={{ "--primary-foreground": "44 45% 96%", "--secondary": "40 60% 52%" } as React.CSSProperties}
                className={`absolute top-full ${isRTL ? "right-0" : "left-0"} mt-2 min-w-[260px] bg-primary border border-secondary/20 shadow-2xl shadow-black/40 z-50`}
                onMouseEnter={() => openGroup(item.key)}
                onMouseLeave={scheduleClose}
              >
                <div className="py-2">
                  {item.children!.map((child) => {
                    const childLabel = language === "ar" ? child.labelAr : child.labelEn;
                    return (
                      <button
                        key={child.href}
                        onClick={() => handleNavigate(child.href)}
                        className="w-full text-start px-5 py-2.5 text-sm text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 transition-colors block"
                        data-testid={`nav-${item.key}-${child.href.replace(/[^a-z0-9]+/gi, "-")}`}
                      >
                        {childLabel}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  const renderMobileItem = (item: NavItem) => {
    const label = language === "ar" ? item.labelAr : item.labelEn;
    const hasChildren = !!item.children?.length;
    const isOpen = openMobileGroup === item.key;

    return (
      <div key={item.key} className="border-b border-primary-foreground/10">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavigate(item.href)}
            className="flex-1 py-3 text-primary-foreground font-medium hover:text-secondary transition-colors text-start"
          >
            {label}
          </button>
          {hasChildren && (
            <button
              onClick={() => setOpenMobileGroup(isOpen ? null : item.key)}
              aria-label="toggle"
              className="px-3 py-3 text-primary-foreground/60 hover:text-secondary"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        {hasChildren && (
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pb-3 ps-4">
                  {item.children!.map((child) => {
                    const childLabel = language === "ar" ? child.labelAr : child.labelEn;
                    return (
                      <button
                        key={child.href}
                        onClick={() => handleNavigate(child.href)}
                        className="w-full py-2 text-sm text-primary-foreground/70 hover:text-secondary text-start"
                      >
                        — {childLabel}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <nav
      style={
        light
          ? ({ "--primary-foreground": "157 35% 12%", "--secondary": "154 53% 24%" } as React.CSSProperties)
          : undefined
      }
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        light
          ? solid
            ? "bg-gradient-to-r from-[hsl(150_42%_95%)]/75 via-[hsl(150_42%_97%)]/85 to-[hsl(150_42%_95%)]/75 backdrop-blur-2xl border-b border-primary/10 shadow-[0_4px_30px_rgba(20,80,60,0.06)]"
            : "bg-gradient-to-b from-[hsl(150_42%_95%)]/80 to-transparent"
          : solid
            ? "bg-gradient-to-r from-[#082219]/90 via-[#0A2A1F]/90 to-[#082219]/90 backdrop-blur-2xl border-b border-secondary/30 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
            : "bg-gradient-to-b from-[#082219]/90 to-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src={`${import.meta.env.BASE_URL}${light ? "darnozom-n-logo-green.png" : "darnozom-n-logo.png"}`}
              alt="Darnozom"
              className="h-12 w-auto rounded-xl"
            />
            <div className="hidden sm:block">
              <div className={`text-base font-bold tracking-[0.2em] uppercase ${light ? "text-primary" : "text-secondary"}`}>
                {isRTL ? "دار نظم" : "DARNOZOM"}
              </div>
              <div className={`text-[10px] tracking-wider ${light ? "text-primary/45" : "text-primary-foreground/50"}`}>
                {isRTL ? "الشريعة والإدارة والتحول الرقمي" : "Shariah, Management & Digital Transformation"}
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-1" style={{ direction: isRTL ? "rtl" : "ltr" }}>
            {NAV_ITEMS.map(renderDesktopItem)}
          </div>

          {/* Right side */}
          <div className="hidden xl:flex items-center gap-3">
            <CartButton language={language} />
            <AuthSlot isRTL={isRTL} language={language} onNavigate={handleNavigate} />
            <button
              onClick={toggleLanguage}
              className="px-3 py-2 text-xs font-medium text-primary-foreground/60 hover:text-secondary transition-colors flex items-center gap-1.5 border border-primary-foreground/15 hover:border-secondary/40"
            >
              <Globe size={12} />
              {t.langToggle}
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-primary-foreground hover:text-secondary"
            aria-label="menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ "--primary-foreground": "44 45% 96%", "--secondary": "40 60% 52%" } as React.CSSProperties}
            className="xl:hidden overflow-hidden bg-primary border-t border-primary-foreground/10"
          >
            <div className="px-6 py-4 max-h-[80vh] overflow-y-auto" style={{ direction: isRTL ? "rtl" : "ltr" }}>
              {NAV_ITEMS.map(renderMobileItem)}
              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={() => handleNavigate("/cart")}
                  className="py-3 text-primary-foreground font-medium hover:text-secondary flex items-center gap-2"
                >
                  <ShoppingCart size={16} /> {t.cart}
                  <CartCountBadge />
                </button>
                <MobileAuthSlot language={language} onNavigate={handleNavigate} />
                <button
                  onClick={() => {
                    toggleLanguage();
                    setMobileMenuOpen(false);
                  }}
                  className="py-3 text-primary-foreground/60 font-medium hover:text-secondary transition-colors flex items-center gap-2"
                >
                  <Globe size={16} />
                  {t.langToggle}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
