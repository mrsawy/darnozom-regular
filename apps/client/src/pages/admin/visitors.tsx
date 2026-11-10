import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/pages/admin/layout";

export default function AdminVisitors() {
  const umami = import.meta.env.VITE_UMAMI_SHARE_URL?.trim();
  return (
    <div>
      <PageHeader
        title="زوار الموقع"
        description="إحصائيات الزوار من Umami"
        actions={umami ? (
          <a href={umami} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
            <ExternalLink className="w-4 h-4" /> فتح في نافذة كاملة
          </a>
        ) : undefined}
      />
      {umami ? (
        <iframe title="umami" src={umami} className="w-full h-[calc(100vh-12rem)] min-h-[600px] border border-line rounded" />
      ) : (
        <p className="text-sm text-muted-foreground">
          Umami غير مُفعَّل — ضع VITE_UMAMI_SRC و VITE_UMAMI_WEBSITE_ID و VITE_UMAMI_SHARE_URL ثم أعد البناء.
        </p>
      )}
    </div>
  );
}
