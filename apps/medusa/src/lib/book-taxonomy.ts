// Initial scientific classification. Seeded once by
// src/scripts/seed-book-catalog.ts; after that staff own it in Medusa Admin →
// Products → Categories (rename / add / remove). The seed never renames or
// deletes a category that already exists, so staff edits survive re-runs.
export type TaxonomyNode = { handle: string; name: string; name_ar: string };
export type TaxonomySection = TaxonomyNode & { children: TaxonomyNode[] };

export const BOOK_TAXONOMY: TaxonomySection[] = [
  {
    handle: "islamic-law-thought",
    name: "Shariah Governance and Islamic Thought",
    name_ar: "السياسة الشرعية والفكر الإسلامي",
    children: [
      { handle: "usul-fiqh-siyasa", name: "Principles of Shariah Governance Jurisprudence", name_ar: "أصول فقه السياسة الشرعية" },
      { handle: "ijtihad-fatwa-siyasa", name: "Ijtihad and Fatwa in Shariah Governance", name_ar: "الاجتهاد والفتوى في السياسة الشرعية" },
      { handle: "fiqh-siyasa-shariyya", name: "Jurisprudence of Shariah Governance", name_ar: "فقه السياسة الشرعية" },
      { handle: "maqasid", name: "Objectives of Shariah", name_ar: "مقاصد الشريعة" },
      { handle: "contemporary-islamic-thought", name: "Contemporary Islamic Thought", name_ar: "الفكر الإسلامي المعاصر" },
    ],
  },
  {
    handle: "islamic-systems",
    name: "Islamic Systems",
    name_ar: "النظم الإسلامية",
    children: [
      { handle: "islamic-political-system", name: "Political System", name_ar: "النظام السياسي" },
      { handle: "islamic-administrative-system", name: "Administrative System", name_ar: "النظام الإداري" },
      { handle: "islamic-financial-system", name: "Financial System", name_ar: "النظام المالي" },
      { handle: "islamic-economic-system", name: "Economic System", name_ar: "النظام الاقتصادي" },
      { handle: "islamic-judicial-system", name: "Judicial System", name_ar: "النظام القضائي" },
      { handle: "islamic-penal-system", name: "Penal System", name_ar: "النظام الجنائي" },
      { handle: "international-relations", name: "International Relations", name_ar: "العلاقات الدولية" },
    ],
  },
  {
    handle: "public-policies",
    name: "Public Policies",
    name_ar: "السياسات العامة",
    children: [
      { handle: "policy-analysis", name: "Policy Analysis", name_ar: "تحليل السياسات" },
      { handle: "social-policy", name: "Social Policy", name_ar: "السياسات الاجتماعية" },
      { handle: "economic-development-policy", name: "Economic and Development Policy", name_ar: "السياسات الاقتصادية والتنموية" },
      { handle: "education-policy", name: "Education Policy", name_ar: "السياسات التعليمية" },
      { handle: "governance", name: "Governance", name_ar: "الحوكمة" },
    ],
  },
  {
    handle: "public-administration",
    name: "Public Administration",
    name_ar: "الإدارة العامة",
    children: [
      { handle: "government-administration", name: "Government Administration", name_ar: "الإدارة الحكومية" },
      { handle: "digital-transformation", name: "Digital Transformation", name_ar: "التحول الرقمي" },
      { handle: "administrative-reform", name: "Administrative Reform", name_ar: "الإصلاح الإداري" },
      { handle: "public-sector-hr", name: "Public Sector Human Resources", name_ar: "الموارد البشرية في القطاع العام" },
      { handle: "local-administration", name: "Local Administration", name_ar: "الإدارة المحلية" },
    ],
  },
  {
    handle: "management-leadership",
    name: "Management and Leadership",
    name_ar: "الإدارة والقيادة",
    children: [
      { handle: "leadership", name: "Leadership", name_ar: "القيادة" },
      { handle: "strategic-management", name: "Strategic Management", name_ar: "الإدارة الاستراتيجية" },
      { handle: "organizational-behavior", name: "Organizational Behavior", name_ar: "السلوك التنظيمي" },
      { handle: "project-management", name: "Project Management", name_ar: "إدارة المشاريع" },
      { handle: "institutional-excellence", name: "Institutional Excellence and Quality", name_ar: "التميز المؤسسي والجودة" },
    ],
  },
  {
    handle: "islamic-economics-finance",
    name: "Islamic Economics and Financial Transactions",
    name_ar: "الاقتصاد الإسلامي والمعاملات المالية",
    children: [
      { handle: "islamic-economics", name: "Islamic Economics", name_ar: "الاقتصاد الإسلامي" },
      { handle: "financial-transactions-fiqh", name: "Jurisprudence of Financial Transactions", name_ar: "فقه المعاملات المالية" },
      { handle: "islamic-banking-finance", name: "Islamic Banking and Finance", name_ar: "المصرفية والتمويل الإسلامي" },
      { handle: "zakat-waqf", name: "Zakat and Waqf", name_ar: "الزكاة والوقف" },
      { handle: "takaful", name: "Takaful (Islamic Insurance)", name_ar: "التأمين التكافلي" },
    ],
  },
  {
    handle: "islamic-sciences",
    name: "Islamic Sciences",
    name_ar: "العلوم الإسلامية",
    children: [
      { handle: "quran-tafsir", name: "Quranic Sciences and Tafsir", name_ar: "علوم القرآن والتفسير" },
      { handle: "hadith", name: "Hadith and Its Sciences", name_ar: "الحديث وعلومه" },
      { handle: "aqidah", name: "Creed (Aqidah)", name_ar: "العقيدة" },
      { handle: "fiqh", name: "Fiqh", name_ar: "الفقه" },
      { handle: "tazkiyah-raqaeq", name: "Tazkiyah and Raqa'iq", name_ar: "التزكية والرقائق" },
      { handle: "seerah-history", name: "Seerah and Islamic History", name_ar: "السيرة والتاريخ الإسلامي" },
      { handle: "arabic-language", name: "Arabic Language Sciences", name_ar: "اللغة العربية وعلومها" },
    ],
  },
  {
    handle: "children-youth-family",
    name: "Children's, Young Adult, and Family Education",
    name_ar: "كتب الأطفال والناشئة والتربية الأسرية",
    children: [
      { handle: "children-books", name: "Children's Books", name_ar: "كتب الأطفال" },
      { handle: "young-adult-books", name: "Young Adult Books", name_ar: "كتب الناشئة" },
      { handle: "parenting-family", name: "Parenting and Family Education", name_ar: "التربية الأسرية" },
      { handle: "values-character", name: "Values and Character", name_ar: "القيم والأخلاق" },
    ],
  },
];

// Categories that existed before the classification. "merge": products move
// into the target and the old category is deleted. "reparent": the category
// (and its products) is kept and placed under a section.
export const LEGACY_CATEGORY_MOVES = [
  { handle: "shariah", action: "merge", into: "islamic-law-thought" },
  { handle: "management", action: "merge", into: "management-leadership" },
  { handle: "digital-transformation", action: "reparent", under: "public-administration" },
  { handle: "fiqh-usul", action: "merge", into: "usul-fiqh-siyasa" },
  { handle: "siyasa-shariyya", action: "merge", into: "fiqh-siyasa-shariyya" },
  { handle: "ijtihad-fatwa", action: "merge", into: "ijtihad-fatwa-siyasa" },
  { handle: "islamic-social-system", action: "merge", into: "islamic-systems" },
  { handle: "hisba-oversight", action: "merge", into: "islamic-systems" },
  { handle: "waqf-system", action: "merge", into: "islamic-financial-system" },
] as const;
