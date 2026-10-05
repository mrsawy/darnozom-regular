import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ChevronDown, User, LogIn, LogOut, ShieldCheck, UserCircle2, ShoppingCart, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut, useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart-context";

// Account, admin and cart controls for the header top bar (moved from site-nav.tsx).
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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV_LABELS = {
  ar: {
    langToggle: "English",
    rfp: "طلب خدمة",
    signIn: "تسجيل الدخول",
    myAccount: "حسابي",
    myLibrary: "مكتبتي",
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
    myLibrary: "My Library",
    adminPanel: "Admin Panel",
    signOut: "Sign Out",
    userMenu: "User menu",
    cart: "Cart",
    myOrders: "My Orders",
  },
};

export function CartButton({ language }: { language: "ar" | "en" }) {
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
            style={{ "--primary-foreground": "43 33% 96%", "--secondary": "35 43% 69%" } as React.CSSProperties}
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
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate("/account/library");
                }}
                className="w-full text-start px-4 py-2.5 text-sm text-primary-foreground/80 hover:text-secondary hover:bg-secondary/5 flex items-center gap-2"
                data-testid="nav-user-library"
              >
                <BookOpen size={14} />
                {t.myLibrary}
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

export function AuthSlot({
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

export function MobileAuthSlot({
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
          <button
            onClick={() => onNavigate("/account/library")}
            className="w-full py-2.5 text-sm text-primary-foreground hover:text-secondary flex items-center gap-2 text-start"
          >
            <BookOpen size={14} /> {t.myLibrary}
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
