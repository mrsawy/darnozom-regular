import type { ReactNode } from "react";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export function PageShell({ children, footerTone = "dark" }: { children: ReactNode; footerTone?: "dark" | "light" }) {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <SiteNav mode="page" />
      <main className="flex-1 bg-white">{children}</main>
      <SiteFooter tone={footerTone} />
    </div>
  );
}
