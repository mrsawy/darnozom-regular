import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";

type Code = "vodafone_cash" | "instapay";
interface Method {
  id: string;
  code: Code;
  account_number: string | null;
  account_name: string | null;
  whatsapp_number: string | null;
  instapay_address: string | null;
  qr_image_url: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
}

const TITLES: Record<Code, string> = {
  vodafone_cash: "Vodafone Cash",
  instapay: "InstaPay",
};

const FIELDS: Array<{ key: keyof Method; label: string; codes: Code[]; multiline?: boolean }> = [
  { key: "account_number", label: "Wallet / account number", codes: ["vodafone_cash", "instapay"] },
  { key: "account_name", label: "Account holder name", codes: ["vodafone_cash", "instapay"] },
  { key: "whatsapp_number", label: "WhatsApp confirmation number", codes: ["vodafone_cash", "instapay"] },
  { key: "instapay_address", label: "InstaPay address (e.g. name@instapay)", codes: ["instapay"] },
  { key: "instructions_ar", label: "Instructions (Arabic)", codes: ["vodafone_cash", "instapay"], multiline: true },
  { key: "instructions_en", label: "Instructions (English)", codes: ["vodafone_cash", "instapay"], multiline: true },
];

function MethodCard({ initial }: { initial: Method }) {
  const [form, setForm] = useState<Method>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof Method, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadQr = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/admin/uploads", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      set("qr_image_url", body.files[0].url);
    } catch (e) {
      toast.error("QR upload failed", { description: String(e) });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { id: _id, code, ...patch } = form;
      const res = await fetch(`/admin/manual-payment-methods/${code}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      setForm(body.method);
      toast.success(`${TITLES[code]} saved`);
    } catch (e) {
      toast.error("Save failed", { description: String((e as Error).message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="flex flex-col gap-y-4 p-6">
      <Heading level="h2">{TITLES[form.code]}</Heading>
      {FIELDS.filter((f) => f.codes.includes(form.code)).map((f) => (
        <div key={f.key} className="flex flex-col gap-y-1">
          <Label htmlFor={`${form.code}-${f.key}`}>{f.label}</Label>
          {f.multiline ? (
            <Textarea
              id={`${form.code}-${f.key}`}
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <Input
              id={`${form.code}-${f.key}`}
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="flex flex-col gap-y-2">
        <Label>QR code image {form.code === "vodafone_cash" ? "(optional)" : ""}</Label>
        {form.qr_image_url ? (
          <img src={form.qr_image_url} alt="QR" className="h-40 w-40 rounded border object-contain" />
        ) : (
          <Text size="small" className="text-ui-fg-subtle">No QR image uploaded.</Text>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
        />
        {form.qr_image_url && (
          <Button size="small" variant="secondary" onClick={() => set("qr_image_url", "")}>
            Remove QR
          </Button>
        )}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving}>Save</Button>
      </div>
    </Container>
  );
}

const ManualPaymentsPage = () => {
  const [methods, setMethods] = useState<Method[] | null>(null);

  useEffect(() => {
    fetch("/admin/manual-payment-methods", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => setMethods(b.methods))
      .catch(() => setMethods([]));
  }, []);

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-6">
        <Heading level="h1">Manual payments</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Details buyers see when paying by Vodafone Cash or InstaPay. Enable the methods per
          region in Settings → Regions. Confirm a payment with "Mark as paid" on the order.
        </Text>
      </Container>
      {methods === null ? (
        <Text>Loading…</Text>
      ) : (
        methods.map((m) => <MethodCard key={m.code} initial={m} />)
      )}
    </div>
  );
};

export const config = defineRouteConfig({
  label: "Manual payments",
});

export default ManualPaymentsPage;
