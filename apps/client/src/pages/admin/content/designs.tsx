import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { Button } from "@/components/ui/button";
import {
  ABOUT_DESIGNS, ABOUT_META, DEFAULT_DESIGNS, HOME_HERO_DESIGNS, HOME_HERO_META, mergeDesigns, type PageDesigns,
} from "@/lib/page-designs";

const API = "/api/admin/cms/design";

/** Tiny wireframes: dark = navy block, gold = accent, light = text lines. */
const N = "bg-[#183650]";
const G = "bg-[#B59B6B]";
const L = "bg-[#D7E0E8]";
const Bar = ({ c = L, w = "w-full", h = "h-1" }: { c?: string; w?: string; h?: string }) => <div className={`${c} ${w} ${h} rounded-[1px]`} />;

const HERO_PREVIEWS: Record<string, React.ReactNode> = {
  classic: (
    <div className={`${N} relative flex h-full flex-col justify-end gap-1 p-2`}>
      <Bar c={G} w="w-6" /><Bar c="bg-white" w="w-3/4" h="h-1.5" />
      <div className="mt-1 flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-4 flex-1 ${i === 0 ? "bg-[#D2B68F]" : "bg-white/25"}`} />)}</div>
    </div>
  ),
  split: (
    <div className="grid h-full grid-cols-2">
      <div className={`${N} flex flex-col justify-center gap-1 p-2`}><Bar c={G} w="w-5" /><Bar c="bg-white" h="h-1.5" /><Bar c="bg-white/50" w="w-2/3" /><div className={`${G} mt-1 h-2 w-8`} /></div>
      <div className="bg-[#7d93a8]" />
    </div>
  ),
  centered: (
    <div className={`${N} flex h-full flex-col items-center justify-center gap-1 p-2`}>
      <Bar c={G} w="w-8" /><Bar c="bg-white" w="w-4/5" h="h-2" /><Bar c="bg-white/50" w="w-3/5" />
      <div className="mt-1 flex gap-1"><div className={`${G} h-1 w-5 rounded-full`} /><div className="h-1 w-2 rounded-full bg-white/40" /><div className="h-1 w-2 rounded-full bg-white/40" /></div>
    </div>
  ),
  magazine: (
    <div className="grid h-full grid-cols-[2fr_1fr] gap-1 bg-[#F8F6F1] p-1.5">
      <div className={`${N} flex flex-col justify-end gap-1 p-1.5`}><Bar c={G} w="w-5" /><Bar c="bg-white" w="w-3/4" h="h-1.5" /></div>
      <div className="flex flex-col gap-1">{[0, 1, 2].map((i) => <div key={i} className={`flex-1 border ${i === 0 ? "border-[#B59B6B] bg-white" : "border-[#D7E0E8] bg-white/60"}`} />)}</div>
    </div>
  ),
  thumbs: (
    <div className={`${N} flex h-full flex-col justify-end gap-1 p-2`}>
      <Bar c={G} w="w-6" /><Bar c="bg-white" w="w-3/4" h="h-1.5" />
      <div className="mt-1 flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-6 flex-1 ${i === 0 ? "border-t-2 border-[#D2B68F] bg-white/80" : "bg-white/25"}`} />)}</div>
    </div>
  ),
  sidebar: (
    <div className={`${N} grid h-full grid-cols-[2fr_1fr] items-end gap-1.5 p-2`}>
      <div className="space-y-1"><Bar c={G} w="w-6" /><Bar c="bg-white" w="w-4/5" h="h-1.5" /></div>
      <div className="space-y-0.5 bg-white/15 p-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-2 ${i === 0 ? "border-s-2 border-[#D2B68F] bg-white/30" : "bg-white/10"}`} />)}</div>
    </div>
  ),
  jusoor: (
    <div className="flex h-full flex-col justify-end bg-[#7d93a8]">
      <div className="h-1.5 bg-white" />
      <div className="flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2"><div className="w-3/5 space-y-1"><Bar c="bg-white" h="h-2" /><Bar c="bg-white/60" w="w-4/5" /></div><div className="flex gap-1"><div className="h-3 w-3 rounded-full border border-white" /><div className="h-3 w-3 rounded-full border border-white" /></div></div>
    </div>
  ),
  masarat: (
    <div className="flex h-full flex-col gap-1 bg-white p-1.5">
      <div className="flex justify-between border-b border-[#183650] pb-0.5"><Bar c={N} w="w-8" h="h-1.5" /><div className="flex gap-0.5"><div className="h-2 w-2 border border-[#D7E0E8]" /><div className="h-2 w-2 border border-[#D7E0E8]" /></div></div>
      <div className="grid flex-1 grid-cols-[3fr_2fr] gap-1.5"><div className="flex gap-1"><div className="w-1/2 bg-[#7d93a8]" /><div className="flex-1 space-y-1"><Bar c={N} h="h-1.5" /><Bar /><Bar w="w-2/3" /></div></div>
        <div className="space-y-1 border-s border-[#D7E0E8] ps-1">{[0, 1, 2].map((i) => <div key={i} className="flex gap-1"><div className="h-3 w-4 bg-[#7d93a8]" /><Bar c={N} /></div>)}</div></div>
    </div>
  ),
  mokha: (
    <div className="grid h-full grid-cols-[2fr_1fr] gap-1.5 bg-white p-1.5">
      <div className={`${N} relative flex flex-col justify-end gap-1 p-1.5`}><div className="absolute end-1 top-1 h-2 w-6 bg-white/30" /><Bar c={G} w="w-5" /><Bar c="bg-white" w="w-3/4" h="h-1.5" /><div className="mt-0.5 h-0.5 w-full bg-white/20"><div className={`${G} h-full w-1/6`} /></div></div>
      <div className="flex flex-col gap-1">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex flex-1 items-center gap-0.5 border-b border-[#D7E0E8]"><div className="h-full w-1/3 bg-[#7d93a8]" /><div className="flex-1 space-y-0.5"><Bar c={G} w="w-1/3" /><Bar c={N} /></div></div>)}</div>
    </div>
  ),
  rosewell: (
    <div className={`${N} flex h-full flex-col justify-between p-2`}>
      <div className="h-1 w-full bg-white/20" />
      <div className="space-y-1"><Bar c={G} w="w-5" /><Bar c="bg-white" w="w-3/5" h="h-2" /><div className={`${G} mt-1 h-2 w-8`} /></div>
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-4 flex-1 border-t border-white/40 ${i === 0 ? "bg-white/30" : "bg-white/10"}`} />)}</div>
    </div>
  ),
};

const ABOUT_PREVIEWS: Record<string, React.ReactNode> = {
  classic: (
    <div className="flex h-full flex-col bg-white">
      <div className={`${N} flex-[3] p-2`}><Bar c="bg-white" w="w-1/2" h="h-1.5" /></div>
      <div className="-mt-3 grid flex-[2] grid-cols-2 gap-1 px-2"><div className="border-t-2 border-[#B59B6B] bg-white shadow" /><div className="border-t-2 border-[#B59B6B] bg-white shadow" /></div>
    </div>
  ),
  split: (
    <div className="flex h-full flex-col bg-[#F8F6F1]">
      <div className="grid flex-[3] grid-cols-2 items-center gap-2 p-2"><div className="space-y-1"><Bar c={N} w="w-3/4" h="h-1.5" /><Bar /><Bar w="w-2/3" /></div><div className="h-full bg-[#7d93a8]" /></div>
      <div className="flex flex-[2] gap-1.5 bg-[#EAF0F6] p-2"><div className={`${N} h-3 w-3 shrink-0 rounded-full`} /><div className="flex-1 space-y-1"><Bar c={N} w="w-1/3" /><Bar /></div></div>
    </div>
  ),
  editorial: (
    <div className="flex h-full flex-col gap-1 bg-white p-2">
      <Bar c={N} w="w-4/5" h="h-2" /><Bar c={N} w="w-3/5" h="h-2" />
      <div className="my-0.5 h-5 w-full bg-[#7d93a8]" />
      <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="border-t border-[#183650] pt-0.5"><Bar /></div>)}</div>
      <div className="mt-0.5 flex gap-1"><div className="h-2 w-6 rounded-full border border-[#183650]/40" /><div className="h-2 w-8 rounded-full border border-[#183650]/40" /><div className="h-2 w-5 rounded-full border border-[#183650]/40" /></div>
    </div>
  ),
  rosewell: (
    <div className="flex h-full flex-col bg-white">
      <div className={`${N} p-1.5`}><Bar c="bg-white" w="w-1/4" h="h-1.5" /></div>
      {[false, true, false].map((rev, i) => (
        <div key={i} className={`flex flex-1 items-center gap-1.5 px-2 ${rev ? "flex-row-reverse bg-[#EAF0F6]" : ""}`}>
          <div className="flex-1 space-y-0.5"><Bar c={N} w="w-1/2" /><Bar /><Bar w="w-2/3" /></div><div className="h-4/5 w-1/3 bg-[#7d93a8]" />
        </div>
      ))}
    </div>
  ),
  immersive: (
    <div className={`${N} flex h-full flex-col items-center gap-1 p-2`}>
      <div className="mt-1 h-1.5 w-8 rounded-full border border-[#B59B6B]" /><Bar c="bg-white" w="w-4/5" h="h-2" /><Bar c="bg-white/40" w="w-3/5" />
      <div className="mt-1.5 grid w-full grid-cols-2 gap-1"><div className="h-5 rounded border border-white/20 bg-white/10" /><div className="h-5 rounded border border-white/20 bg-white/10" /></div>
    </div>
  ),
};

function Picker<K extends string>({ title, description, options, meta, previews, value, onChange }: {
  title: string; description: string; options: readonly K[]; meta: Record<K, { titleAr: string; descAr: string }>;
  previews: Record<string, React.ReactNode>; value: K; onChange: (v: K) => void;
}) {
  return (
    <section className="mb-6 border border-line bg-white p-5">
      <h2 className="font-black text-primary">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{description}</p>
      <div role="radiogroup" aria-label={title} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {options.map((o, i) => {
          const on = value === o;
          return (
            <button key={o} type="button" role="radio" aria-checked={on} onClick={() => onChange(o)}
              className={`text-start border-2 p-2 transition ${on ? "border-primary bg-mist" : "border-line hover:border-gold"}`}>
              <div className="relative aspect-[16/10] overflow-hidden border border-line">
                {previews[o]}
                {on && <span className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white"><Check className="h-3 w-3" /></span>}
              </div>
              <div className="mt-2 font-bold">{i + 1}. {meta[o].titleAr}</div>
              <div className="text-xs leading-5 text-muted-foreground">{meta[o].descAr}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminDesigns() {
  const [d, setD] = useState<PageDesigns>(DEFAULT_DESIGNS);
  const [saved, setSaved] = useState<PageDesigns>(DEFAULT_DESIGNS);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    adminFetchJson<Partial<PageDesigns>>("/api/cms/design")
      .then((r) => { const m = mergeDesigns(r); setD(m); setSaved(m); })
      .catch((e) => show((e as Error).message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = d.homeHero !== saved.homeHero || d.about !== saved.about;

  const save = async () => {
    setSaving(true);
    try {
      const r = await adminFetch(API, { method: "PUT", headers: adminJsonHeaders(), body: JSON.stringify(d) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) return show(res.error || "تعذّر الحفظ", "error");
      setSaved(mergeDesigns(res));
      void qc.invalidateQueries({ queryKey: ["cms", "design"] });
      show("تم الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-6xl">
      <Toast toast={toast} />
      <PageHeader
        title="تصاميم الصفحات"
        description="اختر شكل واجهة الصفحة الرئيسية وصفحة من نحن. المحتوى نفسه لا يتغيّر، فقط طريقة عرضه."
        actions={<Button type="button" className="rounded-none" disabled={saving || !dirty} onClick={save}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>}
      />
      <Picker title="واجهة الصفحة الرئيسية (Hero)" description="تعرض المختارات التي تديرها من «الرئيسية (المختارات)». كل تصميم يغيّر أيضًا شكل شريط التنقل ليناسبه."
        options={HOME_HERO_DESIGNS} meta={HOME_HERO_META} previews={HERO_PREVIEWS} value={d.homeHero} onChange={(v) => setD((p) => ({ ...p, homeHero: v }))} />
      <Picker title="صفحة من نحن" description="يستخدم النصوص والصورة من صفحة «من نحن»."
        options={ABOUT_DESIGNS} meta={ABOUT_META} previews={ABOUT_PREVIEWS} value={d.about} onChange={(v) => setD((p) => ({ ...p, about: v }))} />
      <div className="flex items-center gap-4">
        <Button type="button" className="rounded-none" disabled={saving || !dirty} onClick={save}>{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>
        <a href="/" target="_blank" rel="noreferrer" className="text-sm text-primary underline">معاينة الرئيسية</a>
        <a href="/about" target="_blank" rel="noreferrer" className="text-sm text-primary underline">معاينة من نحن</a>
      </div>
    </div>
  );
}
