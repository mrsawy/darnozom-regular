import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Trash2 } from "lucide-react";
import { adminFetch, adminFetchJson, adminJsonHeaders } from "@/lib/admin-api";
import type { CmsLink, ContentItem, ContentType } from "@/lib/cms-types";
import { contentPath } from "@/lib/cms-labels";
import { useAreas } from "@/lib/cms-areas";
import { TYPE_CONFIG, emptyDetails, type FieldDef } from "@/lib/content-types";
import { PageHeader, Toast, useToast } from "@/pages/admin/layout";
import { ImageUploadField } from "@/pages/admin/_image-upload";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { FileUploadField } from "@/components/admin/file-upload-field";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "./content-list";
import { DEFAULT_EVENT_TZ, browserTimeZone, fromZonedInput, toZonedInput } from "@/lib/datetime";
import NotFound from "@/pages/not-found";

type Form = Omit<ContentItem, "id" | "createdAt" | "updatedAt">;

const blank = (type: ContentType): Form => ({
  type, slug: "", status: "draft", titleAr: "", titleEn: "", summaryAr: "", summaryEn: "", bodyAr: "", bodyEn: "",
  coverImageUrl: "", area: null, authorAr: "دار نظم", authorEn: "DarNozom", isExternal: false, externalUrl: "",
  publishedAt: null, details: emptyDetails(type),
});

const inputCls = "w-full min-h-10 px-3 border border-line rounded bg-white";

