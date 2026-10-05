import type { ReactNode } from "react";

export function CategoryBadge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "outline" }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-semibold leading-6 rounded-[2px] ${
        tone === "gold" ? "bg-gold-light text-ink" : "border border-line text-ink-muted bg-white"
      }`}
    >
      {children}
    </span>
  );
}
