import { useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export function FileUploadField({ value, onChange, folder = "cms" }: { value: string; onChange: (url: string) => void; folder?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    if (file.type !== "application/pdf") return setError("يُسمح بملفات PDF فقط");
    if (file.size > 25 * 1024 * 1024) return setError("الحد الأقصى 25 ميجابايت");
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await adminFetch(`/api/admin/upload-file?folder=${encodeURIComponent(folder)}`, { method: "POST", body: fd });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "فشل رفع الملف");
      onChange(body.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-1">
      {value ? (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-navy" />
          <a href={value} target="_blank" rel="noreferrer" className="underline text-navy truncate" dir="ltr">{value}</a>
          <button type="button" onClick={() => onChange("")} aria-label="إزالة الملف"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 min-h-10 px-3 border border-dashed border-line rounded cursor-pointer text-sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} رفع ملف PDF
          <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
