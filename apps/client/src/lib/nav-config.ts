// Menu structure from design brief §3–4. Where the brief names a page that does
// not exist yet (round 1), the link points at the nearest existing page; change
// it here when the page ships.
import { DARNOZOM_PUBLISHER } from "./site-constants";

export type NavLink = { labelAr: string; labelEn: string; href: string };
export type NavColumn = {
  titleAr?: string;
  titleEn?: string;
  href?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  links: NavLink[];
};
export type NavEntry = { key: string; labelAr: string; labelEn: string; href: string; match: string[]; columns: NavColumn[] };

const DN_BOOKS = `/services/store/books?publisher=${encodeURIComponent(DARNOZOM_PUBLISHER)}`;
const l = (labelAr: string, labelEn: string, href: string): NavLink => ({ labelAr, labelEn, href });

export const MAIN_NAV: NavEntry[] = [
  {
    key: "about", labelAr: "عن دار نظم", labelEn: "About DarNozom", href: "/about",
    match: ["/about", "/careers", "/case-studies"],
    columns: [{ links: [
      l("من نحن", "Who we are", "/about"),
      l("رؤيتنا", "Our vision", "/about#vision"),
      l("رسالتنا", "Our mission", "/about#mission"),
      l("منهجنا", "Our approach", "/about#method"),
      l("قيمنا والهيكل", "Values and structure", "/about#values"),
    ] }],
  },
  {
    key: "services", labelAr: "خدماتنا", labelEn: "Services", href: "/services",
    match: ["/services", "/sectors", "/service-registration"],
    columns: [{ links: [
      l("البحوث والدراسات", "Research and Studies", "/services/research"),
      l("النشر والمعرفة", "Publishing and Knowledge", "/publications"),
      l("التدريب وبناء القدرات", "Training and Capacity Building", "/academy"),
      l("الاستشارات", "Consulting", "/services/consulting"),
      l("البرمجيات والتحول الرقمي", "Software and Digital Transformation", "/services/digital-transformation"),
    ] }],
  },
  {
    key: "knowledge", labelAr: "المعرفة والبحوث", labelEn: "Knowledge and Research", href: "/center",
    match: ["/center", "/unit", "/observatory", "/articles", "/studies"],
    columns: [
      {
        titleAr: "مركز البحوث والدراسات", titleEn: "Research and Studies Center", href: "/center",
        subtitleAr: "الوحدات البحثية", subtitleEn: "Research units",
        links: [
          l("السياسة الشرعية والفكر الإسلامي", "Sharia Policy and Islamic Thought", "/unit/sharia"),
          l("السياسات والإدارة العامة", "Public Policy and Public Administration", "/unit/policy"),
          l("القيادة والإدارة والحوكمة", "Leadership, Management and Governance", "/unit/leadership"),
        ],
      },
      {
        titleAr: "المعرفة والمشروعات", titleEn: "Knowledge and Projects", href: "/center",
        links: [
          l("المرصد", "Observatory", "/observatory"),
          l("المقالات", "Articles", "/articles"),
          l("الدراسات", "Studies", "/studies"),
          l("البحوث", "Research", "/publications?tab=research"),
          l("الدوريات", "Periodicals", "/publications?tab=periodical"),
          l("الكتب", "Books", DN_BOOKS),
        ],
      },
    ],
  },
  {
    key: "academy", labelAr: "الأكاديمية", labelEn: "Academy", href: "/academy",
    match: ["/academy"],
    columns: [{ links: [
      l("السياسة الشرعية والفكر الإسلامي", "Sharia Policy and Islamic Thought", "/track/sharia"),
      l("السياسات والإدارة العامة", "Public Policy and Public Administration", "/track/policy"),
      l("القيادة والإدارة والحوكمة", "Leadership, Management and Governance", "/track/leadership"),
      l("البرامج والدورات", "Programs and Courses", "/academy/courses"),
      l("تدريب المؤسسات", "Corporate Training", "/academy/for-organizations"),
    ] }],
  },
  {
    key: "library", labelAr: "المكتبة والإصدارات", labelEn: "Library and Publications", href: "/publications",
    match: ["/publications", "/services/store"],
    columns: [
      {
        titleAr: "المكتبة", titleEn: "Library", href: "/services/store/books",
        links: [l("جميع الكتب", "All books", "/services/store/books"), l("كتب دار نظم", "DarNozom books", DN_BOOKS)],
      },
      {
        titleAr: "إصدارات دار نظم", titleEn: "DarNozom Publications", href: "/publications",
        links: [
          l("كتب", "Books", DN_BOOKS),
          l("مقالات", "Articles", "/articles"),
          l("دراسات", "Studies", "/studies"),
          l("أبحاث علمية", "Scientific research", "/publications?tab=research"),
          l("دوريات", "Periodicals", "/publications?tab=periodical"),
          l("المرصد", "Observatory", "/observatory"),
        ],
      },
    ],
  },
  {
    key: "news", labelAr: "الأخبار والفعاليات", labelEn: "News and Events", href: "/news-events",
    match: ["/news-events"],
    columns: [{ links: [
      l("أخبار المؤسسة", "DarNozom news", "/news-events?tab=news"),
      l("تدريب", "Training", "/news-events?tab=events&kind=training"),
      l("ورش", "Workshops", "/news-events?tab=events&kind=workshop"),
      l("ندوات", "Seminars", "/news-events?tab=events&kind=seminar"),
      l("مؤتمرات", "Conferences", "/news-events?tab=events&kind=conference"),
      l("معارض", "Exhibitions", "/news-events?tab=events&kind=exhibition"),
    ] }],
  },
  {
    key: "contact", labelAr: "تواصل معنا", labelEn: "Contact Us", href: "/contact",
    match: ["/contact"],
    columns: [{ links: [
      l("طلب بحث", "Research request", "/service-registration"),
      l("استشارة", "Consulting request", "/service-registration"),
      l("تدريب", "Training request", "/service-registration"),
      l("حل رقمي", "Digital solution", "/service-registration"),
      l("تعاون", "Partnership", "/contact"),
      l("استفسار عام", "General enquiry", "/contact"),
    ] }],
  },
];

export function activeNavKey(path: string): string | null {
  let best: { key: string; len: number } | null = null;
  for (const entry of MAIN_NAV) {
    for (const m of entry.match) {
      if (path === m || path.startsWith(`${m}/`)) {
        if (!best || m.length > best.len) best = { key: entry.key, len: m.length };
      }
    }
  }
  return best?.key ?? null;
}
