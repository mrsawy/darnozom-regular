import type { BilingualText } from "./site-content";

export type ProgramId = "islamic" | "management" | "digital";

export interface DiplomaItem {
  id: string;
  program: ProgramId;
  name: BilingualText;
  bullets: BilingualText[];
  tags: string[];
  duration: BilingualText;
  certification?: BilingualText;
  programHref: string;
}

export const DIPLOMAS: DiplomaItem[] = [
  // ───────────────── Islamic Systems (5) ─────────────────
  {
    id: "islamic-governance-compliance",
    program: "islamic",
    name: { ar: "دبلوم الحوكمة والامتثال الشرعي", en: "Diploma in Islamic Governance & Compliance" },
    bullets: [
      { ar: "نظام الحوكمة الشرعية للشركات والمؤسسات", en: "Sharia Governance System for companies & institutions" },
      { ar: "نظام الامتثال الشرعي للشركات والمؤسسات", en: "Sharia Compliance System for companies & institutions" },
      { ar: "أُطُر المساءلة والمسؤولية المؤسسية", en: "Accountability & institutional responsibility frameworks" },
      { ar: "آليات التدقيق والمراجعة الشرعية", en: "Sharia audit & review mechanisms" },
    ],
    tags: ["governance", "compliance"],
    duration: { ar: "٦ أشهر", en: "6 months" },
    programHref: "/academy/islamic-systems",
  },
  {
    id: "islamic-finance-systems",
    program: "islamic",
    name: { ar: "دبلوم نظم التمويل الإسلامي", en: "Diploma in Islamic Finance Systems" },
    bullets: [
      { ar: "نظام التمويل الإسلامي (شركاء · مستثمرين · بنوك) مع الضوابط الشرعية", en: "Islamic Finance System (partners · investors · banks) with Sharia controls" },
      { ar: "الصيرفة الإسلامية والأنظمة الخالية من الربا", en: "Islamic banking & riba-free systems" },
      { ar: "نظام التأمين التكافلي", en: "Takaful (Cooperative Insurance) System" },
      { ar: "نظام البورصة والاستثمارات الإسلامية", en: "Islamic Stock Market & Investments System" },
      { ar: "هياكل الاستثمار والحوكمة المالية", en: "Investment structures & financial governance" },
    ],
    tags: ["finance"],
    duration: { ar: "٦ أشهر", en: "6 months" },
    programHref: "/academy/islamic-systems",
  },
  {
    id: "islamic-contracts-legal",
    program: "islamic",
    name: { ar: "دبلوم العقود والنظم القانونية الإسلامية", en: "Diploma in Islamic Contracts & Legal Systems" },
    bullets: [
      { ar: "نظام إنشاء العقود الإسلامية (مرابحة · مضاربة · مشاركة · استصناع · تطوير)", en: "Islamic Contracts Creation System (Murabaha · Mudaraba · Musharaka · Istisna · Development)" },
      { ar: "تصميم العقود وأُطُر الإثبات الشرعي", en: "Contract design & legal validation frameworks" },
      { ar: "أُطُر الملكية والتصرّفات الشرعية", en: "Ownership frameworks & legitimate dispositions" },
      { ar: "التحكيم الشرعي في النزاعات المالية", en: "Sharia Arbitration in Financial Disputes" },
    ],
    tags: ["legal"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/islamic-systems",
  },
  {
    id: "islamic-corporate-systems",
    program: "islamic",
    name: { ar: "دبلوم النظم الشركاتية الإسلامية", en: "Diploma in Islamic Corporate Systems" },
    bullets: [
      { ar: "الشراكات وهياكل الملكية المؤسسية", en: "Partnerships & institutional ownership structures" },
      { ar: "نظام وإجراءات انضمام الشركاء وقواعد التحكم والتقييم", en: "Partner onboarding system, governance rules & valuation" },
      { ar: "آليات الانفصال (اختياري أو بسبب الوفاة) وصلاحيات الانتفاع بالاسم التجاري", en: "Separation mechanisms (voluntary / on death) & trade-name usage rights" },
      { ar: "التصفية: التقييم والأحكام الشرعية في مرحلة الانفصال", en: "Liquidation: valuation & Sharia rulings during separation" },
      { ar: "استمرارية المؤسسات وتوارث الحوكمة", en: "Institutional continuity & governance succession" },
    ],
    tags: ["governance", "legal"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/islamic-systems",
  },
  {
    id: "islamic-zakat-social-finance",
    program: "islamic",
    name: { ar: "دبلوم الزكاة والتمويل الاجتماعي", en: "Diploma in Zakat & Social Finance" },
    bullets: [
      { ar: "نظم الزكاة والاحتساب المؤسسي", en: "Zakat systems & institutional calculation" },
      { ar: "توزيع الثروة ومصارف الزكاة", en: "Wealth distribution & Zakat channels" },
      { ar: "تمويل الأثر الاجتماعي والوقف المعاصر", en: "Social impact finance & contemporary Waqf" },
    ],
    tags: ["finance"],
    duration: { ar: "٣ أشهر", en: "3 months" },
    programHref: "/academy/islamic-systems",
  },

  // ───────────────── Professional Management (8) ─────────────────
  {
    id: "mgmt-project-pmp",
    program: "management",
    name: { ar: "دبلوم إدارة المشاريع (مسار PMP)", en: "Diploma in Project Management (PMP Path)" },
    bullets: [
      { ar: "دورة حياة المشروع", en: "Project lifecycle" },
      { ar: "التخطيط والتنفيذ", en: "Planning & execution" },
      { ar: "إدارة المخاطر والجودة", en: "Risk & quality" },
      { ar: "المنهجيات الرشيقة (Agile)", en: "Agile methods" },
      { ar: "الإعداد لشهادة PMP", en: "PMP preparation" },
    ],
    tags: ["pm"],
    duration: { ar: "٦ أشهر", en: "6 months" },
    certification: { ar: "إعداد PMP", en: "PMP Prep" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-hr-shrm",
    program: "management",
    name: { ar: "دبلوم إدارة الموارد البشرية (SHRM / ACHRM)", en: "Diploma in HR Management (SHRM / ACHRM)" },
    bullets: [
      { ar: "الاستقطاب والتوظيف", en: "Recruitment" },
      { ar: "إدارة الأداء", en: "Performance management" },
      { ar: "التدريب والتطوير", en: "Training & development" },
      { ar: "أنظمة التعويضات والمزايا", en: "Compensation systems" },
      { ar: "الإعداد لشهادتي SHRM / ACHRM", en: "SHRM / ACHRM preparation" },
    ],
    tags: ["hr"],
    duration: { ar: "٦ أشهر", en: "6 months" },
    certification: { ar: "إعداد SHRM / ACHRM", en: "SHRM / ACHRM Prep" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-finance",
    program: "management",
    name: { ar: "دبلوم الإدارة المالية", en: "Diploma in Financial Management" },
    bullets: [
      { ar: "إعداد الموازنات", en: "Budgeting" },
      { ar: "ضبط التكاليف", en: "Cost control" },
      { ar: "التقارير المالية", en: "Financial reporting" },
      { ar: "المحاسبة الإدارية", en: "Managerial accounting" },
    ],
    tags: ["finance"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-marketing",
    program: "management",
    name: { ar: "دبلوم التسويق والنمو", en: "Diploma in Marketing & Growth" },
    bullets: [
      { ar: "استراتيجية التسويق", en: "Marketing strategy" },
      { ar: "بناء العلامة التجارية", en: "Branding" },
      { ar: "تقسيم العملاء", en: "Customer segmentation" },
      { ar: "نظم النمو", en: "Growth systems" },
    ],
    tags: ["marketing"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-sales",
    program: "management",
    name: { ar: "دبلوم المبيعات والإيرادات", en: "Diploma in Sales & Revenue" },
    bullets: [
      { ar: "نظم المبيعات", en: "Sales systems" },
      { ar: "إدارة علاقات العملاء (CRM)", en: "CRM" },
      { ar: "التفاوض", en: "Negotiation" },
      { ar: "تخطيط الإيرادات", en: "Revenue planning" },
    ],
    tags: ["marketing"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-operations",
    program: "management",
    name: { ar: "دبلوم إدارة العمليات", en: "Diploma in Operations Management" },
    bullets: [
      { ar: "تحسين العمليات", en: "Process optimization" },
      { ar: "سلاسل الإمداد", en: "Supply chain" },
      { ar: "نظم الجودة", en: "Quality systems" },
      { ar: "استراتيجية العمليات", en: "Operations strategy" },
    ],
    tags: ["operations"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-bi",
    program: "management",
    name: { ar: "دبلوم ذكاء الأعمال", en: "Diploma in Business Intelligence" },
    bullets: [
      { ar: "نظم مؤشرات الأداء", en: "KPI systems" },
      { ar: "لوحات المعلومات", en: "Dashboards" },
      { ar: "التقارير المعتمدة على البيانات", en: "Data reporting" },
      { ar: "أساسيات التحليل", en: "Analytics basics" },
    ],
    tags: ["data"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/professional-management",
  },
  {
    id: "mgmt-innovation",
    program: "management",
    name: { ar: "دبلوم الابتكار وإدارة المنتجات", en: "Diploma in Innovation & Product" },
    bullets: [
      { ar: "التفكير التصميمي", en: "Design thinking" },
      { ar: "دورة حياة المنتج", en: "Product lifecycle" },
      { ar: "تطوير المنتج الأولي (MVP)", en: "MVP development" },
      { ar: "نظم الابتكار", en: "Innovation systems" },
    ],
    tags: ["innovation"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/professional-management",
  },

  // ───────────────── Digital Transformation (6) ─────────────────
  {
    id: "digital-transformation-mgmt",
    program: "digital",
    name: { ar: "دبلوم إدارة التحول الرقمي", en: "Diploma in Digital Transformation Management" },
    bullets: [
      { ar: "الاستراتيجية الرقمية", en: "Digital strategy" },
      { ar: "أُطُر التحول المؤسسي", en: "Transformation frameworks" },
      { ar: "إدارة التغيير", en: "Change management" },
      { ar: "نضج التحول الرقمي", en: "Digital maturity" },
    ],
    tags: ["transformation"],
    duration: { ar: "٦ أشهر", en: "6 months" },
    programHref: "/academy/digital-transformation",
  },
  {
    id: "digital-ai-business",
    program: "digital",
    name: { ar: "دبلوم الذكاء الاصطناعي للأعمال", en: "Diploma in AI for Business" },
    bullets: [
      { ar: "أساسيات الذكاء الاصطناعي", en: "AI fundamentals" },
      { ar: "حالات استخدام الذكاء الاصطناعي في الأعمال", en: "Business AI use cases" },
      { ar: "نظم الأتمتة", en: "Automation systems" },
      { ar: "الذكاء الاصطناعي الأخلاقي", en: "Ethical AI" },
    ],
    tags: ["ai"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/digital-transformation",
  },
  {
    id: "digital-cybersecurity",
    program: "digital",
    name: { ar: "دبلوم الأمن السيبراني", en: "Diploma in Cybersecurity" },
    bullets: [
      { ar: "أساسيات الأمن السيبراني", en: "Cybersecurity fundamentals" },
      { ar: "إدارة المخاطر", en: "Risk management" },
      { ar: "حماية البيانات", en: "Data protection" },
      { ar: "نظم الأمن المؤسسي", en: "Security systems" },
    ],
    tags: ["security"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/digital-transformation",
  },
  {
    id: "digital-erp",
    program: "digital",
    name: { ar: "دبلوم نظم تخطيط الموارد المؤسسية ونظم الأعمال (ERP)", en: "Diploma in ERP & Business Systems" },
    bullets: [
      { ar: "نظم تخطيط الموارد المؤسسية (ERP)", en: "ERP systems" },
      { ar: "نظم إدارة علاقات العملاء (CRM)", en: "CRM systems" },
      { ar: "أتمتة سير العمل", en: "Workflow automation" },
      { ar: "تكامل الأنظمة", en: "System integration" },
    ],
    tags: ["systems"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/digital-transformation",
  },
  {
    id: "digital-bi-data",
    program: "digital",
    name: { ar: "دبلوم ذكاء الأعمال والبيانات", en: "Diploma in Business Intelligence & Data" },
    bullets: [
      { ar: "تحليل البيانات", en: "Data analytics" },
      { ar: "نظم مؤشرات الأداء", en: "KPI systems" },
      { ar: "لوحات المعلومات", en: "Dashboards" },
      { ar: "تفسير البيانات واتخاذ القرار", en: "Data interpretation" },
    ],
    tags: ["data"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/digital-transformation",
  },
  {
    id: "digital-marketing",
    program: "digital",
    name: { ar: "دبلوم التسويق الرقمي", en: "Diploma in Digital Marketing" },
    bullets: [
      { ar: "القنوات الرقمية", en: "Digital channels" },
      { ar: "رحلات العملاء", en: "Customer journeys" },
      { ar: "التسويق عبر إدارة علاقات العملاء (CRM)", en: "CRM marketing" },
      { ar: "نظم النمو الرقمي", en: "Growth systems" },
    ],
    tags: ["marketing"],
    duration: { ar: "٤ أشهر", en: "4 months" },
    programHref: "/academy/digital-transformation",
  },
];

export const PROGRAM_FILTERS: { id: ProgramId | "all"; label: BilingualText }[] = [
  { id: "all", label: { ar: "جميع البرامج", en: "All Programs" } },
  { id: "islamic", label: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" } },
  { id: "management", label: { ar: "الإدارة المهنية", en: "Professional Management" } },
  { id: "digital", label: { ar: "التحول الرقمي", en: "Digital Transformation" } },
];

export const TAG_FILTERS: { id: string; label: BilingualText }[] = [
  { id: "governance", label: { ar: "الحوكمة", en: "Governance" } },
  { id: "compliance", label: { ar: "الامتثال", en: "Compliance" } },
  { id: "finance", label: { ar: "المالية", en: "Finance" } },
  { id: "legal", label: { ar: "العقود والقانون", en: "Legal" } },
  { id: "hr", label: { ar: "الموارد البشرية", en: "HR" } },
  { id: "pm", label: { ar: "إدارة المشاريع", en: "Project Mgmt" } },
  { id: "marketing", label: { ar: "التسويق", en: "Marketing" } },
  { id: "operations", label: { ar: "العمليات", en: "Operations" } },
  { id: "data", label: { ar: "البيانات وذكاء الأعمال", en: "Data & BI" } },
  { id: "ai", label: { ar: "الذكاء الاصطناعي", en: "AI" } },
  { id: "security", label: { ar: "الأمن السيبراني", en: "Cybersecurity" } },
  { id: "systems", label: { ar: "نظم المؤسسات", en: "ERP & Systems" } },
  { id: "transformation", label: { ar: "التحول الرقمي", en: "Transformation" } },
  { id: "innovation", label: { ar: "الابتكار", en: "Innovation" } },
];

export const PROGRAM_META: Record<ProgramId, { label: BilingualText; accent: string }> = {
  islamic: { label: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" }, accent: "text-emerald-600" },
  management: { label: { ar: "الإدارة المهنية", en: "Professional Management" }, accent: "text-blue-600" },
  digital: { label: { ar: "التحول الرقمي", en: "Digital Transformation" }, accent: "text-violet-600" },
};
