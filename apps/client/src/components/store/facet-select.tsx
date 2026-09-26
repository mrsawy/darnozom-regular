import type { BookFacet } from "@/lib/book-catalog";

type Props = {
  label: string;
  allLabel: string;
  value: string;
  options: BookFacet[];
  onChange(value: string): void;
  format?(value: string): string;
};

/** A filter row listing the values found in the current results, with counts. */
export default function FacetSelect({ label, allLabel, value, options, onChange, format }: Props) {
  const withCurrent = value && !options.some((o) => o.value === value) ? [{ value, count: 0 }, ...options] : options;
  return (
    <label className="flex items-center justify-between gap-3 border border-border rounded-md bg-card px-3.5 py-2.5 text-sm cursor-pointer hover:border-primary/35 transition-colors">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground text-sm font-medium outline-none cursor-pointer text-end max-w-[55%]"
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
