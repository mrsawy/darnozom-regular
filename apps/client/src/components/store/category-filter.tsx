import type { CategoryTreeNode } from "@/lib/book-catalog";

type Props = {
  tree: CategoryTreeNode[];
  selectedId: string;
  onSelect(id: string): void;
  isArabic: boolean;
  allLabel: string;
};

const label = (n: CategoryTreeNode, isArabic: boolean) => (isArabic && n.nameAr ? n.nameAr : n.name);

/** Sections with their subcategories; a section's children show when it (or one of them) is selected. */
export default function CategoryFilter({ tree, selectedId, onSelect, isArabic, allLabel }: Props) {
  const btn = (id: string, text: string, depth: 0 | 1) => (
    <button
      key={id || "all"}
      type="button"
      aria-pressed={selectedId === id}
      onClick={() => onSelect(id)}
      className={`w-full text-start px-3 py-1.5 text-sm transition-colors ${depth ? "ps-6 text-[13px]" : "font-bold"} ${
        selectedId === id ? "bg-secondary/15 text-primary" : "text-foreground/80 hover:bg-muted/60"
      }`}
    >
      {text}
    </button>
  );
  return (
    <nav className="flex flex-col" aria-label={allLabel}>
      {btn("", allLabel, 0)}
      {tree.map((s) => {
        const open = selectedId === s.id || s.children.some((c) => c.id === selectedId);
        return (
          <div key={s.id}>
            {btn(s.id, label(s, isArabic), 0)}
            {open && s.children.map((c) => btn(c.id, label(c, isArabic), 1))}
          </div>
        );
      })}
    </nav>
  );
}
