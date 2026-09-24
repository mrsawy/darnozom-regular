import { useEffect, useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { adminFetch } from "../../../lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";
import type { ManualPaymentCode, ManualPaymentDetails } from "@/lib/manual-payments";

// Vodafone Cash / InstaPay details shown to buyers. Stored in Medusa
// (manualPayment module) — this page edits the same rows as Medusa Admin →
// Settings → Manual payments, through the Express proxy.
type Method = ManualPaymentDetails & { id: string };

const TITLES: Record<ManualPaymentCode, string> = {
  vodafone_cash: "فودافون كاش",
  instapay: "إنستاباي",
};

const FIELDS: Array<{
  key: keyof Method;
  label: string;
  codes: ManualPaymentCode[];
  multiline?: boolean;
}> = [
  { key: "account_number", label: "رقم المحفظة / الحساب", codes: ["vodafone_cash", "instapay"] },
  { key: "account_name", label: "اسم صاحب الحساب", codes: ["vodafone_cash", "instapay"] },
  { key: "whatsapp_number", label: "رقم واتساب لتأكيد الدفع", codes: ["vodafone_cash", "instapay"] },
  { key: "instapay_address", label: "عنوان إنستاباي", codes: ["instapay"] },
  { key: "instructions_ar", label: "التعليمات (عربي)", codes: ["vodafone_cash", "instapay"], multiline: true },
  { key: "instructions_en", label: "التعليمات (إنجليزي)", codes: ["vodafone_cash", "instapay"], multiline: true },
];

function MethodCard({
  initial,
  onToast,
}: {
  initial: Method;
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [form, setForm] = useState<Method>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof Method, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadQr(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch("/api/admin/manual-payments/qr", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "فشل رفع الصورة");
      set("qr_image_url", body.url);
    } catch (e) {
      onToast((e as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { id: _id, code, ...patch } = form;
      const r = await adminFetch(`/api/admin/manual-payments/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "فشل الحفظ");
      setForm(body.method);
      onToast(`تم حفظ ${TITLES[code]}`);
    } catch (e) {
      onToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border bg-card p-5 space-y-4" data-testid={`manual-card-${form.code}`}>
      <h2 className="text-lg font-black text-primary">{TITLES[form.code]}</h2>
      {FIELDS.filter((f) => f.codes.includes(form.code)).map((f) => (
        <label key={f.key} className="block space-y-1">
          <span className="text-xs font-bold text-muted-foreground">{f.label}</span>
          {f.multiline ? (
            <textarea
              rows={3}
              className="w-full border border-input bg-background p-2 text-sm rounded-none"
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <Input
              className="rounded-none"
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </label>
      ))}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground">
          صورة رمز QR {form.code === "vodafone_cash" ? "(اختياري)" : ""}
        </span>
        {form.qr_image_url && (
          <img
            src={form.qr_image_url}
            alt="QR"
            className="w-40 h-40 object-contain border border-border"
          />
        )}
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع صورة
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
            />
          </label>
          {form.qr_image_url && (
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => set("qr_image_url", "")}
            >
              إزالة
            </Button>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-none gap-2 font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ
        </Button>
      </div>
    </div>
  );
}

export default function ManualPaymentsSettingsPage() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast, show } = useToast();

  useEffect(() => {
    adminFetch("/api/admin/manual-payments")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "تعذر التحميل");
        setMethods(body.methods);
      })
      .catch((e) => setLoadError((e as Error).message));
  }, []);

  return (
    <div className="space-y-6">
      <Toast toast={toast} />
      <PageHeader
        title="الدفع اليدوي"
        description="بيانات فودافون كاش وإنستاباي التي تظهر للمشتري. تفعيل الطريقتين لكل منطقة من إعدادات Medusa (Regions)."
      />
      {loadError && (
        <div className="border border-red-500/40 bg-red-500/10 p-3 text-red-700">{loadError}</div>
      )}
      {!methods && !loadError && <Loader2 className="w-5 h-5 animate-spin" />}
      <div className="grid gap-6 md:grid-cols-2">
        {methods?.map((m) => <MethodCard key={m.code} initial={m} onToast={show} />)}
      </div>
    </div>
  );
}
