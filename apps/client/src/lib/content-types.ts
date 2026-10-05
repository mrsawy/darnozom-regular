import type { ContentType } from "./cms-types";
import { EVENT_KINDS, OBSERVATORY_KINDS, REGION_LABELS } from "./cms-labels";

type Opt = { value: string; labelAr: string };
const opts = (rec: Record<string, { ar: string }>): Opt[] => Object.entries(rec).map(([value, l]) => ({ value, labelAr: l.ar }));

export type FieldDef =
  | { kind: "select"; key: string; labelAr: string; options: Opt[]; required?: boolean }
  | { kind: "text"; key: string; labelAr: string; bilingual?: boolean }
  | { kind: "html"; key: string; labelAr: string }
  | { kind: "links"; key: string; labelAr: string }
  | { kind: "tags"; key: string; labelAr: string }
  | { kind: "file"; key: string; labelAr: string }
  | { kind: "datetime"; key: string; labelAr: string }
  | { kind: "checkbox"; key: string; labelAr: string };

export const TYPE_CONFIG: Record<ContentType, { labelAr: string; pluralAr: string; detailFields: FieldDef[] }> = {
  observatory: {
    labelAr: "مادة رصد", pluralAr: "المرصد",
    detailFields: [
      { kind: "select", key: "kind", labelAr: "نوع المادة", options: opts(OBSERVATORY_KINDS), required: true },
      { kind: "select", key: "region", labelAr: "النطاق الجغرافي", options: opts(REGION_LABELS) },
      { kind: "html", key: "whatHappened", labelAr: "ما الذي حدث؟" },
      { kind: "html", key: "ourReading", labelAr: "قراءة دار نظم" },
      { kind: "html", key: "researchQuestions", labelAr: "موضوعات تستحق البحث" },
      { kind: "links", key: "sources", labelAr: "المصادر" },
    ],
  },
  article: { labelAr: "مقال", pluralAr: "المقالات", detailFields: [{ kind: "links", key: "relatedLinks", labelAr: "روابط ذات صلة" }] },
  study: {
    labelAr: "دراسة", pluralAr: "الدراسات",
    detailFields: [
      { kind: "html", key: "question", labelAr: "سؤال الدراسة" },
      { kind: "html", key: "method", labelAr: "المنهج" },
      { kind: "html", key: "findings", labelAr: "النتائج" },
      { kind: "html", key: "recommendations", labelAr: "التوصيات" },
      { kind: "tags", key: "keywords", labelAr: "كلمات مفتاحية" },
      { kind: "file", key: "pdfUrl", labelAr: "ملف الدراسة (PDF)" },
    ],
  },
  publication: {
    labelAr: "إصدار", pluralAr: "الإصدارات",
    detailFields: [
      { kind: "select", key: "kind", labelAr: "نوع الإصدار", required: true, options: [
        { value: "report", labelAr: "تقرير" }, { value: "periodical", labelAr: "دورية" }, { value: "research", labelAr: "بحث علمي" },
      ] },
      { kind: "text", key: "issueNumber", labelAr: "رقم العدد" },
      { kind: "file", key: "pdfUrl", labelAr: "ملف الإصدار (PDF)" },
    ],
  },
  news: { labelAr: "خبر", pluralAr: "الأخبار", detailFields: [{ kind: "links", key: "relatedLinks", labelAr: "روابط ذات صلة" }] },
  event: {
    labelAr: "فعالية", pluralAr: "الفعاليات",
    detailFields: [
      { kind: "select", key: "kind", labelAr: "نوع الفعالية", options: opts(EVENT_KINDS), required: true },
      { kind: "datetime", key: "startsAt", labelAr: "تبدأ في" },
      { kind: "datetime", key: "endsAt", labelAr: "تنتهي في" },
      { kind: "select", key: "mode", labelAr: "نمط الحضور", options: [
        { value: "in_person", labelAr: "حضوري" }, { value: "online", labelAr: "عن بُعد" }, { value: "hybrid", labelAr: "حضوري وعن بُعد" },
      ] },
      { kind: "text", key: "venue", labelAr: "المكان", bilingual: true },
      { kind: "select", key: "registration", labelAr: "حالة التسجيل", options: [
        { value: "interest", labelAr: "سجّل اهتمامك (لا موعد بعد)" }, { value: "open", labelAr: "التسجيل مفتوح" }, { value: "closed", labelAr: "التسجيل مغلق" },
      ] },
      { kind: "text", key: "registrationUrl", labelAr: "رابط التسجيل" },
      { kind: "checkbox", key: "isExternalEvent", labelAr: "فعالية خارجية" },
      { kind: "text", key: "organizerName", labelAr: "الجهة المنظمة" },
      { kind: "text", key: "organizerUrl", labelAr: "رابط الجهة المنظمة" },
    ],
  },
};

export function emptyDetails(type: ContentType): Record<string, any> {
  const d: Record<string, any> = {};
  for (const f of TYPE_CONFIG[type].detailFields) {
    if (f.kind === "links" || f.kind === "tags") d[f.key] = [];
    else if (f.kind === "checkbox") d[f.key] = false;
    else if (f.kind === "html" || (f.kind === "text" && f.bilingual)) { d[`${f.key}Ar`] = ""; d[`${f.key}En`] = ""; }
    else if (f.kind !== "select" && f.kind !== "datetime") d[f.key] = "";
  }
  if (type === "event") Object.assign(d, { mode: "in_person", registration: "interest" });
  return d;
}
