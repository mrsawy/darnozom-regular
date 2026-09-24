import { BookOpen, Download } from "lucide-react";

const COPY = {
  ar: {
    paper: { label: "نسخة ورقية", hint: "تُشحن إلى عنوانك" },
    digital: { label: "نسخة رقمية", hint: "تظهر في مكتبتي بعد تأكيد الدفع" },
  },
  en: {
    paper: { label: "Paper edition", hint: "Shipped to your address" },
    digital: { label: "Digital edition", hint: "Appears in My Library once payment is confirmed" },
  },
} as const;

/**
 * Which edition a cart line is. Paper and digital lines of the same book
 * share a title, so this is what tells them apart in the cart and checkout.
 */
export default function EditionBadge({
  format,
  lang,
  hint = true,
}: {
  format: string | null;
  lang: "ar" | "en";
  hint?: boolean;
}) {
  if (format !== "paper" && format !== "digital") return null;
  const copy = COPY[lang][format];
  const Icon = format === "digital" ? Download : BookOpen;
  return (
    <div className="flex flex-col gap-0.5">
      <span
        data-testid={`edition-${format}`}
        className={`inline-flex w-fit items-center gap-1.5 px-2 py-0.5 text-xs font-bold border ${
          format === "digital"
            ? "bg-secondary/10 border-secondary/40 text-secondary"
            : "bg-primary/5 border-primary/30 text-primary"
        }`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {copy.label}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground">{copy.hint}</span>}
    </div>
  );
}
