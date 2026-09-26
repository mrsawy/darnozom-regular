import type { CategoryTreeNode } from "@/lib/book-catalog";

type Props = {
  tree: CategoryTreeNode[];
  selectedId: string;
  onSelect(id: string): void;
  isArabic: boolean;
  allLabel: string;
};

const label = (n: CategoryTreeNode, isArabic: boolean) => (isArabic && n.nameAr ? n.nameAr : n.name);

function Row({
  id,
  text,
  pressed,
  onSelect,
  sub = false,
}: {
  id: string;
  text: string;
  pressed: boolean;
  onSelect(id: string): void;
  sub?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onSelect(id)}
      className={`block w-full text-start -mx-3 px-3 py-2 rounded transition-colors ${
        sub ? "text-[13px]" : "text-sm"
      } ${
        pressed
          ? "text-primary font-semibold bg-primary/5"
          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
      }`}
    >
      {text}
    </button>
  );
}

/** Sections as a vertical sidebar list; a section's subcategories appear indented once it (or one of them) is selected. */
export default function CategoryFilter({ tree, selectedId, onSelect, isArabic, allLabel }: Props) {
  const openSection = tree.find(
    (s) => selectedId === s.id || s.children.some((c) => c.id === selectedId),
  );

  return (
    <nav className="flex flex-col" aria-label={allLabel}>
      <Row id="" text={allLabel} pressed={selectedId === ""} onSelect={onSelect} />
      {tree.map((s) => {
        const isOpen = openSection?.id === s.id;
        return (
          <div key={s.id}>
            <Row id={s.id} text={label(s, isArabic)} pressed={selectedId === s.id} onSelect={onSelect} />
            {isOpen && s.children.length > 0 && (
              <div className="ms-3 ps-3 border-s-2 border-primary/20">
                {s.children.map((c) => (
                  <Row
                    key={c.id}
                    id={c.id}
                    text={label(c, isArabic)}
                    pressed={selectedId === c.id}
                    onSelect={onSelect}
                    sub
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
