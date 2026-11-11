import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { ImageUploadField } from "@/pages/admin/_image-upload";
import { Button } from "@/components/ui/button";
import { DEFAULT_ABOUT, mergeAbout, type AboutContent } from "@/lib/about-content";

const API = "/api/admin/cms/about";
const inputCls = "w-full min-h-10 px-3 py-2 border border-line rounded bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-ink mb-1">{label}</span>
      {children}
    </label>
  );
}

function Pair({ label, ar, en, onAr, onEn, rows = 0 }: {
  label: string; ar: string; en: string; onAr: (v: string) => void; onEn: (v: string) => void; rows?: number;
}) {
  const props = (value: string, onChange: (v: string) => void, dir: "rtl" | "ltr") =>
    rows
      ? <textarea rows={rows} className={inputCls} dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />
      : <input className={inputCls} dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Field label={`${label} (عربي)`}>{props(ar, onAr, "rtl")}</Field>
      <Field label={`${label} (English)`}>{props(en, onEn, "ltr")}</Field>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-white border border-line p-5 mb-5 space-y-4">
    <h2 className="font-black text-primary">{title}</h2>
    {children}
  </section>
);

export default function AdminAbout() {
  const [c, setC] = useState<AboutContent>(DEFAULT_ABOUT);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    adminFetchJson<Partial<AboutContent>>(API).then((d) => setC(mergeAbout(d))).catch((e) => show((e as Error).message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof AboutContent>(k: K, v: AboutContent[K]) => setC((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await adminFetch(API, { method: "PUT", headers: adminJsonHeaders(), body: JSON.stringify(c) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) return show(res.error || "تعذّر الحفظ", "error");
      void qc.invalidateQueries({ queryKey: ["cms", "about"] });
      show("تم الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl">
      <Toast toast={toast} />
      <PageHeader
        title="من نحن"
        description="محتوى صفحة /about: الصورة والنصوص والمنهج والقيم. الحقل الفارغ يعود إلى النص الافتراضي."
        actions={<Button type="button" className="rounded-none" disabled={saving} onClick={save}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>}
      />

      <Section title="الصورة">
        <ImageUploadField value={c.imageUrl} onChange={(v) => set("imageUrl", v)} folder="about" />
        <p className="text-xs text-muted-foreground">تظهر أسفل العنوان. اترك الحقل فارغًا لإخفاء الصورة.</p>
        <p className="pt-2 text-sm font-bold">صور الأقسام (لتصميم «على طريقة روزويل»)</p>
        <div className="grid gap-4 md:grid-cols-2">
          {([
            ["visionImageUrl", "صورة الرؤية"], ["missionImageUrl", "صورة الرسالة"], ["approachImageUrl", "صورة المنهج"],
            ["valuesImageUrl", "صورة القيم"], ["structureImageUrl", "صورة هيكل المؤسسة"],
          ] as const).map(([k, label]) => (
            <Field key={k} label={label}><ImageUploadField value={c[k]} onChange={(v) => set(k, v)} folder="about" /></Field>
          ))}
        </div>
      </Section>

      <Section title="المقدمة">
        <Pair label="العنوان" ar={c.titleAr} en={c.titleEn} onAr={(v) => set("titleAr", v)} onEn={(v) => set("titleEn", v)} />
        <Pair label="النص" rows={8} ar={c.introAr} en={c.introEn} onAr={(v) => set("introAr", v)} onEn={(v) => set("introEn", v)} />
      </Section>

      <Section title="الرؤية والرسالة">
        <Pair label="الرؤية" rows={4} ar={c.visionAr} en={c.visionEn} onAr={(v) => set("visionAr", v)} onEn={(v) => set("visionEn", v)} />
        <Pair label="الرسالة" rows={5} ar={c.missionAr} en={c.missionEn} onAr={(v) => set("missionAr", v)} onEn={(v) => set("missionEn", v)} />
      </Section>

      <Section title="المنهج">
        <Pair label="مقدمة المنهج" rows={4} ar={c.approachIntroAr} en={c.approachIntroEn} onAr={(v) => set("approachIntroAr", v)} onEn={(v) => set("approachIntroEn", v)} />
        {c.steps.map((s, i) => {
          const upd = (patch: Partial<typeof s>) => set("steps", c.steps.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <div key={i} className="border border-line p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">الخطوة {i + 1}</span>
                <button type="button" aria-label="حذف الخطوة" className="text-red-500" onClick={() => set("steps", c.steps.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </div>
              <Pair label="العنوان" ar={s.ar} en={s.en} onAr={(v) => upd({ ar: v })} onEn={(v) => upd({ en: v })} />
              <Pair label="الوصف" rows={4} ar={s.descAr} en={s.descEn} onAr={(v) => upd({ descAr: v })} onEn={(v) => upd({ descEn: v })} />
            </div>
          );
        })}
        <Button type="button" variant="outline" className="rounded-none gap-2" onClick={() => set("steps", [...c.steps, { ar: "", en: "", descAr: "", descEn: "" }])}>
          <Plus className="w-4 h-4" /> إضافة خطوة
        </Button>
      </Section>

      <Section title="القيم">
        {c.values.map((v, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <Pair label="القيمة" ar={v.ar} en={v.en}
                onAr={(x) => set("values", c.values.map((y, j) => (j === i ? { ...y, ar: x } : y)))}
                onEn={(x) => set("values", c.values.map((y, j) => (j === i ? { ...y, en: x } : y)))} />
            </div>
            <button type="button" aria-label="حذف القيمة" className="text-red-500 pb-3" onClick={() => set("values", c.values.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
          </div>
        ))}
        <Button type="button" variant="outline" className="rounded-none gap-2" onClick={() => set("values", [...c.values, { ar: "", en: "" }])}>
          <Plus className="w-4 h-4" /> إضافة قيمة
        </Button>
      </Section>

      <Button type="button" className="rounded-none" disabled={saving} onClick={save}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>
    </div>
  );
}
