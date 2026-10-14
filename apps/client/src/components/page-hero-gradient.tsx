import React from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";

interface BreadcrumbParent {
  label: string;
  href: string;
}

interface PageHeroGradientProps {
  parents?: BreadcrumbParent[];
  current: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function PageHeroGradient({ parents = [], current, title, subtitle }: PageHeroGradientProps) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(210_40%_96%)] via-[hsl(210_40%_94%)] to-[hsl(210_38%_88%)]">
      <div className="max-w-[1250px] mx-auto px-page relative z-10">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-7 uppercase tracking-widest">
          <Link href="/" className="hover:text-primary transition-colors">
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          {parents.map((p) => (
            <React.Fragment key={p.href}>
              <span className="text-border">/</span>
              <Link href={p.href} className="hover:text-primary transition-colors">
                {p.label}
              </Link>
            </React.Fragment>
          ))}
          <span className="text-border">/</span>
          <span className="text-primary">{current}</span>
        </div>
        <h1
          className="font-bold text-foreground leading-[1.12] mb-6 text-[38px]!"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
