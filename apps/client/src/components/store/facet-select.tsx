import type { BookFacet } from "@/lib/book-catalog";

type Props = {
  label: string;
  allLabel: string;
  value: string;
  options: BookFacet[];
  onChange(value: string): void;
  format?(value: string): string;
};

/** A filter dropdown listing the values found in the current results, with counts. */
export default function FacetSelect({ label, allLabel, value, options, onChange, format }: Props) {
  const withCurrent = value && !options.some((o) => o.value === value) ? [{ value, count: 0 }, ...options] : options;
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-input bg-background px-3 py-2 text-sm font-normal text-foreground rounded-none"
      >
        <option value="">{allLabel}</option>
        {withCurrent.map((o) => (
          <option key={o.value} value={o.value}>
            {(format ? format(o.value) : o.value) + (o.count ? ` (${o.count})` : "")}
          </option>
        ))}
      </select>
    </label>
  );
}
