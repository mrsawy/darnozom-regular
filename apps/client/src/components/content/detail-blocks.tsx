import { Download, ExternalLink } from "lucide-react";
import type { CmsLink, ContentItem, Lang } from "@/lib/cms-types";
import { EVENT_KINDS, REGION_LABELS, eventCta, formatDate } from "@/lib/cms-labels";
import { RichHtml } from "./rich-html";

const L = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);
const field = (d: Record<string, any>, key: string, lang: Lang) => (lang === "en" && d[`${key}En`] ? d[`${key}En`] : d[`${key}Ar`]) ?? "";

function Section({ title, html }: { title: string; html: string }) {
  if (!html) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-navy mb-3 border-s-4 border-gold ps-3">{title}</h2>
      <RichHtml html={html} />
    </section>
  );
}

export function LinksList({ title, links }: { title: string; links: CmsLink[] }) {
  if (!links?.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-navy mb-3">{title}</h2>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-navy underline underline-offset-4 min-h-11">
              {l.title} <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PdfButton({ url, lang, label }: { url?: string; lang: Lang; label?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-12 px-5 rounded-[4px] bg-navy text-white font-semibold hover:bg-navy-deep">
      <Download className="w-4 h-4" aria-hidden /> {label ?? L(lang, "تحميل الملف", "Download file")}
    </a>
  );
}

export function TypeBlocks({ item, lang }: { item: ContentItem; lang: Lang }) {
  const d = item.details ?? {};
  switch (item.type) {
    case "observatory":
      return (
        <>
          <Section title={L(lang, "ما الذي حدث؟", "What happened?")} html={field(d, "whatHappened", lang)} />
          <Section title={L(lang, "قراءة دار نظم", "DarNozom's reading")} html={field(d, "ourReading", lang)} />
          <Section title={L(lang, "موضوعات تستحق البحث", "Topics worth researching")} html={field(d, "researchQuestions", lang)} />
          <LinksList title={L(lang, "المصادر", "Sources")} links={d.sources} />
        </>
      );
    case "study":
      return (
        <>
          <Section title={L(lang, "سؤال الدراسة", "Research question")} html={field(d, "question", lang)} />
          <Section title={L(lang, "المنهج", "Method")} html={field(d, "method", lang)} />
          <Section title={L(lang, "النتائج", "Findings")} html={field(d, "findings", lang)} />
          <Section title={L(lang, "التوصيات", "Recommendations")} html={field(d, "recommendations", lang)} />
          {d.keywords?.length > 0 && (
            <p className="mt-6 text-sm text-ink-muted">{L(lang, "كلمات مفتاحية: ", "Keywords: ")}{d.keywords.join("، ")}</p>
          )}
          <div className="mt-6"><PdfButton url={d.pdfUrl} lang={lang} label={L(lang, "حمّل الدراسة", "Download the study")} /></div>
        </>
      );
    case "publication":
      return (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {d.issueNumber && <span className="text-ink-muted">{L(lang, "العدد", "Issue")} {d.issueNumber}</span>}
          <PdfButton url={d.pdfUrl} lang={lang} />
        </div>
      );
    case "article":
    case "news":
      return <LinksList title={L(lang, "روابط ذات صلة", "Related links")} links={d.relatedLinks} />;
    case "event":
      return null;
  }
}

export function EventFacts({ item, lang }: { item: ContentItem; lang: Lang }) {
  if (item.type !== "event") return null;
  const d = item.details ?? {};
  const cta = eventCta(d, lang);
  const mode = { in_person: L(lang, "حضوري", "In person"), online: L(lang, "عن بُعد", "Online"), hybrid: L(lang, "حضوري وعن بُعد", "Hybrid") }[d.mode as string] ?? "";
  const venue = field(d, "venue", lang);
  return (
    <dl className="bg-white border border-line rounded-[4px] p-5 space-y-3 text-sm">
      <div><dt className="text-ink-muted">{L(lang, "النوع", "Type")}</dt><dd className="font-semibold">{EVENT_KINDS[d.kind]?.[lang]}</dd></div>
      <div><dt className="text-ink-muted">{L(lang, "الموعد", "Date")}</dt><dd className="font-semibold">{d.startsAt ? `${formatDate(d.startsAt, lang, true, d.timezone || "Africa/Cairo")} (${d.timezone || "Africa/Cairo"})` : L(lang, "يُعلن لاحقًا", "To be announced")}</dd></div>
      {mode && <div><dt className="text-ink-muted">{L(lang, "نمط الحضور", "Attendance")}</dt><dd className="font-semibold">{mode}{venue ? ` — ${venue}` : ""}</dd></div>}
      {d.isExternalEvent && d.organizerName && (
        <div><dt className="text-ink-muted">{L(lang, "فعالية خارجية — الجهة المنظمة", "External event — organiser")}</dt>
          <dd>{d.organizerUrl ? <a className="underline text-navy" href={d.organizerUrl} target="_blank" rel="noopener noreferrer">{d.organizerName}</a> : d.organizerName}</dd></div>
      )}
      {cta.href ? (
        <a href={cta.href} className="mt-2 flex items-center justify-center min-h-12 rounded-[4px] bg-gold-light text-ink font-bold hover:bg-gold">{cta.label}</a>
      ) : (
        <p className="mt-2 text-center text-ink-muted">{cta.label}</p>
      )}
    </dl>
  );
}

export function RegionTag({ item, lang }: { item: ContentItem; lang: Lang }) {
  const r = item.details?.region;
  return r && REGION_LABELS[r] ? <span className="text-sm text-ink-muted">{REGION_LABELS[r][lang]}</span> : null;
}
