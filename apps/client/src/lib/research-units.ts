export interface ResearchUnit {
  id: string;
  name: { ar: string; en: string };
  desc: { ar: string; en: string };
  topics: { ar: string; en: string }[];
}

export const RESEARCH_UNITS: ResearchUnit[] = [
  {
    id: "sharia",
    name: { ar: "السياسة الشرعية والفكر الإسلامي", en: "Sharia Governance and Islamic Thought" },
    desc: {
      ar: "أصول السياسة الشرعية ومفاهيمها وتطبيقاتها المعاصرة، والفكر السياسي والإداري الإسلامي والنظم والمؤسسات.",
      en: "The foundations, concepts and contemporary applications of Sharia governance, Islamic political and administrative thought, and systems and institutions.",
    },
    topics: [
      { ar: "المفاهيم والمنهج", en: "Concepts and methodology" },
      { ar: "الفكر السياسي والإداري", en: "Political and administrative thought" },
      { ar: "النظم الإسلامية", en: "Islamic systems" },
      { ar: "القضايا المعاصرة", en: "Contemporary issues" },
    ],
  },
  {
    id: "policy",
    name: { ar: "السياسات والإدارة العامة", en: "Public Policy & Public Administration" },
    desc: {
      ar: "تحليل المشكلات العامة وتصميم السياسات وتنفيذها وتقييمها، وتنظيم المؤسسات والخدمات العامة وإدارتها، وتحسين الأداء والقيمة العامة، بما يصل المعرفة والقرار بالممارسة المؤسسية.",
      en: "Analyse public problems and design, implement and evaluate policy; organize and manage public institutions and services; and improve performance and public value, connecting knowledge and decisions with institutional practice.",
    },
    topics: [
      { ar: "تحليل المشكلات وتصميم السياسات", en: "Problem analysis and policy design" },
      { ar: "تنفيذ السياسات وتقييمها", en: "Policy implementation and evaluation" },
      { ar: "إدارة المؤسسات والخدمات العامة", en: "Public institutions and service management" },
      { ar: "الإدارة المحلية والموارد والبرامج", en: "Local administration, resources and programmes" },
      { ar: "الأداء والإصلاح الإداري والقيمة العامة", en: "Performance, administrative reform and public value" },
    ],
  },
  {
    id: "leadership",
    name: { ar: "القيادة والإدارة والحوكمة", en: "Leadership, Management and Governance" },
    desc: {
      ar: "القيادة والاستراتيجية وبناء المؤسسات، ونظم الحوكمة والمساءلة وإدارة التغيير والعمليات والأداء.",
      en: "Leadership, strategy and institution building; governance and accountability; and change, operations and performance management.",
    },
    topics: [
      { ar: "القيادة والاستراتيجية", en: "Leadership and strategy" },
      { ar: "الحوكمة والمساءلة", en: "Governance and accountability" },
      { ar: "التغيير والتطوير", en: "Change and development" },
      { ar: "العمليات والأداء", en: "Operations and performance" },
    ],
  },
];
