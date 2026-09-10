import type { BilingualText } from "./site-content";
import type { ProgramId } from "./academy-diplomas";

export type CourseLevel = 1 | 2 | 3;

export interface CourseItem {
  id: string;
  program: ProgramId;
  level: CourseLevel;
  name: BilingualText;
  programHref: string;
}

export const COURSES: CourseItem[] = [
  // ───────────────── Islamic Systems · Level 1 ─────────────────
  { id: "isl-l1-leadership", program: "islamic", level: 1, name: { ar: "مبادئ القيادة الإسلامية", en: "Islamic Leadership Principles" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l1-maqasid", program: "islamic", level: 1, name: { ar: "مقاصد الشريعة في المؤسسات", en: "Maqasid Al-Shariah in Organizations" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l1-ethics", program: "islamic", level: 1, name: { ar: "الأخلاق والنزاهة في بيئات العمل", en: "Ethics & Integrity in Workplaces" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l1-finance-intro", program: "islamic", level: 1, name: { ar: "مدخل إلى التمويل الإسلامي", en: "Introduction to Islamic Finance" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l1-governance", program: "islamic", level: 1, name: { ar: "أساسيات الحوكمة", en: "Governance Fundamentals" }, programHref: "/academy/islamic-systems" },

  // ───────────────── Islamic Systems · Level 2 (Applied Sharia Management) ─────────────────
  { id: "isl-l2-applied-governance", program: "islamic", level: 2, name: { ar: "تطبيق الحوكمة الشرعية في المؤسسات", en: "Applied Sharia Governance" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l2-finance-mgr", program: "islamic", level: 2, name: { ar: "التمويل الإسلامي للمدراء", en: "Islamic Finance for Managers" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l2-contracts", program: "islamic", level: 2, name: { ar: "العقود الشرعية وتوثيق المعاملات", en: "Islamic Contracts & Documentation" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l2-zakat-waqf", program: "islamic", level: 2, name: { ar: "الزكاة والوقف المؤسسي", en: "Institutional Zakat & Waqf" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l2-audit-compliance", program: "islamic", level: 2, name: { ar: "التدقيق والامتثال الشرعي التطبيقي", en: "Applied Sharia Audit & Compliance" }, programHref: "/academy/islamic-systems" },

  // ───────────────── Islamic Systems · Level 3 ─────────────────
  { id: "isl-l3-exec-gov", program: "islamic", level: 3, name: { ar: "الحوكمة الشرعية التنفيذية", en: "Islamic Executive Governance" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l3-strategic", program: "islamic", level: 3, name: { ar: "القيادة الشرعية الاستراتيجية", en: "Strategic Shariah Leadership" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l3-ethics-systems", program: "islamic", level: 3, name: { ar: "نظم الأخلاق المؤسسية", en: "Institutional Ethics Systems" }, programHref: "/academy/islamic-systems" },
  { id: "isl-l3-maqasid-strategy", program: "islamic", level: 3, name: { ar: "الاستراتيجية المبنية على المقاصد", en: "Maqasid-Driven Strategy" }, programHref: "/academy/islamic-systems" },

  // ───────────────── Professional Management · Level 1 ─────────────────
  { id: "mgmt-l1-self", program: "management", level: 1, name: { ar: "قيادة الذات والإنتاجية الشخصية", en: "Self-Leadership & Productivity" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l1-comm", program: "management", level: 1, name: { ar: "مهارات التواصل المهني", en: "Communication Skills" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l1-business", program: "management", level: 1, name: { ar: "أساسيات الأعمال", en: "Business Fundamentals" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l1-org", program: "management", level: 1, name: { ar: "الوعي المؤسسي", en: "Organizational Awareness" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l1-literacy", program: "management", level: 1, name: { ar: "ثقافة الأعمال (المالية ومؤشرات الأداء)", en: "Business Literacy (Finance & KPIs)" }, programHref: "/academy/professional-management" },

  // ───────────────── Professional Management · Level 2 (Functional Management) ─────────────────
  { id: "mgmt-l2-projects", program: "management", level: 2, name: { ar: "إدارة المشاريع التطبيقية (مسار PMP)", en: "Applied Project Management (PMP Path)" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l2-hr", program: "management", level: 2, name: { ar: "إدارة الموارد البشرية", en: "Human Resources Management" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l2-finance", program: "management", level: 2, name: { ar: "الإدارة المالية للمدراء", en: "Financial Management for Managers" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l2-marketing-sales", program: "management", level: 2, name: { ar: "التسويق والمبيعات", en: "Marketing & Sales Management" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l2-bi-operations", program: "management", level: 2, name: { ar: "ذكاء الأعمال وإدارة العمليات", en: "Business Intelligence & Operations" }, programHref: "/academy/professional-management" },

  // ───────────────── Professional Management · Level 3 ─────────────────
  { id: "mgmt-l3-exec", program: "management", level: 3, name: { ar: "القيادة التنفيذية", en: "Executive Leadership" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l3-strategy", program: "management", level: 3, name: { ar: "الاستراتيجية المؤسسية", en: "Corporate Strategy" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l3-design", program: "management", level: 3, name: { ar: "التصميم المؤسسي", en: "Organizational Design" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l3-fin-decisions", program: "management", level: 3, name: { ar: "اتخاذ القرارات المالية", en: "Financial Decision-Making" }, programHref: "/academy/professional-management" },
  { id: "mgmt-l3-gov-risk", program: "management", level: 3, name: { ar: "الحوكمة وإدارة المخاطر", en: "Governance & Risk" }, programHref: "/academy/professional-management" },

  // ───────────────── Digital Transformation · Level 1 ─────────────────
  { id: "dig-l1-literacy", program: "digital", level: 1, name: { ar: "الثقافة الرقمية", en: "Digital Literacy" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l1-tools", program: "digital", level: 1, name: { ar: "أدوات بيئة العمل الحديثة", en: "Workplace Tools" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l1-ai-intro", program: "digital", level: 1, name: { ar: "مدخل إلى الذكاء الاصطناعي", en: "Introduction to AI" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l1-data", program: "digital", level: 1, name: { ar: "الوعي بالبيانات", en: "Data Awareness" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l1-cyber", program: "digital", level: 1, name: { ar: "أساسيات الأمن السيبراني", en: "Cybersecurity Basics" }, programHref: "/academy/digital-transformation" },

  // ───────────────── Digital Transformation · Level 2 (Applied Digital) ─────────────────
  { id: "dig-l2-ai-business", program: "digital", level: 2, name: { ar: "تطبيق الذكاء الاصطناعي في الأعمال", en: "Applied AI in Business" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l2-automation", program: "digital", level: 2, name: { ar: "أتمتة العمليات وسير الأعمال", en: "Process & Workflow Automation" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l2-data-analytics", program: "digital", level: 2, name: { ar: "تحليل البيانات للمدراء", en: "Data Analytics for Managers" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l2-platforms", program: "digital", level: 2, name: { ar: "إدارة المنصات الرقمية ونظم ERP", en: "Digital Platforms & ERP Management" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l2-cybersec", program: "digital", level: 2, name: { ar: "الأمن السيبراني المؤسسي", en: "Enterprise Cybersecurity" }, programHref: "/academy/digital-transformation" },

  // ───────────────── Digital Transformation · Level 3 ─────────────────
  { id: "dig-l3-leadership", program: "digital", level: 3, name: { ar: "قيادة التحول الرقمي", en: "Digital Transformation Leadership" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l3-ai-strategy", program: "digital", level: 3, name: { ar: "استراتيجية الذكاء الاصطناعي", en: "AI Strategy" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l3-data-gov", program: "digital", level: 3, name: { ar: "حوكمة البيانات", en: "Data Governance" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l3-arch", program: "digital", level: 3, name: { ar: "هندسة نظم المؤسسات", en: "Enterprise Systems Architecture" }, programHref: "/academy/digital-transformation" },
  { id: "dig-l3-culture", program: "digital", level: 3, name: { ar: "تحويل الثقافة الرقمية", en: "Digital Culture Transformation" }, programHref: "/academy/digital-transformation" },
];

export const COURSE_PROGRAM_FILTERS: { id: ProgramId | "all"; label: BilingualText }[] = [
  { id: "all", label: { ar: "كل البرامج", en: "All programs" } },
  { id: "islamic", label: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" } },
  { id: "management", label: { ar: "الإدارة المهنية", en: "Professional Management" } },
  { id: "digital", label: { ar: "التحول الرقمي", en: "Digital Transformation" } },
];

export const COURSE_LEVEL_FILTERS: { id: CourseLevel | "all"; label: BilingualText }[] = [
  { id: "all", label: { ar: "كل المستويات", en: "All levels" } },
  { id: 1, label: { ar: "المستوى الأول — التأسيس", en: "Level 1 — Foundation" } },
  { id: 2, label: { ar: "المستوى الثاني — الإدارة", en: "Level 2 — Management" } },
  { id: 3, label: { ar: "المستوى الثالث — التنفيذي", en: "Level 3 — Executive" } },
];
