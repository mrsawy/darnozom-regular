import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

/**
 * Reusable "failed to load" state for listing/detail pages. Distinct from an
 * empty/"no results" state — this is shown when a fetch errors out (server or
 * network), and offers a retry action.
 */
export function FetchError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  const { isArabic } = useLanguage();
  const title = isArabic ? "تعذّر تحميل البيانات" : "Couldn't load the content";
  const desc = isArabic
    ? "حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى."
    : "Something went wrong while contacting the server. Please try again.";
  const retry = isArabic ? "إعادة المحاولة" : "Try again";

  return (
    <div className={`text-center ${className ?? ""}`}>
      <AlertTriangle className="w-12 h-12 text-destructive/70 mx-auto mb-4" />
      <p className="font-bold text-lg mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-5">{desc}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2 rounded-none">
          <RefreshCw className="w-4 h-4" />
          {retry}
        </Button>
      )}
    </div>
  );
}
