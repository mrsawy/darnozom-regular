import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { MAIN_NAV, activeNavKey, type NavEntry } from "@/lib/nav-config";
import { BRAND } from "@/lib/site-constants";
import { AuthSlot, CartButton, MobileAuthSlot } from "@/components/nav/account-controls";
import SearchSection from "@/components/search-section";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const LOGO = `${import.meta.env.BASE_URL}darnozom-n-logo-navy.png`;
const CLOSE_DELAY_MS = 200;

type Props = { mode?: "home" | "page"; theme?: string };

export default function SiteNav(_props: Props) {
  const { language, isArabic, toggleLanguage } = useLanguage();
  const [location, navigate] = useLocation();
  const active = activeNavKey(location);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  useEffect(() => {
    setOpenKey(null);
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    if (!openKey) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openKey]);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenKey(null), CLOSE_DELAY_MS);
  };

  return (
    <>
      <div className="bg-navy-deep text-white text-sm">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 h-11 flex items-center justify-end gap-1 sm:gap-3">
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex items-center gap-1.5 min-h-11 px-2 hover:text-gold-light">
            <Search className="w-4 h-4" aria-hidden /> {t("البحث", "Search")}
          </button>
          <Link href="/services/store/books" className="hidden sm:inline-flex items-center min-h-11 px-2 hover:text-gold-light">
            {t("متجر الكتب", "Book store")}
          </Link>
          <CartButton language={language} />
          <div className="hidden xl:flex items-center gap-2"><AuthSlot isRTL={isArabic} language={language} onNavigate={navigate} /></div>
          <button type="button" onClick={toggleLanguage} className="min-h-11 px-2 font-semibold hover:text-gold-light" lang={isArabic ? "en" : "ar"}>
            {isArabic ? "English" : "العربية"}
          </button>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6 h-20 flex items-center gap-4 xl:gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0" aria-label={t(BRAND.nameAr, BRAND.nameEn)}>
            <img src={LOGO} alt="" className="h-11 w-auto" />
            <span className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-navy">{t(BRAND.nameAr, BRAND.nameEn)}</span>
              <span className="text-xs text-ink-muted">{t(BRAND.taglineAr, BRAND.taglineEn)}</span>
            </span>
          </Link>

          <nav ref={navRef} aria-label={t("القائمة الرئيسية", "Main navigation")} className="hidden xl:flex flex-1 items-stretch justify-center h-full">
            {MAIN_NAV.map((entry) => (
              <DesktopItem
                key={entry.key}
                entry={entry}
                isArabic={isArabic}
                isActive={active === entry.key}
                isOpen={openKey === entry.key}
                onOpen={() => {
                  cancelClose();
                  setOpenKey(entry.key);
                }}
                onToggle={() => setOpenKey((k) => (k === entry.key ? null : entry.key))}
                onClose={() => setOpenKey(null)}
                onLeave={scheduleClose}
              />
            ))}
          </nav>

          <span className="hidden 2xl:block ms-auto text-sm font-bold tracking-[0.35em] text-navy" dir="ltr">DARNOZOM</span>

          <button
            type="button"
            className="xl:hidden ms-auto inline-flex items-center justify-center w-11 h-11 text-navy"
            onClick={() => setMobileOpen(true)}
            aria-label={t("فتح القائمة", "Open menu")}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={isArabic ? "right" : "left"} className="w-[88vw] max-w-sm overflow-y-auto bg-white p-0">
          <SheetTitle className="sr-only">{t("القائمة", "Menu")}</SheetTitle>
          <div className="flex items-center justify-between p-4 border-b border-line">
            <span className="font-bold text-navy">{t(BRAND.nameAr, BRAND.nameEn)}</span>
            <button type="button" onClick={() => setMobileOpen(false)} aria-label={t("إغلاق", "Close")} className="w-11 h-11 inline-flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <button type="button" onClick={() => { setMobileOpen(false); setSearchOpen(true); }} className="w-full flex items-center gap-2 px-4 min-h-12 border-b border-line text-ink">
            <Search className="w-4 h-4" /> {t("ابحث في دار نظم", "Search DarNozom")}
          </button>
          {MAIN_NAV.map((entry) => (
            <MobileItem key={entry.key} entry={entry} isArabic={isArabic} isActive={active === entry.key} />
          ))}
          <div className="p-4 bg-navy-deep text-white">
            <MobileAuthSlot language={language} onNavigate={(href) => { setMobileOpen(false); navigate(href); }} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogTitle>{t("ابحث في دار نظم", "Search DarNozom")}</DialogTitle>
          <SearchSection />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DesktopItem({
  entry, isArabic, isActive, isOpen, onOpen, onToggle, onClose, onLeave,
}: {
  entry: NavEntry; isArabic: boolean; isActive: boolean; isOpen: boolean;
  onOpen: () => void; onToggle: () => void; onClose: () => void; onLeave: () => void;
}) {
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const label = isArabic ? entry.labelAr : entry.labelEn;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      toggleRef.current?.focus();
    }
  };
  return (
    <div className="relative flex items-center" onMouseEnter={onOpen} onMouseLeave={onLeave} onKeyDown={onKeyDown}>
      <Link
        href={entry.href}
        aria-current={isActive ? "page" : undefined}
        className={`ps-1.5 h-full inline-flex items-center whitespace-nowrap text-sm font-semibold border-b-2 transition-colors ${
          isActive ? "text-navy border-gold" : "text-ink border-transparent hover:text-navy"
        }`}
      >
        {label}
      </Link>
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isArabic ? `فتح قائمة ${entry.labelAr}` : `Open ${entry.labelEn} menu`}
        onClick={onToggle}
        className="w-4 h-11 inline-flex items-center justify-center text-ink-muted hover:text-navy"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute top-full start-0 mt-px bg-white border border-line shadow-lg rounded-[4px] p-5 z-50 motion-safe:animate-in motion-safe:fade-in-0"
      >
        <div className={`grid gap-8 ${entry.columns.length > 1 ? "grid-cols-2 min-w-[520px]" : "min-w-[260px]"}`}>
          {entry.columns.map((col, i) => (
            <div key={i}>
              {col.titleAr && (
                <Link href={col.href ?? entry.href} className="block font-bold text-navy mb-1 hover:underline">
                  {isArabic ? col.titleAr : col.titleEn}
                </Link>
              )}
              {col.subtitleAr && <p className="text-xs text-gold mb-2">{isArabic ? col.subtitleAr : col.subtitleEn}</p>}
              <ul className="space-y-0.5">
                {col.links.map((link) => (
                  <li key={link.href + link.labelAr}>
                    <Link href={link.href} className="block py-2 text-[15px] text-ink hover:text-navy">
                      {isArabic ? link.labelAr : link.labelEn}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileItem({ entry, isArabic, isActive }: { entry: NavEntry; isArabic: boolean; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-line">
      <div className="flex items-center">
        <Link href={entry.href} aria-current={isActive ? "page" : undefined} className={`flex-1 px-4 min-h-12 flex items-center font-semibold ${isActive ? "text-navy" : "text-ink"}`}>
          {isArabic ? entry.labelAr : entry.labelEn}
        </Link>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="w-12 h-12 inline-flex items-center justify-center text-ink-muted" aria-label={isArabic ? `توسيع ${entry.labelAr}` : `Expand ${entry.labelEn}`}>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div id={panelId} hidden={!open} className="pb-2 bg-ivory">
        {entry.columns.map((col, i) => (
          <div key={i} className="px-4 pt-2">
            {col.titleAr && <p className="text-sm font-bold text-navy">{isArabic ? col.titleAr : col.titleEn}</p>}
            {col.links.map((link) => (
              <Link key={link.href + link.labelAr} href={link.href} className="block ps-3 min-h-11 py-2.5 text-sm text-ink">
                {isArabic ? link.labelAr : link.labelEn}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
