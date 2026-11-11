import type { ReactNode } from "react";
import type { NavVariant } from "@/lib/page-designs";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export function PageShell({ children, footerTone = "dark", navVariant = "default" }: { children: ReactNode; footerTone?: "dark" | "light"; navVariant?: NavVariant }) {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <SiteNav mode="page" variant={navVariant} />
      <main className="flex-1 bg-white">{children}</main>
      <SiteFooter tone={footerTone} />
    </div>
  );
}
