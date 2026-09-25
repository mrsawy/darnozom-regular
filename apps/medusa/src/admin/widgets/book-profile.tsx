import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";
import { BookProfileFields } from "../components/book-profile-fields";
import { CategoryPicker } from "../components/category-picker";
import { EMPTY_PROFILE_FORM, fromProfile, toProfilePayload, type BookProfileFormValue } from "../lib/book-profile-form";

/** Book-type products, or products that already have a paper/digital edition. */
export function isBookProduct(product: AdminProduct): boolean {
  if (/book|كتاب/i.test(product.type?.value ?? "")) return true;
  return (product.variants ?? []).some((v) => {
    const kind = (v.metadata as { kind?: unknown } | null)?.kind;
    return kind === "paper" || kind === "digital";
  });
}

const BookProfileWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [form, setForm] = useState<BookProfileFormValue>(EMPTY_PROFILE_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/admin/books/${product.id}/profile`, { credentials: "include" })
      .then((r) => r.json())
      .then((b: { profile: Record<string, unknown> | null }) => setForm(fromProfile(b.profile)))
      .finally(() => setLoaded(true));
  }, [product.id]);

  if (!isBookProduct(product)) return null;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/admin/books/${product.id}/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toProfilePayload(form)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body.errors as string[] | undefined)?.join("\n") || body.message || `Save failed (${res.status})`);
      setForm(fromProfile(body.profile));
      toast.success("Book details saved");
    } catch (e) {
      toast.error("Could not save", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Book details</Heading>
          <Text size="small" className="text-ui-fg-subtle">Authors, publisher, ISBN, classification and more — shown on the book page and used by search.</Text>
        </div>
        <Button size="small" onClick={save} isLoading={saving} disabled={!loaded}>Save</Button>
      </div>
      <div className="flex flex-col gap-6 px-6 py-4">
        <CategoryPicker
          primaryId={form.primary_category_id}
          additionalIds={[]}
          onPrimaryChange={(id) => setForm({ ...form, primary_category_id: id })}
          onAdditionalChange={() => undefined}
          showAdditional={false}
        />
        <Text size="small" className="text-ui-fg-subtle">Additional subject categories: use the product's own "Categories" field above.</Text>
        <BookProfileFields value={form} onChange={setForm} />
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({ zone: "product.details.after" });
export default BookProfileWidget;
