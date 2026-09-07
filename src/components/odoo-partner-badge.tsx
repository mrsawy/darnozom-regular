import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";

type Variant = "light" | "dark" | "compact";

export function OdooPartnerBadge({ variant = "light" }: { variant?: Variant }) {
  const { isArabic } = useLanguage();

  const taglineColor = variant === "dark" ? "text-white" : "text-primary";
  const labelColor = "text-secondary";
  const borderColor = variant === "dark" ? "border-white/20" : "border-secondary/40";
  const bg =
    variant === "dark"
      ? "bg-white/5 hover:bg-white/10"
      : "bg-muted/40 hover:bg-muted/70";

  if (variant === "compact") {
    return (
      <Link
        href="/services/digital-transformation"
        aria-label={isArabic ? "دار نظم — شريك Odoo المعتمد" : "DarNozom — Official Odoo Partner"}
        data-testid="odoo-partner-badge-compact"
      >
        <span
          className={`inline-flex items-center gap-3 rounded-sm border ${borderColor} bg-white/95 hover:bg-white px-3 py-2 transition-colors`}
        >
          <img
            src={`${import.meta.env.BASE_URL}odoo-logo.png`}
            alt="Odoo"
            className="h-6 w-auto"
            data-testid="odoo-logo"
          />
          <span className={`${isArabic ? "border-secondary border-r pr-3" : "border-secondary border-l pl-3"}`}>
            <span className="block text-secondary text-[9px] font-bold tracking-[0.22em] uppercase leading-none mb-0.5">
              {isArabic ? "شريك معتمد" : "Official Partner"}
            </span>
            <span className="block text-primary text-xs font-bold leading-tight">
              {isArabic ? "Odoo ERP" : "Odoo ERP"}
            </span>
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/services/digital-transformation"
      aria-label={isArabic ? "دار نظم — شريك Odoo المعتمد لتنفيذ تخطيط موارد المؤسسة" : "DarNozom — Official Odoo Partner for ERP Implementation"}
      data-testid="odoo-partner-badge"
    >
      <div
        className={`flex flex-col md:flex-row items-center justify-center gap-5 md:gap-8 rounded-sm border ${borderColor} ${bg} px-6 py-5 md:px-10 md:py-6 transition-colors ${
          isArabic ? "md:flex-row-reverse" : ""
        }`}
      >
        <div className="flex items-center justify-center bg-white rounded-sm px-4 py-2">
          <img
            src={`${import.meta.env.BASE_URL}odoo-logo.png`}
            alt="Odoo"
            className="h-10 md:h-12 w-auto"
            data-testid="odoo-logo"
          />
        </div>
        <div
          className={`${
            isArabic
              ? "text-center md:text-right md:border-r-2 md:pr-6"
              : "text-center md:text-left md:border-l-2 md:pl-6"
          } border-secondary`}
        >
          <div className={`${labelColor} text-[11px] font-bold tracking-[0.25em] uppercase mb-1`}>
            {isArabic ? "شريك معتمد" : "Official Partner"}
          </div>
          <div className={`${taglineColor} font-bold font-serif text-base md:text-lg`}>
            {isArabic
              ? "دار نظم — شريك Odoo المعتمد لتنفيذ تخطيط موارد المؤسسة"
              : "DarNozom — Official Odoo Partner for ERP Implementation"}
          </div>
        </div>
      </div>
    </Link>
  );
}
