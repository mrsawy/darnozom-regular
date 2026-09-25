import { Checkbox, Input, Label, Select, Text, Textarea } from "@medusajs/ui";
import type { BookProfileFormValue } from "../lib/book-profile-form";

type Props = { value: BookProfileFormValue; onChange(next: BookProfileFormValue): void };

export function BookProfileFields({ value, onChange }: Props) {
  const set = <K extends keyof BookProfileFormValue>(k: K, v: BookProfileFormValue[K]) => onChange({ ...value, [k]: v });
  const field = (k: keyof BookProfileFormValue, label: string, opts: { type?: string; hint?: string; multiline?: boolean; dir?: "ltr" } = {}) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`bp-${k}`}>{label}</Label>
      {opts.multiline ? (
        <Textarea id={`bp-${k}`} value={value[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <Input id={`bp-${k}`} type={opts.type ?? "text"} dir={opts.dir} value={value[k] as string} onChange={(e) => set(k, e.target.value as never)} />
      )}
      {opts.hint && <Text size="small" className="text-ui-fg-subtle">{opts.hint}</Text>}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      {field("authors", "Author(s)", { multiline: true, hint: "One per line. Required." })}
      <div className="grid grid-cols-2 gap-4">
        {field("editors", "Editor(s)", { multiline: true, hint: "One per line, if any." })}
        {field("translators", "Translator(s)", { multiline: true, hint: "One per line, if any." })}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field("publisher", "Publisher")}
        {field("isbn", "ISBN", { dir: "ltr", hint: "ISBN-10 or ISBN-13; hyphens are fine." })}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {field("publication_year", "Year", { type: "number" })}
        {field("edition_number", "Edition no.", { type: "number" })}
        {field("pages", "Pages", { type: "number" })}
        {field("volumes", "Volumes", { type: "number" })}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Language of the book</Label>
        <Select value={value.language} onValueChange={(v) => set("language", v as BookProfileFormValue["language"])}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>
            <Select.Item value="ar">Arabic — العربية</Select.Item>
            <Select.Item value="en">English — الإنجليزية</Select.Item>
            <Select.Item value="both">Arabic and English</Select.Item>
          </Select.Content>
        </Select>
      </div>
      {field("keywords", "Keywords", { hint: "Separate with commas." })}
      {field("target_audience", "Target audience", { hint: "e.g. researchers, graduate students, policymakers." })}
      {field("table_of_contents", "Table of contents", { multiline: true, hint: "Optional. One chapter per line." })}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={value.digital_rights} onCheckedChange={(v) => set("digital_rights", v === true)} />
        Digital distribution rights are available (allows a digital edition)
      </label>
    </div>
  );
}
