import { Link } from "wouter";
import { AdminEditButton } from "@/components/admin-edit-button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export function SectionHeader({ title, subtitle, href, linkLabel, as = "h2", editHref, addHref }: {
  title: string; subtitle?: string; href?: string; linkLabel?: string; as?: "h1" | "h2";
  /** Dashboard pages for this section (admins only): edit the list and add a new item. */
  editHref?: string; addHref?: string;
}) {
  const { isArabic } = useLanguage();
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  const H = as;
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <H className="text-[25px] lg:text-[30px] font-bold text-navy leading-tight">{title}</H>
        {subtitle && <p className="text-ink-muted mt-1">{subtitle}</p>}
        {(editHref || addHref) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {editHref && <AdminEditButton href={editHref} label={isArabic ? "تعديل القسم" : "Edit section"} />}
            {addHref && <AdminEditButton href={addHref} icon="add" label={isArabic ? "إضافة جديد" : "Add new"} />}
          </div>
        )}
      </div>
      {href && linkLabel && (
        <Link href={href} className="shrink-0 inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-navy hover:text-gold">
          {linkLabel} <Arrow className="w-4 h-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
