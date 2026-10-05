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
    titleAr: "المقالات", titleEn: "Articles",
    introAr: "أفكار وتحليلات معمقة في قضايا السياسات والمؤسسات.", introEn: "In-depth ideas and analysis on policy and institutional issues.",
    filters: ["area"],
  },
  studies: {
    key: "studies", path: "/studies", types: ["study"],
    titleAr: "الدراسات", titleEn: "Studies",
    introAr: "دراسات متخصصة تسهم في فهم الواقع واستشراف المستقبل.", introEn: "Specialised studies that help understand the present and anticipate the future.",
    filters: ["area"],
  },
  publications: {
    key: "publications", path: "/publications", types: ["publication"],
    titleAr: "المكتبة والإصدارات", titleEn: "Library and Publications",
    introAr: "كتب وتقارير ودوريات وأبحاث في السياسات والإدارة والحوكمة.", introEn: "Books, reports, periodicals and research on policy, administration and governance.",
    tabs: [
      { value: "all", labelAr: "الكل", labelEn: "All", types: ["publication"] },
      { value: "books", labelAr: "كتب", labelEn: "Books", types: ["publication"], books: true },
      { value: "report", labelAr: "تقارير", labelEn: "Reports", types: ["publication"], kind: "report" },
      { value: "periodical", labelAr: "دوريات", labelEn: "Periodicals", types: ["publication"], kind: "periodical" },
      { value: "research", labelAr: "أبحاث علمية", labelEn: "Research", types: ["publication"], kind: "research" },
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
