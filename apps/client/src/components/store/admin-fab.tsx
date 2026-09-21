import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useAdminStatus } from "@/lib/use-admin-status";
import { useLanguage } from "@/lib/language-context";

interface AdminFabProps {
  href: string;
  label: string | { ar: string; en: string };
  /** Open in a new tab (e.g. Medusa Admin). */
  external?: boolean;
}

export function AdminFab({ href, label, external = false }: AdminFabProps) {
  const { status, loading } = useAdminStatus();
  const { isArabic } = useLanguage();

  if (loading) return null;
  if (!status?.isAdmin) return null;

  const text = typeof label === "string" ? label : isArabic ? label.ar : label.en;
  const className =
    "fixed bottom-6 end-6 z-40 inline-flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-5 py-3 rounded-full shadow-lg shadow-secondary/30 font-medium text-sm transition-all hover:scale-105";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <ExternalLink className="w-5 h-5" />
        {text}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <ExternalLink className="w-5 h-5" />
      {text}
    </Link>
  );
}
