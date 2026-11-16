import { Pencil, Plus } from "lucide-react";
import { useIsAdmin } from "@/lib/use-admin-status";
import { useLanguage } from "@/lib/language-context";

/**
 * "Edit" shortcut shown only to signed-in admins; it opens the dashboard page where
 * this specific thing is edited. Place it outside any <a>/<Link> (nested links are invalid).
 *
 * - `overlay`: pinned to the top corner of the nearest `relative` ancestor (cards, images).
 * - default: a small inline pill (next to titles).
 */
export function AdminEditButton({ href, external = false, overlay = false, label, icon = "edit", className = "" }: {
  href: string;
  /** Open in a new tab (Medusa Admin). */
  external?: boolean;
  overlay?: boolean;
  label?: string;
  /** "add" shows a plus instead of the pencil (used for "add new" buttons). */
  icon?: "edit" | "add";
  className?: string;
}) {
  const isAdmin = useIsAdmin();
  const { isArabic } = useLanguage();
  if (!isAdmin) return null;

  const text = label ?? (isArabic ? "تعديل" : "Edit");
  const base = "inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors";
  const pos = overlay ? "absolute top-2 end-2 z-20" : "";
  // Plain link (full navigation to the dashboard); stop the click reaching a clickable card.
  return (
    <a
      href={external ? href : `${import.meta.env.BASE_URL.replace(/\/$/, "")}${href}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      onClick={(e) => e.stopPropagation()}
      data-testid="admin-edit-button"
      className={`${base} ${pos} ${className}`}
    >
      {icon === "add" ? <Plus className="h-3.5 w-3.5" aria-hidden /> : <Pencil className="h-3.5 w-3.5" aria-hidden />} {text}
    </a>
  );
}
