import { Checkbox, Label, Select, Text } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { buildCategorySections, type AdminCategory, type CategorySection } from "../lib/category-tree";

export function useBookCategories(): CategorySection[] {
  const [sections, setSections] = useState<CategorySection[]>([]);
  useEffect(() => {
    fetch("/admin/product-categories?limit=500&fields=id,name,handle,parent_category_id,metadata", { credentials: "include" })
      .then((r) => r.json())
      .then((b: { product_categories?: AdminCategory[] }) => setSections(buildCategorySections(b.product_categories ?? [])))
      .catch(() => setSections([]));
  }, []);
  return sections;
}

export function CategoryPicker(props: {
  primaryId: string;
  additionalIds: string[];
  onPrimaryChange(id: string): void;
  onAdditionalChange(ids: string[]): void;
  showAdditional?: boolean;
}) {
  const sections = useBookCategories();
  const toggle = (id: string, on: boolean) =>
    props.onAdditionalChange(on ? [...props.additionalIds, id] : props.additionalIds.filter((x) => x !== id));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Main section and subcategory</Label>
        <Select value={props.primaryId} onValueChange={props.onPrimaryChange}>
          <Select.Trigger>
            <Select.Value placeholder="Choose a subcategory (or a section)" />
          </Select.Trigger>
          <Select.Content>
            {sections.map((s) => (
              <Select.Group key={s.id}>
                <Select.Label>{s.label}</Select.Label>
                <Select.Item value={s.id}>{s.label} — (whole section)</Select.Item>
                {s.children.map((c) => (
                  <Select.Item key={c.id} value={c.id}>{c.label}</Select.Item>
                ))}
              </Select.Group>
            ))}
          </Select.Content>
        </Select>
        <Text size="small" className="text-ui-fg-subtle">
          Sections and subcategories are managed in Products → Categories.
        </Text>
      </div>
      {props.showAdditional !== false && (
        <div className="flex flex-col gap-2">
          <Label>Additional subject categories</Label>
          <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded border p-2">
            {sections.flatMap((s) => [{ id: s.id, label: s.label }, ...s.children]).map((c) =>
              c.id === props.primaryId ? null : (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={props.additionalIds.includes(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                  {c.label}
                </label>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
