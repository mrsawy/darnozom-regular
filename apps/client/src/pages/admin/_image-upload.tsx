import { useState } from "react";
import { adminFetch } from "../../lib/admin-api";
import { Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ImageUploadField({
  value,
  onChange,
  folder,
  placeholder = "رابط الصورة أو ارفع",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("الصيغ المسموحة: JPG, PNG, WebP"); return;
    }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await adminFetch(`/api/admin/upload-image?folder=${encodeURIComponent(folder)}`, {
        method: "POST", credentials: "include", body: fd,
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        setError((e as { error?: string }).error || "فشل الرفع");
        return;
      }
      const { url } = await r.json();
      onChange(url);
    } finally { setUploading(false); }
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="rounded-none flex-1" dir="ltr" />
        <label className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-bold cursor-pointer shrink-0 ${uploading ? "border-border text-muted-foreground" : "border-secondary/50 text-secondary hover:bg-secondary/10"}`}>
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} رفع
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {value && <img src={value} alt="" className="h-16 mt-2 border border-border" />}
    </div>
  );
}
