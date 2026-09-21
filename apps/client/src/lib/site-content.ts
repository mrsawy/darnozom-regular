export interface BilingualText {
  ar: string;
  en: string;
}

export interface ServiceItem {
  title: BilingualText;
  subtitle: string;
  slug: string;
  desc: BilingualText;
  items: BilingualText[];
  featured: boolean;
}

export interface EventItem {
  id: number;
  title: BilingualText;
  date: BilingualText;
  time: BilingualText;
  location: BilingualText;
  category: BilingualText;
  desc: BilingualText;
  status: "upcoming" | "past";
}

export interface ProgramItem {
  id: string;
  title: BilingualText;
  subtitle: BilingualText;
  courses: BilingualText[];
  desc: BilingualText;
  href: string;
  tagline?: BilingualText;
  flagship?: boolean;
}

export const SERVICES: ServiceItem[] = [
  {
    title: { ar: "الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance" },
    subtitle: "Sharia Systems",
    slug: "islamic-systems",
    featured: true,
    desc: {
      ar: "منظومة شرعية متكاملة تربط الحوكمة والتمويل والثقافة بأداء مؤسسي قابل للتدقيق.",
      en: "An integrated Sharia system linking governance, finance, and culture to auditable institutional performance.",
    },
    items: [
      { ar: "الحوكمة الشرعية والامتثال", en: "Sharia Governance & Compliance" },
      { ar: "التمويل والاستثمار الإسلامي", en: "Islamic Finance & Investments" },
      { ar: "دورة الحياة المؤسسية والتحكيم", en: "Corporate Lifecycle & Arbitration" },
      { ar: "المقصد والثقافة والمسؤولية الاجتماعية", en: "Purpose, Culture & Social Responsibility" },
    ],
  },
  {
    title: { ar: "الإدارة", en: "Management" },
    subtitle: "Management",
    slug: "management-systems",
    featured: false,
    desc: {
      ar: "نبني مؤسسات عالية الأداء بمواءمة الاستراتيجية والعمليات والأنظمة ورأس المال البشري — لتحويل الطموح إلى أداء قابل للقياس والاستدامة.",
      en: "We build high-performance organizations by aligning strategy, operations, systems, and people — turning ambition into measurable, sustainable performance.",
    },
    items: [
      { ar: "الاستراتيجية والنمو", en: "Strategy & Growth" },
      { ar: "الإدارة والعمليات", en: "Management & Operations" },
      { ar: "الأنظمة والتقنية", en: "Systems & Technology" },
      { ar: "رأس المال البشري", en: "People & Leadership" },
    ],
  },
  {
    title: { ar: "التحول الرقمي", en: "Digital Transformation" },
    subtitle: "Digital Transformation",
    slug: "digital-transformation",
    featured: false,
    desc: {
      ar: "نحوّل المؤسسات إلى منظومات رقمية متكاملة تربط الاستراتيجية بالأنظمة والبيانات بالقرار.",
      en: "We turn organizations into integrated digital ecosystems linking strategy to systems and data to decisions.",
    },
    items: [
      { ar: "الاستراتيجية وخارطة الطريق", en: "Strategy & Roadmap" },
      { ar: "المنصات وتخطيط موارد المؤسسة", en: "Platforms & ERP" },
      { ar: "البيانات والتحليلات والذكاء الاصطناعي", en: "Data, Analytics & AI" },
      { ar: "الأمن السيبراني وحوكمة التقنية", en: "Cybersecurity & Tech Governance" },
    ],
  },
  {
    title: { ar: "الاستشارات المتكاملة", en: "Integrated Consulting" },
    subtitle: "Integrated Consulting",
    slug: "consulting",
    featured: false,
    desc: {
      ar: "شريك استشاري واحد يدمج الشرعي والإداري والرقمي في قرار واحد — من التشخيص إلى الأثر.",
      en: "One advisory partner uniting Sharia, management, and digital into a single decision — from diagnosis to impact.",
    },
    items: [
      { ar: "ممارسة الحوكمة الشرعية", en: "Sharia Governance Practice" },
      { ar: "ممارسة الإدارة والعمليات", en: "Management & Operations Practice" },
      { ar: "تطوير الأداء والاستراتيجية", en: "Performance & Strategy Practice" },
      { ar: "التحول المؤسسي", en: "Institutional Transformation" },
    ],
  },
  {
    title: { ar: "أكاديمية دار نظم", en: "DarNozom Academy" },
    subtitle: "Darnozom Academy",
    slug: "academy",
    featured: false,
    desc: {
      ar: "مسارات تأهيل تجمع الأصالة الشرعية بالاحتراف الإداري لإعداد قيادات المستقبل.",
      en: "Learning tracks combining Sharia authenticity with management professionalism to shape future leaders.",
    },
    items: [
      { ar: "مسار النظم الإسلامية", en: "Islamic Systems Track" },
      { ar: "مسار الإدارة المهنية", en: "Professional Management Track" },
      { ar: "المسارات القطاعية المتخصصة", en: "Specialized Sector Tracks" },
      { ar: "التدريب المؤسسي المصمَّم", en: "Custom In-House Training" },
    ],
  },
  {
    title: { ar: "البحث والتأليف", en: "Research & Authoring" },
    subtitle: "Research & Authoring",
    slug: "research",
    featured: false,
    desc: {
      ar: "إنتاج علمي رصين يربط الأصول الشرعية بالممارسات الإدارية المعاصرة لصناعة المرجعية.",
      en: "Rigorous scholarship that bridges Sharia foundations with modern management practice to shape the reference.",
    },
    items: [
      { ar: "الأبحاث العلمية المتخصصة", en: "Specialized Research" },
      { ar: "التأليف العلمي", en: "Scholarly Authoring" },
      { ar: "المقالات وأوراق السياسات", en: "Articles & Policy Papers" },
      { ar: "المجلة والمنصة العلمية", en: "Journal & Scholarly Platform" },
    ],
  },
  {
    title: { ar: "الترجمة والنشر", en: "Translation & Publishing" },
    subtitle: "Translation & Publishing",
    slug: "publishing",
    featured: false,
    desc: {
      ar: "ننقل أفضل المعرفة العالمية إلى العربية بأمانة علمية وتوطين سياقي ونشر احترافي.",
      en: "We bring the best global knowledge into Arabic with scholarly fidelity, contextual localization, and professional publishing.",
    },
    items: [
      { ar: "انتقاء المراجع", en: "Reference Selection" },
      { ar: "الترجمة الأمينة", en: "Faithful Translation" },
      { ar: "التوطين السياقي", en: "Contextual Localization" },
      { ar: "النشر والطباعة والتوزيع", en: "Publishing, Printing & Distribution" },
    ],
  },
  {
    title: { ar: "متجر الكتب", en: "Book Store" },
    subtitle: "Book Store",
    slug: "store",
    featured: false,
    desc: {
      ar: "مكتبة عمل من الأدوات والنماذج والكتب الجاهزة ترفع جودة القرار في كل مستوى.",
      en: "An operating library of ready tools, templates, and books that lift decision quality at every level.",
    },
    items: [
      { ar: "الأدلة والكتيّبات الإدارية", en: "Guides & Management Handbooks" },
      { ar: "النماذج والقوالب الجاهزة", en: "Ready Templates" },
      { ar: "أدوات التشخيص والتقييم", en: "Diagnostic & Assessment Tools" },
      { ar: "المحتوى التدريبي الرقمي والكتب", en: "Digital Training Content & Books" },
    ],
  },
];

