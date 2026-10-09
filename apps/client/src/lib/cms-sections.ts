import type { ContentType } from "./cms-types";
import { EVENT_KINDS } from "./cms-labels";

export type SectionKey = "observatory" | "articles" | "studies" | "publications" | "news-events";
export interface SectionTab {
  value: string;
  labelAr: string;
  labelEn: string;
  types: ContentType[];
  kind?: string;
  books?: boolean;
  defaultWhen?: "upcoming" | "past";
  subKinds?: Record<string, { ar: string; en: string }>;
}
export interface SectionConfig {
  key: SectionKey;
  path: string;
  types: ContentType[];
  titleAr: string; titleEn: string;
  introAr: string; introEn: string;
  tabs?: SectionTab[];
  filters: ("area" | "region" | "when")[];
}

// Prototype's `publications()` header blurb (files/source/app.full.js) — shared verbatim across articles/studies/publications.
const KNOWLEDGE_INTRO_AR = "إنتاج دار نظم في الكتب والمقالات والدراسات والأبحاث العلمية والدوريات والمرصد.";
const KNOWLEDGE_INTRO_EN = "DarNozom outputs in books, articles, studies, research papers, periodicals and the Observatory.";

export const SECTIONS: Record<SectionKey, SectionConfig> = {
  observatory: {
    key: "observatory", path: "/observatory", types: ["observatory"],
    titleAr: "مرصد دار نظم للشأن العام", titleEn: "DarNozom Public Affairs Observatory",
    introAr: "نتابع المستجدات والإنتاج الفكري والبحثي في مجالات دار نظم، ونقدّم رصدًا منظمًا يساعد على فهم القضايا وتحديد ما يستحق القراءة والتحليل والمتابعة.",
    introEn: "We follow developments and new intellectual and research output in DarNozom's fields, offering structured monitoring that helps understand issues and identify what deserves reading, analysis and follow-up.",
    tabs: [
      { value: "all", labelAr: "الكل", labelEn: "All", types: ["observatory"] },
      { value: "daily_brief", labelAr: "الموجز اليومي", labelEn: "Daily Brief", types: ["observatory"], kind: "daily_brief" },
      { value: "weekly_review", labelAr: "المراجعة الأسبوعية", labelEn: "Weekly Review", types: ["observatory"], kind: "weekly_review" },
      { value: "research_output", labelAr: "الإنتاج الفكري والبحثي", labelEn: "Research Output", types: ["observatory"], kind: "research_output" },
      { value: "follow_up_file", labelAr: "ملفات المتابعة", labelEn: "Follow-up Files", types: ["observatory"], kind: "follow_up_file" },
    ],
    filters: ["area", "region"],
  },
  articles: {
    key: "articles", path: "/articles", types: ["article"],
    titleAr: "مقالات", titleEn: "Articles",
    introAr: KNOWLEDGE_INTRO_AR, introEn: KNOWLEDGE_INTRO_EN,
    filters: ["area"],
  },
  studies: {
    key: "studies", path: "/studies", types: ["study"],
    titleAr: "دراسات", titleEn: "Studies",
    introAr: KNOWLEDGE_INTRO_AR, introEn: KNOWLEDGE_INTRO_EN,
    filters: ["area"],
  },
  publications: {
    key: "publications", path: "/publications", types: ["publication"],
    titleAr: "إصدارات دار نظم", titleEn: "DarNozom Publications",
    introAr: KNOWLEDGE_INTRO_AR, introEn: KNOWLEDGE_INTRO_EN,
    tabs: [
      { value: "all", labelAr: "الكل", labelEn: "All", types: ["publication"] },
      { value: "books", labelAr: "كتب", labelEn: "Books", types: ["publication"], books: true },
      { value: "report", labelAr: "تقارير", labelEn: "Reports", types: ["publication"], kind: "report" },
      { value: "periodical", labelAr: "دوريات", labelEn: "Periodicals", types: ["publication"], kind: "periodical" },
      { value: "research", labelAr: "أبحاث علمية", labelEn: "Research Papers", types: ["publication"], kind: "research" },
    ],
    filters: ["area"],
  },
  "news-events": {
    key: "news-events", path: "/news-events", types: ["news", "event"],
    titleAr: "أخبار وفعاليات دار نظم", titleEn: "DarNozom News and Events",
    introAr: "تابع أخبار المؤسسة وأنشطتها العلمية والمهنية، واطّلع على فرص المشاركة في التدريب وورش العمل والندوات والمؤتمرات والمعارض.",
    introEn: "Follow DarNozom's news and scholarly and professional activities, and discover opportunities to join training, workshops, seminars, conferences and exhibitions.",
    tabs: [
      { value: "news", labelAr: "الأخبار", labelEn: "News", types: ["news"] },
      { value: "events", labelAr: "الفعاليات", labelEn: "Events", types: ["event"], defaultWhen: "upcoming", subKinds: EVENT_KINDS },
    ],
    filters: ["when"],
  },
};