function ContentEditor({ type, id }: { type: ContentType; id: string }) {
  const cfg = TYPE_CONFIG[type];
  const isNew = id === "new";
  const [, navigate] = useLocation();
  const { areas } = useAreas();
  const [form, setForm] = useState<Form>(() => blank(type));
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    if (isNew) return;
    adminFetchJson<ContentItem>(`/api/admin/cms/items/${id}`)
      .then(({ id: _i, createdAt: _c, updatedAt: _u, ...rest }) => setForm({ ...rest, details: { ...emptyDetails(type), ...rest.details } }))
      .catch((e) => show((e as Error).message, "error"));
  }, [id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setD = (k: string, v: unknown) => setForm((f) => ({ ...f, details: { ...f.details, [k]: v } }));
  const sfx = lang === "ar" ? "Ar" : "En";

  const save = async () => {
    setSaving(true); setIssues([]);
    const details = Object.fromEntries(Object.entries(form.details).filter(([, v]) => v !== "" && v !== undefined));
    const payload = { ...form, details };
    const r = await adminFetch(isNew ? "/api/admin/cms/items" : `/api/admin/cms/items/${id}`, {
      method: isNew ? "POST" : "PUT", headers: adminJsonHeaders(), body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setIssues(body.issues?.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`) ?? [body.error ?? "تعذّر الحفظ"]);
      return;
    }
    show("تم الحفظ");
    if (isNew) navigate(`/admin/content/${type}/${body.id}`);
    else setForm((f) => ({ ...f, slug: body.slug, publishedAt: body.publishedAt }));
  };

  const renderDetail = (f: FieldDef) => {
    const d = form.details;
    switch (f.kind) {
      case "select":
        return (
          <label key={f.key} className="block">
            <span className="text-sm font-semibold">{f.labelAr}</span>
            <select aria-label={f.labelAr} className={inputCls} value={d[f.key] ?? ""} onChange={(e) => setD(f.key, e.target.value || undefined)}>
              <option value="">{f.required ? "— اختر —" : "— بدون —"}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.labelAr}</option>)}
            </select>
          </label>
        );
      case "text": {
        const key = f.bilingual ? `${f.key}${sfx}` : f.key;
        const label = f.bilingual ? `${f.labelAr} (${lang === "ar" ? "عربي" : "إنجليزي"})` : f.labelAr;
        return (
          <label key={key} className="block">
            <span className="text-sm font-semibold">{label}</span>
            <input aria-label={label} className={inputCls} value={d[key] ?? ""} onChange={(e) => setD(key, e.target.value)} dir={/url/i.test(f.key) ? "ltr" : undefined} />
          </label>
        );
      }
      case "html": {
        const label = `${f.labelAr} (${lang === "ar" ? "عربي" : "إنجليزي"})`;
        return (
          <div key={`${f.key}${sfx}`}>
            <span className="text-sm font-semibold">{label}</span>
            <RichTextEditor label={label} dir={lang === "ar" ? "rtl" : "ltr"} value={d[`${f.key}${sfx}`] ?? ""} onChange={(v) => setD(`${f.key}${sfx}`, v)} />
          </div>
        );
      }
      case "links": {
        const links: CmsLink[] = d[f.key] ?? [];
        const update = (next: CmsLink[]) => setD(f.key, next);
        return (
          <fieldset key={f.key} className="space-y-2">
            <legend className="text-sm font-semibold">{f.labelAr}</legend>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label="عنوان الرابط" className={inputCls} placeholder="العنوان" value={l.title} onChange={(e) => update(links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <input aria-label="الرابط" className={inputCls} dir="ltr" placeholder="https://" value={l.url} onChange={(e) => update(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <button type="button" aria-label="حذف الرابط" onClick={() => update(links.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-destructive" /></button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-none gap-1" onClick={() => update([...links, { title: "", url: "" }])}><Plus className="w-3 h-3" /> إضافة رابط</Button>
          </fieldset>
        );
      }
      case "tags":
        return (
          <label key={f.key} className="block">
            <span className="text-sm font-semibold">{f.labelAr} (افصل بفاصلة)</span>
            <input aria-label={f.labelAr} className={inputCls} value={(d[f.key] ?? []).join("، ")} onChange={(e) => setD(f.key, e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} />
          </label>
        );
      case "file":
        return (
          <div key={f.key}>
            <span className="text-sm font-semibold">{f.labelAr}</span>
            <FileUploadField value={d[f.key] ?? ""} onChange={(v) => setD(f.key, v)} folder="cms" />
          </div>
        );
      case "datetime": {
        // Event times are entered in the event's own timezone (default Cairo).
        const tz = d.timezone || DEFAULT_EVENT_TZ;
        return (
          <label key={f.key} className="block">
            <span className="text-sm font-semibold">{f.labelAr} (بتوقيت {tz})</span>
            <input type="datetime-local" aria-label={f.labelAr} className={inputCls} value={toZonedInput(d[f.key], tz)} onChange={(e) => setD(f.key, fromZonedInput(e.target.value, tz))} />
          </label>
        );
      }
      case "checkbox":
        return (
          <label key={f.key} className="flex items-center gap-2">
            <input type="checkbox" checked={!!d[f.key]} onChange={(e) => setD(f.key, e.target.checked)} /> <span className="text-sm">{f.labelAr}</span>
          </label>
        );
    }
  };

  return (
    <div className="max-w-4xl">
      <Toast toast={toast} />
      <PageHeader
        title={isNew ? `${cfg.labelAr} جديد` : `تعديل ${cfg.labelAr}`}
        actions={
          <>
            <Link href={`/admin/content/${type}`} className="text-sm underline">رجوع للقائمة</Link>
            {!isNew && form.slug && <a href={`${contentPath(type, form.slug)}?preview=1`} target="_blank" rel="noreferrer" className="text-sm underline">معاينة</a>}
            <Button type="button" onClick={save} disabled={saving} className="rounded-none">{saving ? "جارٍ الحفظ…" : "حفظ"}</Button>
          </>
        }
      />
      {issues.length > 0 && (
        <ul role="alert" className="mb-4 border border-destructive/40 bg-red-50 p-3 text-sm text-destructive list-disc ps-6">
          {issues.map((i) => <li key={i}>{i}</li>)}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <label className="block">
          <span className="text-sm font-semibold">الحالة</span>
          <select aria-label="الحالة" className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">المجال</span>
          <select aria-label="المجال" className={inputCls} value={form.area ?? ""} onChange={(e) => set("area", (e.target.value || null) as Form["area"])}>
            <option value="">— بدون —</option>
            {areas.filter((a) => a.isActive || a.slug === form.area).map((a) => <option key={a.slug} value={a.slug}>{a.labelAr}{a.isActive ? "" : " (معطّل)"}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">تاريخ النشر</span>
          <input type="datetime-local" aria-label="تاريخ النشر" className={inputCls} value={toZonedInput(form.publishedAt, browserTimeZone())} onChange={(e) => set("publishedAt", fromZonedInput(e.target.value, browserTimeZone()) ?? null)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold">الرابط المختصر (slug) — يُولَّد تلقائيًا إن تُرك فارغًا</span>
          <input aria-label="الرابط المختصر" className={inputCls} dir="ltr" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </label>
        <label className="flex items-center gap-2 mt-6">
          <input type="checkbox" checked={form.isExternal} onChange={(e) => set("isExternal", e.target.checked)} /> <span className="text-sm">مرجع من جهة أخرى</span>
        </label>
        {form.isExternal && (
          <label className="block sm:col-span-3">
            <span className="text-sm font-semibold">رابط المصدر الأصلي</span>
            <input aria-label="رابط المصدر الأصلي" className={inputCls} dir="ltr" value={form.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} />
          </label>
        )}
        <div className="sm:col-span-3">
          <span className="text-sm font-semibold">صورة الغلاف</span>
          <ImageUploadField value={form.coverImageUrl} onChange={(v) => set("coverImageUrl", v)} folder="cms" />
        </div>
      </div>

      <div role="tablist" className="flex gap-2 border-b border-line mb-4">
        {(["ar", "en"] as const).map((l) => (
          <button key={l} role="tab" type="button" aria-selected={lang === l} onClick={() => setLang(l)} className={`px-4 min-h-10 border-b-2 font-semibold ${lang === l ? "border-gold text-navy" : "border-transparent text-ink-muted"}`}>
            {l === "ar" ? "العربية" : "English"}
          </button>
        ))}
      </div>

      <div className="space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
        {(["title", "author"] as const).map((k) => {
          const label = `${k === "title" ? "العنوان" : "الكاتب أو الجهة"} (${lang === "ar" ? "عربي" : "إنجليزي"})`;
          return (
            <label key={k} className="block">
              <span className="text-sm font-semibold">{label}</span>
              <input aria-label={label} className={inputCls} value={form[`${k}${sfx}` as keyof Form] as string} onChange={(e) => set(`${k}${sfx}` as keyof Form, e.target.value as never)} />
            </label>
          );
        })}
        <label className="block">
          <span className="text-sm font-semibold">{`الملخص (${lang === "ar" ? "عربي" : "إنجليزي"})`}</span>
          <textarea aria-label={`الملخص (${lang === "ar" ? "عربي" : "إنجليزي"})`} rows={3} className={`${inputCls} py-2`} value={form[`summary${sfx}`]} onChange={(e) => set(`summary${sfx}`, e.target.value)} />
        </label>
        <div>
          <span className="text-sm font-semibold">{`النص (${lang === "ar" ? "عربي" : "إنجليزي"})`}</span>
          <RichTextEditor label={`النص (${lang === "ar" ? "عربي" : "إنجليزي"})`} dir={lang === "ar" ? "rtl" : "ltr"} value={form[`body${sfx}`]} onChange={(v) => set(`body${sfx}`, v)} />
        </div>
      </div>

      {cfg.detailFields.length > 0 && (
        <section className="mt-8 border-t border-line pt-6 space-y-4" dir="rtl">
          <h2 className="font-bold text-navy">{`بيانات ${cfg.labelAr}`}</h2>
          {cfg.detailFields.map(renderDetail)}
        </section>
      )}
    </div>
  );
}

/** Route entry: unknown :type values render NotFound (guard kept outside the hooks). */
export default function AdminContentEditor(props: { type: ContentType; id: string }) {
  return props.type in TYPE_CONFIG ? <ContentEditor {...props} /> : <NotFound />;
}