export const EVENTS: EventItem[] = [];

export const PROGRAMS: ProgramItem[] = [
  {
    id: "islamic",
    title: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" },
    subtitle: { ar: "مسار أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems Track" },
    href: "/academy/islamic-systems",
    tagline: {
      ar: "حوكمة شرعية وامتثال وتمويل إسلامي",
      en: "Sharia governance, compliance & Islamic finance",
    },
    courses: [
      { ar: "أصول النظم الإسلامية وفقه المؤسسات", en: "Foundations of Islamic Systems & Institutional Fiqh" },
      { ar: "الحوكمة الشرعية والرقابة المؤسسية", en: "Sharia Governance & Institutional Oversight" },
      { ar: "التمويل الإسلامي وأدواته", en: "Islamic Finance & Its Instruments" },
      { ar: "الامتثال والتدقيق الشرعي", en: "Sharia Compliance & Audit" },
      { ar: "القيادة الشرعية الاستراتيجية", en: "Strategic Sharia Leadership" },
    ],
    desc: {
      ar: "برامج متخصصة لفهم النظم الإسلامية وتطبيقها في بيئات العمل المؤسسية الحديثة، مع التركيز على الحوكمة والتمويل والامتثال الشرعي.",
      en: "Specialized programs for understanding and applying Islamic systems in modern institutional work environments, focusing on governance, finance, and Sharia compliance.",
    },
  },
  {
    id: "management",
    title: { ar: "الإدارة المهنية", en: "Professional Management" },
    subtitle: { ar: "تطوير القيادة والإدارة", en: "Leadership & Management Development" },
    href: "/academy/professional-management",
    tagline: {
      ar: "تأسيس · إدارة · قيادة تنفيذية",
      en: "Foundation · Management · Executive",
    },
    courses: [
      { ar: "المستوى الأول — التأسيس", en: "Level 1 — Foundation" },
      { ar: "المستوى الثاني — الإدارة", en: "Level 2 — Management" },
      { ar: "المستوى الثالث — القيادة التنفيذية", en: "Level 3 — Executive" },
      { ar: "قطاعات: الشركات · المنظمات غير الربحية · القطاع الحكومي", en: "Domains: Corporate · NGO · Government" },
    ],
    desc: {
      ar: "نظام تعليمي متدرج يطوّر المهنيين والمديرين والقيادات التنفيذية في القيادة والإدارة والفكر المؤسسي عبر القطاعات الثلاثة.",
      en: "A structured learning system that develops professionals, managers, and executive leaders in leadership, management, and organizational thinking across all three sectors.",
    },
  },
  {
    id: "digital",
    title: { ar: "التحول الرقمي", en: "Digital Transformation" },
    subtitle: { ar: "مسار التحول الرقمي", en: "Digital Transformation Track" },
    href: "/academy/digital-transformation",
    tagline: {
      ar: "ثقافة رقمية · أتمتة · قيادة تحول",
      en: "Digital fluency · Automation · Transformation leadership",
    },
    courses: [
      { ar: "الثقافة الرقمية وأساسيات البيانات", en: "Digital Literacy & Data Fundamentals" },
      { ar: "أتمتة العمليات وتكامل الأنظمة", en: "Process Automation & Systems Integration" },
      { ar: "اتخاذ القرار المبني على البيانات", en: "Data-Driven Decision Making" },
      { ar: "الذكاء الاصطناعي في الأعمال", en: "AI in Business" },
      { ar: "قيادة التحول الرقمي المؤسسي", en: "Leading Institutional Digital Transformation" },
    ],
    desc: {
      ar: "مسار يبني الكفاءات الرقمية للمؤسسات: من الثقافة الرقمية وأتمتة العمليات إلى قيادة التحول الرقمي الشامل والذكاء الاصطناعي في الأعمال.",
      en: "A track that builds institutional digital capability — from digital fluency and process automation to leading enterprise-wide transformation and AI in business.",
    },
  },
  {
    id: "diploma",
    title: { ar: "دبلوم القيادة المتكاملة", en: "Integrated Leadership Diploma" },
    subtitle: { ar: "الدبلوم الرائد", en: "Flagship Diploma" },
    href: "/academy/integrated-diploma",
    flagship: true,
    tagline: {
      ar: "البرنامج الرائد — قيمة · إدارة · تحول رقمي",
      en: "Flagship — Values · Management · Digital Transformation",
    },
    courses: [
      { ar: "أنظمة الحوكمة والامتثال الشرعي — البُعد القيمي والمرجعي", en: "Shariah Governance & Compliance Systems — values & reference" },
      { ar: "الإدارة المهنية — البُعد التشغيلي والقيادي", en: "Professional Management — operational & leadership" },
      { ar: "التحول الرقمي — البُعد التقني والمستقبلي", en: "Digital Transformation — technical & future" },
      { ar: "التكامل التنفيذي (الكابستون)", en: "Executive Integration (Capstone)" },
    ],
    desc: {
      ar: "البرنامج الرائد للأكاديمية: دبلوم تنفيذي يدمج أنظمة الحوكمة والامتثال الشرعي والإدارة المهنية والتحول الرقمي في تجربة قيادية متكاملة، تختتم بمشروع تكامل تنفيذي.",
      en: "The Academy's flagship: an executive diploma integrating Shariah Governance & Compliance Systems, Professional Management, and Digital Transformation into one leadership journey, capped by an executive integration capstone.",
    },
  },
];
