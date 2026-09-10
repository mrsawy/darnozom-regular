export interface BilingualText {
  ar: string;
  en: string;
}

export interface CaseStudyBullet {
  ar: string;
  en: string;
}

export interface ImpactItem {
  ar: string;
  en: string;
  metric?: { value: string; label: BilingualText };
}

export interface TaxonomyTag {
  slug: string;
  ar: string;
  en: string;
}

export interface CaseStudyTags {
  industry: TaxonomyTag;
  practice: TaxonomyTag;
  geography: TaxonomyTag;
}

export interface CaseStudy {
  id: string;
  flagship?: boolean;
  title: BilingualText;
  tagline: BilingualText;
  tags: CaseStudyTags;
  challenge: CaseStudyBullet[];
  approach: CaseStudyBullet[];
  solution: CaseStudyBullet[];
  impact: ImpactItem[];
  clientVoice?: { quote: BilingualText; attribution?: BilingualText };
  serviceSlugs?: string[];
}

/* ──────────────────────────────────────────────────────────────
   Taxonomy registries — used to populate the filter bar
────────────────────────────────────────────────────────────── */

export const INDUSTRIES: TaxonomyTag[] = [
  {
    slug: "industrial-manufacturing",
    ar: "التصنيع والصناعة",
    en: "Industrial & Manufacturing",
  },
  {
    slug: "financial-services",
    ar: "الخدمات المالية",
    en: "Financial Services",
  },
  {
    slug: "education-religious-sciences",
    ar: "التعليم والعلوم الشرعية",
    en: "Education & Religious Sciences",
  },
  {
    slug: "family-business-sme",
    ar: "الشركات العائلية والمتوسطة",
    en: "Family Business & SME",
  },
  {
    slug: "non-profit",
    ar: "القطاع غير الربحي",
    en: "Non-Profit / Third Sector",
  },
  {
    slug: "pharmaceuticals",
    ar: "الأدوية والرعاية الصحية",
    en: "Pharmaceuticals & Healthcare",
  },
];

export const PRACTICES: TaxonomyTag[] = [
  {
    slug: "digital-transformation",
    ar: "التحول الرقمي",
    en: "Digital Transformation",
  },
  {
    slug: "islamic-finance-sharia-compliance",
    ar: "التمويل الإسلامي والامتثال الشرعي",
    en: "Islamic Finance & Sharia Compliance",
  },
  {
    slug: "institution-building",
    ar: "بناء المؤسسات وتأسيس الكيانات",
    en: "Institution Building / Greenfield Setup",
  },
  {
    slug: "governance-organizational-maturity",
    ar: "الحوكمة والنضج المؤسسي",
    en: "Governance & Organizational Maturity",
  },
  {
    slug: "performance-management-kpi",
    ar: "إدارة الأداء وتصميم المؤشرات",
    en: "Performance Management & KPI Design",
  },
  {
    slug: "executive-advisory",
    ar: "الاستشارات التنفيذية",
    en: "Executive Advisory",
  },
  {
    slug: "human-capital",
    ar: "الموارد البشرية ورأس المال البشري",
    en: "Human Capital & HR",
  },
];

export const GEOGRAPHIES: TaxonomyTag[] = [
  { slug: "egypt", ar: "مصر", en: "Egypt" },
  { slug: "uae", ar: "الإمارات", en: "United Arab Emirates" },
  { slug: "ksa", ar: "السعودية", en: "Saudi Arabia" },
  { slug: "germany", ar: "ألمانيا", en: "Germany" },
  { slug: "europe", ar: "أوروبا", en: "Europe" },
];

/* ──────────────────────────────────────────────────────────────
   The five engagements — confidentiality preserved, no fabricated
   numbers. Impact is expressed qualitatively.
────────────────────────────────────────────────────────────── */

const TAG = {
  industry: (slug: string): TaxonomyTag =>
    INDUSTRIES.find((i) => i.slug === slug) as TaxonomyTag,
  practice: (slug: string): TaxonomyTag =>
    PRACTICES.find((p) => p.slug === slug) as TaxonomyTag,
  geography: (slug: string): TaxonomyTag =>
    GEOGRAPHIES.find((g) => g.slug === slug) as TaxonomyTag,
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "industrial-digital-transformation",
    flagship: true,
    title: {
      ar: "قيادة التحول الرقمي لشركة صناعية",
      en: "Leading the Digital Transformation of an Industrial Company",
    },
    tagline: {
      ar: "إعادة تصميم النموذج التشغيلي ووضع أساس بيانات مؤسسي يدعم القرار الصناعي.",
      en: "Redesigning the operating model and laying an enterprise data foundation that supports industrial decision-making.",
    },
    tags: {
      industry: TAG.industry("industrial-manufacturing"),
      practice: TAG.practice("digital-transformation"),
      geography: TAG.geography("egypt"),
    },
    challenge: [
      {
        ar: "أنظمة تشغيلية متفرقة وعدم وجود مرجع موحد للبيانات الإنتاجية والمالية.",
        en: "Fragmented operating systems with no single source of truth for production and financial data.",
      },
      {
        ar: "غياب رؤية تنفيذية في الوقت الحقيقي عن الأداء التشغيلي.",
        en: "Absence of a real-time executive view of operational performance.",
      },
      {
        ar: "عمليات يدوية كثيفة في المخزون والشراء والإنتاج تخلق تأخيرًا وهدرًا.",
        en: "Heavy manual workflows across inventory, procurement, and production creating delays and waste.",
      },
    ],
    approach: [
      {
        ar: "تشخيص النضج الرقمي عبر الإدارات وتحديد الفجوات الأكثر تأثيرًا.",
        en: "Cross-functional digital maturity diagnostic to identify the highest-impact gaps.",
      },
      {
        ar: "بناء خارطة طريق تحول رقمي مرتبطة بأهداف الأعمال وذات أولويات متدرجة.",
        en: "A digital transformation roadmap aligned with business objectives and sequenced by priority.",
      },
      {
        ar: "تصميم نموذج حوكمة البيانات ومُلكيتها بين الإدارات.",
        en: "Designing a data-governance and ownership model across departments.",
      },
    ],
    solution: [
      {
        ar: "إطار اختيار وتطبيق أنظمة المؤسسة (ERP وما يلحق بها) بمعايير محايدة.",
        en: "A vendor-neutral framework for selecting and rolling out enterprise systems (ERP and adjacent platforms).",
      },
      {
        ar: "نموذج تشغيل مستهدف يربط العمليات الصناعية والمالية والتجارية.",
        en: "A target operating model linking industrial, financial, and commercial processes.",
      },
      {
        ar: "تصميم لوحات تنفيذية ومؤشرات أداء مرتبطة بمصادر البيانات الجديدة.",
        en: "Executive dashboards and KPIs wired to the new data sources.",
      },
      {
        ar: "خطة إدارة التغيير وبناء قدرات الفرق الداخلية لتشغيل النموذج الجديد.",
        en: "A change-management plan and internal capability build-out to operate the new model.",
      },
    ],
    impact: [
      {
        ar: "نموذج تشغيل موحد ومُحوكم يربط الإنتاج بالمالية والتجارية.",
        en: "A unified, governed operating model linking production with finance and commercial.",
      },
      {
        ar: "أساس بيانات موثوق يدعم قرارات الإدارة العليا.",
        en: "A trusted data foundation that supports senior leadership decisions.",
      },
      {
        ar: "تحسينات نوعية في الانضباط التشغيلي ومتابعة الأداء.",
        en: "Qualitative improvements in operational discipline and performance follow-through.",
      },
    ],
    serviceSlugs: ["digital-transformation"],
  },
  {
    id: "sharia-finance-model",
    flagship: true,
    title: {
      ar: "تصميم نموذج مالي متوافق مع الشريعة",
      en: "Designing a Sharia-Compliant Financial Model",
    },
    tagline: {
      ar: "بناء منظومة تمويل واستثمار متكاملة تجمع بين الامتثال الشرعي والكفاءة الاقتصادية.",
      en: "Building an integrated financing and investment system that combines Sharia compliance with economic efficiency.",
    },
    tags: {
      industry: TAG.industry("financial-services"),
      practice: TAG.practice("islamic-finance-sharia-compliance"),
      geography: TAG.geography("egypt"),
    },
    challenge: [
      {
        ar: "غياب إطار موحد يحكم تصميم المنتجات المالية المتوافقة مع الشريعة.",
        en: "No unified framework governing the design of Sharia-compliant financial products.",
      },
      {
        ar: "تباين في تطبيق الضوابط الشرعية بين خطوط الأعمال.",
        en: "Inconsistent application of Sharia controls across business lines.",
      },
      {
        ar: "ضعف الترابط بين الامتثال الشرعي وآليات الحوكمة المالية.",
        en: "Weak linkage between Sharia compliance and the financial-governance machinery.",
      },
    ],
    approach: [
      {
        ar: "مراجعة شرعية ومالية متوازية للمنتجات والعمليات القائمة.",
        en: "A parallel Sharia and financial review of existing products and operations.",
      },
      {
        ar: "وضع مرجعية موحدة للهياكل التمويلية المعتمدة وضوابط استخدامها.",
        en: "A single reference for approved financing structures and their usage controls.",
      },
      {
        ar: "تصميم نقاط تحقق شرعية مدمجة في دورة حياة المنتج.",
        en: "Sharia checkpoints embedded across the product lifecycle.",
      },
    ],
    solution: [
      {
        ar: "نماذج تمويل معتمدة (مرابحة · مشاركة · استثمار) موثقة كمرجع مؤسسي.",
        en: "Approved financing models (Murabaha · Musharaka · Investment) documented as an institutional reference.",
      },
      {
        ar: "إطار حوكمة شرعية يربط الهيئة الشرعية بالإدارة التنفيذية والمراجعة الداخلية.",
        en: "A Sharia-governance framework connecting the Sharia board with executive management and internal audit.",
      },
      {
        ar: "سياسات وإجراءات تشغيلية تربط الامتثال الشرعي بالأداء المالي.",
        en: "Operating policies and procedures that tie Sharia compliance to financial performance.",
      },
    ],
    impact: [
      {
        ar: "امتثال شرعي مؤسسي موحد عبر خطوط المنتجات.",
        en: "A consistent institutional Sharia-compliance posture across product lines.",
      },
      {
        ar: "وضوح أعلى للمستثمرين حول كيفية إدارة الالتزامات الشرعية.",
        en: "Greater clarity for investors on how Sharia obligations are managed.",
      },
      {
        ar: "كفاءة أعلى في إدارة دورة حياة المنتجات الاستثمارية.",
        en: "Improved efficiency in managing the investment-product lifecycle.",
      },
    ],
    serviceSlugs: ["islamic-systems"],
  },
  {
    id: "islamic-sciences-academy",
    flagship: true,
    title: {
      ar: "تأسيس أكاديمية لتعليم العلوم الإسلامية",
      en: "Founding an Academy for Teaching the Islamic Sciences",
    },
    tagline: {
      ar: "بناء كيان علمي متكامل يجمع بين رصانة المحتوى الشرعي وحوكمة المؤسسات التعليمية الحديثة.",
      en: "Building an integrated scholarly entity that combines rigorous Sharia content with the governance of a modern educational institution.",
    },
    tags: {
      industry: TAG.industry("education-religious-sciences"),
      practice: TAG.practice("institution-building"),
      geography: TAG.geography("egypt"),
    },
    challenge: [
      {
        ar: "غياب نموذج مؤسسي ناضج لأكاديمية شرعية متكاملة.",
        en: "No mature institutional model for an integrated Sharia academy.",
      },
      {
        ar: "تشتت في المحتوى التعليمي وضعف ضبطه شرعيًا.",
        en: "Fragmented educational content with weak Sharia controls.",
      },
      {
        ar: "غياب أنظمة تشغيل واضحة وحوكمة أكاديمية.",
        en: "Absence of clear operating systems and academic governance.",
      },
    ],
    approach: [
      {
        ar: "صياغة الهوية العلمية والنموذج المؤسسي قبل البدء في التشغيل.",
        en: "Defining scholarly identity and institutional model before any operational build-out.",
      },
      {
        ar: "تصميم المسارات التعليمية بمنهجية متدرجة ومرتبطة بالمخرجات.",
        en: "Designing educational tracks through an outcome-driven, progressive methodology.",
      },
      {
        ar: "ربط التدقيق الشرعي بالتحرير العلمي للمحتوى منذ مرحلة التأليف.",
        en: "Embedding Sharia auditing alongside scholarly editing from the authoring stage onward.",
      },
    ],
    solution: [
      {
        ar: "تأسيس كامل للأكاديمية: الهوية، الحوكمة، السياسات، والإجراءات الأكاديمية والإدارية.",
        en: "End-to-end establishment of the academy: identity, governance, and academic & administrative policies and procedures.",
      },
      {
        ar: "تصميم البرامج والمسارات الدراسية عبر العلوم الإسلامية.",
        en: "Designing programs and learning tracks across the Islamic sciences.",
      },
      {
        ar: "إعداد الكوادر التدريسية والإدارية وبناء قدراتها.",
        en: "Recruiting and capability-building of teaching and administrative staff.",
      },
      {
        ar: "استشارات استراتيجية مستمرة للإدارة العامة بعد الإطلاق.",
        en: "Ongoing strategic advisory to the general management post-launch.",
      },
    ],
    impact: [
      {
        ar: "إطلاق أكاديمية شرعية متكاملة بهوية علمية واضحة ومنظومة تشغيل ناضجة.",
        en: "Launch of an integrated Sharia academy with a clear scholarly identity and a mature operating system.",
      },
      {
        ar: "محتوى تعليمي منضبط شرعيًا وعالي الجودة عبر المسارات والبرامج.",
        en: "Sharia-compliant, high-quality educational content across all tracks and programs.",
      },
      {
        ar: "كوادر مؤهلة قادرة على تشغيل الأكاديمية باستدامة.",
        en: "Qualified staff capable of operating the academy sustainably.",
      },
    ],
    serviceSlugs: ["academy"],
  },
  {
    id: "founder-to-institution",
    title: {
      ar: "التحول من إدارة المؤسس إلى نموذج مؤسسي",
      en: "From Founder-Led to Institutional Model",
    },
    tagline: {
      ar: "نقل مركز الثقل من قرار الفرد إلى نظام يعتمد على هيكل واضح وحوكمة متدرجة.",
      en: "Shifting the centre of gravity from individual decision-making to a system anchored in a clear structure and graduated governance.",
    },
    tags: {
      industry: TAG.industry("family-business-sme"),
      practice: TAG.practice("governance-organizational-maturity"),
      geography: TAG.geography("egypt"),
    },
    challenge: [
      {
        ar: "اعتماد الشركة بشكل شبه كامل على المؤسس في القرارات اليومية والاستراتيجية.",
        en: "Near-total dependence on the founder for both day-to-day and strategic decisions.",
      },
      {
        ar: "ضبابية في الأدوار والمسؤوليات بين الإدارة العليا والوسطى.",
        en: "Ambiguity in roles and responsibilities across senior and middle management.",
      },
      {
        ar: "غياب آليات قياس أداء وآليات تفويض رسمية.",
        en: "No formal performance measurement or delegation mechanisms.",
      },
    ],
    approach: [
      {
        ar: "تشخيص النضج المؤسسي وتحديد فجوات الانتقال إلى نموذج مؤسسي.",
        en: "Organizational-maturity diagnostic to identify gaps in the transition to an institutional model.",
      },
      {
        ar: "تصميم نموذج حوكمة متدرج يحفظ دور المؤسس مع تمكين الإدارة التنفيذية.",
        en: "A graduated governance model that preserves the founder's role while empowering executive management.",
      },
      {
        ar: "ربط الهيكل الجديد بنظام أداء وآليات متابعة موثقة.",
        en: "Linking the new structure to a performance system and documented follow-through mechanisms.",
      },
    ],
    solution: [
      {
        ar: "هيكل تنظيمي جديد وأوصاف وظيفية لمستويات الإدارة العليا والوسطى.",
        en: "A new organizational structure with job descriptions for senior and middle-management levels.",
      },
      {
        ar: "مصفوفة صلاحيات وتفويض رسمية بين المؤسس والإدارة التنفيذية.",
        en: "A formal authority and delegation matrix between the founder and executive management.",
      },
      {
        ar: "نظام إدارة أداء وربطه بدورة المتابعة والقرار.",
        en: "A performance-management system tied to the follow-through and decision cycle.",
      },
    ],
    impact: [
      {
        ar: "وضوح إداري في الأدوار والمسؤوليات على مستوى المؤسسة.",
        en: "Managerial clarity in roles and responsibilities across the organization.",
      },
      {
        ar: "تحرير تدريجي لوقت المؤسس من القرارات التشغيلية اليومية.",
        en: "A gradual release of the founder's time from day-to-day operational decisions.",
      },
      {
        ar: "جاهزية مؤسسية أعلى للنمو والمراحل اللاحقة.",
        en: "Higher institutional readiness for growth and subsequent stages.",
      },
    ],
    serviceSlugs: ["management-systems"],
  },
  {
    id: "non-profit-performance",
    title: {
      ar: "تصميم نظام أداء لمنظمة غير ربحية",
      en: "Designing a Performance System for a Non-Profit",
    },
    tagline: {
      ar: "تحويل رسالة المنظمة إلى مؤشرات قابلة للقياس ودورة مراجعة منتظمة.",
      en: "Translating the organization's mission into measurable indicators and a regular review cycle.",
    },
    tags: {
      industry: TAG.industry("non-profit"),
      practice: TAG.practice("performance-management-kpi"),
      geography: TAG.geography("germany"),
    },
    challenge: [
      {
        ar: "صعوبة في قياس الأثر الفعلي للأنشطة على المستفيدين.",
        en: "Difficulty in measuring the real impact of activities on beneficiaries.",
      },
      {
        ar: "غياب لغة موحدة للأداء بين الإدارة التنفيذية ومجلس الإدارة.",
        en: "Absence of a shared performance language between executive management and the board.",
      },
      {
        ar: "تشتت في إعداد التقارير وعدم اتساقها بين الفترات.",
        en: "Fragmented and inconsistent reporting across reporting periods.",
      },
    ],
    approach: [
      {
        ar: "ترجمة الرسالة والأهداف الاستراتيجية إلى أبعاد أداء محددة.",
        en: "Translating mission and strategic objectives into defined performance dimensions.",
      },
      {
        ar: "اعتماد بطاقة الأداء المتوازن (Balanced Scorecard) كإطار حوكمة للأداء.",
        en: "Adopting the Balanced Scorecard as a performance-governance framework.",
      },
      {
        ar: "تصميم دورة مراجعة دورية مرتبطة بقرارات التخصيص والتمويل.",
        en: "Designing a periodic review cycle tied to allocation and funding decisions.",
      },
    ],
    solution: [
      {
        ar: "خريطة أداء استراتيجية ومؤشرات أداء رئيسية لكل بعد.",
        en: "A strategic performance map with KPIs per dimension.",
      },
      {
        ar: "نموذج تقارير موحد للإدارة التنفيذية ومجلس الإدارة.",
        en: "A unified reporting template for executive management and the board.",
      },
      {
        ar: "دليل تشغيلي لدورة المراجعة الدورية وآليات اتخاذ القرار.",
        en: "An operating handbook for the periodic review cycle and decision mechanisms.",
      },
    ],
    impact: [
      {
        ar: "قياس أوضح لأثر الأنشطة على المستفيدين.",
        en: "Clearer measurement of activity impact on beneficiaries.",
      },
      {
        ar: "اتساق في إعداد التقارير عبر الفترات.",
        en: "Consistency in reporting across periods.",
      },
      {
        ar: "قرارات تخصيص وتمويل مبنية على أداء موثق.",
        en: "Allocation and funding decisions grounded in documented performance.",
      },
    ],
    serviceSlugs: ["management-systems"],
  },
  {
    id: "uae-pharma-restructure",
    title: {
      ar: "إعادة هيكلة نظام العمل لشركة أدوية في الإمارات",
      en: "Operating-System Restructure for a UAE Pharmaceutical Company",
    },
    tagline: {
      ar: "إعادة تصميم نظام التشغيل وربط الأداء بالأهداف البيعية لشركة أدوية إقليمية.",
      en: "Redesigning the operating system and linking performance to sales targets for a regional pharmaceutical company.",
    },
    tags: {
      industry: TAG.industry("pharmaceuticals"),
      practice: TAG.practice("governance-organizational-maturity"),
      geography: TAG.geography("uae"),
    },
    challenge: [
      {
        ar: "ضعف في تنظيم العمليات بين الإدارات وغياب نظام تشغيل واضح.",
        en: "Poor process organization across departments with no clear operating system.",
      },
      {
        ar: "غموض في توزيع المسؤوليات بين الفرق التجارية والتشغيلية.",
        en: "Unclear distribution of responsibilities between commercial and operational teams.",
      },
      {
        ar: "عدم ارتباط أداء الفرق بالأهداف البيعية للشركة.",
        en: "No linkage between team performance and the company's sales targets.",
      },
    ],
    approach: [
      {
        ar: "تشخيص نظام العمل القائم وتحديد نقاط الاحتكاك بين الإدارات.",
        en: "Diagnostic of the existing operating system to identify cross-departmental friction points.",
      },
      {
        ar: "تصميم نظام تشغيل جديد يربط العمليات بالأهداف التجارية.",
        en: "Designing a new operating system that ties operations to commercial objectives.",
      },
      {
        ar: "وضع آليات حوكمة لمتابعة الأداء واتخاذ القرار.",
        en: "Establishing governance mechanisms for performance follow-through and decision-making.",
      },
    ],
    solution: [
      {
        ar: "نظام تشغيل موثّق يحدد سير العمل بين الإدارات.",
        en: "A documented operating system defining cross-departmental workflows.",
      },
      {
        ar: "إطار مؤشرات أداء مرتبط بالأهداف البيعية.",
        en: "A KPI framework linked to the sales targets.",
      },
      {
        ar: "مصفوفة أدوار ومسؤوليات بين الفرق التجارية والتشغيلية.",
        en: "A roles-and-responsibilities matrix between commercial and operational teams.",
      },
    ],
    impact: [
      {
        ar: "تحسين الكفاءة التشغيلية ووضوح نظام العمل.",
        en: "Improved operational efficiency and a clearer operating model.",
      },
      {
        ar: "تنسيق أعلى بين الفرق التجارية والتشغيلية.",
        en: "Stronger coordination between commercial and operational teams.",
      },
      {
        ar: "نمو في المبيعات نتيجة تحسين الإدارة والمتابعة.",
        en: "Growth in sales as a result of better management and follow-through.",
      },
    ],
    serviceSlugs: ["management-systems"],
  },
  {
    id: "ksa-executive-advisory",
    title: {
      ar: "استشارة تنفيذية لرئيس شركة في السعودية",
      en: "Executive Advisory for a Company President in KSA",
    },
    tagline: {
      ar: "مرافقة استشارية مباشرة للإدارة العليا لتطوير أساليب القيادة وآليات المتابعة.",
      en: "Direct advisory support to senior leadership to develop leadership style and follow-through mechanisms.",
    },
    tags: {
      industry: TAG.industry("family-business-sme"),
      practice: TAG.practice("executive-advisory"),
      geography: TAG.geography("ksa"),
    },
    challenge: [
      {
        ar: "الحاجة إلى تحسين إدارة الفريق التنفيذي وآليات اتخاذ القرار.",
        en: "Need to improve management of the executive team and decision-making mechanisms.",
      },
      {
        ar: "ضعف في الانضباط المؤسسي ومتابعة تنفيذ القرارات.",
        en: "Weak institutional discipline and follow-through on executed decisions.",
      },
      {
        ar: "غياب لغة قيادية موحدة بين رئيس الشركة والإدارة التنفيذية.",
        en: "Absence of a shared leadership language between the president and the executive team.",
      },
    ],
    approach: [
      {
        ar: "جلسات استشارية دورية مع رئيس الشركة لتشخيص تحديات القيادة.",
        en: "Recurring advisory sessions with the president to diagnose leadership challenges.",
      },
      {
        ar: "بناء أدوات عملية لتحسين الاجتماعات التنفيذية ومتابعة القرارات.",
        en: "Building practical tools to improve executive meetings and decision follow-through.",
      },
      {
        ar: "تطوير أساليب القيادة وتفويض الصلاحيات داخل الفريق التنفيذي.",
        en: "Developing leadership style and delegation within the executive team.",
      },
    ],
    solution: [
      {
        ar: "إطار مرجعي لاتخاذ القرار التنفيذي ومتابعته.",
        en: "A reference framework for executive decision-making and follow-through.",
      },
      {
        ar: "بروتوكولات اجتماعات تنفيذية موثّقة.",
        en: "Documented executive meeting protocols.",
      },
      {
        ar: "خطة تطوير قيادي مخصصة لرئيس الشركة وفريقه التنفيذي.",
        en: "A tailored leadership development plan for the president and the executive team.",
      },
    ],
    impact: [
      {
        ar: "تحسين فعالية القيادة على مستوى الإدارة العليا.",
        en: "Improved leadership effectiveness at the senior level.",
      },
      {
        ar: "رفع كفاءة الفرق التنفيذية وانضباط المتابعة.",
        en: "Higher executive-team efficiency and follow-through discipline.",
      },
      {
        ar: "تعزيز الانضباط المؤسسي في تنفيذ القرارات.",
        en: "Strengthened institutional discipline in executing decisions.",
      },
    ],
    serviceSlugs: ["consulting"],
  },
  {
    id: "uae-hr-system",
    title: {
      ar: "تطوير نظام الموارد البشرية لشركة في الإمارات",
      en: "Developing the HR System for a UAE Company",
    },
    tagline: {
      ar: "بناء منظومة موارد بشرية متكاملة تربط السياسات بالأداء وتُؤسس لبيئة عمل أكثر احترافية.",
      en: "Building an integrated HR system that links policies to performance and lays the ground for a more professional workplace.",
    },
    tags: {
      industry: TAG.industry("family-business-sme"),
      practice: TAG.practice("human-capital"),
      geography: TAG.geography("uae"),
    },
    challenge: [
      {
        ar: "تحديات في إدارة وتقييم الموظفين بشكل موضوعي ومنتظم.",
        en: "Challenges in managing and evaluating employees in an objective and consistent way.",
      },
      {
        ar: "غياب سياسات موارد بشرية موحدة وموثقة.",
        en: "Absence of unified, documented HR policies.",
      },
      {
        ar: "ضعف في ربط الأداء الفردي بأهداف المؤسسة.",
        en: "Weak linkage between individual performance and the institution's objectives.",
      },
    ],
    approach: [
      {
        ar: "مراجعة شاملة لمنظومة الموارد البشرية القائمة وتحديد الفجوات.",
        en: "End-to-end review of the existing HR function and gap identification.",
      },
      {
        ar: "تصميم نظام تقييم أداء مرتبط بالأهداف المؤسسية.",
        en: "Designing a performance appraisal system tied to institutional objectives.",
      },
      {
        ar: "إعادة هيكلة السياسات والإجراءات وفق أفضل الممارسات.",
        en: "Restructuring policies and procedures along best-practice lines.",
      },
    ],
    solution: [
      {
        ar: "دليل سياسات وإجراءات موارد بشرية متكامل.",
        en: "An integrated HR policies-and-procedures manual.",
      },
      {
        ar: "نظام تقييم أداء سنوي ودوري بمعايير واضحة.",
        en: "An annual and periodic performance appraisal system with clear criteria.",
      },
      {
        ar: "إطار للمسارات الوظيفية والتطوير المهني.",
        en: "A career-path and professional-development framework.",
      },
    ],
    impact: [
      {
        ar: "تحسين إدارة الموارد البشرية وتوحيد ممارساتها.",
        en: "Improved HR management with standardized practices.",
      },
      {
        ar: "رفع أداء الموظفين عبر معايير تقييم موضوعية.",
        en: "Higher employee performance through objective appraisal criteria.",
      },
      {
        ar: "بيئة عمل أكثر احترافية واستقرارًا.",
        en: "A more professional and stable working environment.",
      },
    ],
    serviceSlugs: ["management-systems"],
  },
  {
    id: "europe-islamic-center",
    title: {
      ar: "تطوير الهيكل الإداري لمركز إسلامي في أوروبا",
      en: "Management Structure Development for an Islamic Center in Europe",
    },
    tagline: {
      ar: "إعادة بناء الهيكل الإداري ونموذج التشغيل لتأسيس قيادة واضحة واستدامة مؤسسية.",
      en: "Rebuilding the management structure and operating model to establish clear leadership and institutional sustainability.",
    },
    tags: {
      industry: TAG.industry("non-profit"),
      practice: TAG.practice("governance-organizational-maturity"),
      geography: TAG.geography("europe"),
    },
    challenge: [
      {
        ar: "هيكل إداري غير ناضج لا يعكس حجم نشاط المركز.",
        en: "An immature management structure that does not reflect the center's scope of activity.",
      },
      {
        ar: "ضبابية في الصلاحيات والقرارات بين القيادة والإدارة التشغيلية.",
        en: "Ambiguity in authority and decisions between leadership and operational management.",
      },
      {
        ar: "غياب نموذج تشغيل واضح يضمن استمرارية الأنشطة.",
        en: "Absence of a clear operating model that ensures continuity of activities.",
      },
    ],
    approach: [
      {
        ar: "تشخيص الواقع الإداري للمركز وفهم خصوصية بيئته الأوروبية.",
        en: "Diagnostic of the center's management reality and the specificity of its European context.",
      },
      {
        ar: "إعادة تصميم الهيكل التنظيمي وتنظيم الصلاحيات.",
        en: "Redesigning the organizational structure and organizing delegation of authority.",
      },
      {
        ar: "بناء نموذج تشغيل بسيط وقابل للاستدامة.",
        en: "Building a simple, sustainable operating model.",
      },
    ],
    solution: [
      {
        ar: "هيكل تنظيمي جديد بأدوار ومسؤوليات موثقة.",
        en: "A new organizational structure with documented roles and responsibilities.",
      },
      {
        ar: "مصفوفة صلاحيات بين القيادة والإدارة التنفيذية.",
        en: "An authority matrix between leadership and executive management.",
      },
      {
        ar: "نموذج تشغيل يربط الأنشطة الدعوية والإدارية بمنظومة قرار واحدة.",
        en: "An operating model linking outreach and administrative activities under a single decision system.",
      },
    ],
    impact: [
      {
        ar: "كفاءة إدارية أعلى في تشغيل المركز.",
        en: "Higher managerial efficiency in running the center.",
      },
      {
        ar: "استدامة مؤسسية لا تعتمد على أفراد بعينهم.",
        en: "Institutional sustainability that does not rely on specific individuals.",
      },
      {
        ar: "وضوح في القيادة وآليات القرار.",
        en: "Clarity of leadership and decision mechanisms.",
      },
    ],
    serviceSlugs: ["management-systems"],
  },
  {
    id: "egypt-integrated-system",
    title: {
      ar: "تأسيس نظام إداري وشرعي متكامل لشركة في مصر",
      en: "Establishing an Integrated Managerial & Sharia System for an Egyptian Company",
    },
    tagline: {
      ar: "بناء منظومة متكاملة تجمع الهيكل الإداري ونموذج التشغيل والحوكمة الشرعية في مرحلة النمو.",
      en: "Building an integrated system that brings together the management structure, operating model, and Sharia governance during the growth stage.",
    },
    tags: {
      industry: TAG.industry("family-business-sme"),
      practice: TAG.practice("institution-building"),
      geography: TAG.geography("egypt"),
    },
    challenge: [
      {
        ar: "شركة في مرحلة نمو تفتقر إلى منظومة إدارية متكاملة.",
        en: "A growth-stage company lacking an integrated management system.",
      },
      {
        ar: "غياب نموذج حوكمة شرعية يواكب توسع الأنشطة.",
        en: "Absence of a Sharia-governance model that keeps pace with expanding activities.",
      },
      {
        ar: "تشتت بين الجوانب الإدارية والشرعية في القرارات اليومية.",
        en: "Disconnect between managerial and Sharia dimensions in day-to-day decisions.",
      },
    ],
    approach: [
      {
        ar: "تشخيص متوازٍ للجانبين الإداري والشرعي.",
        en: "Parallel diagnostic of the managerial and Sharia dimensions.",
      },
      {
        ar: "تصميم نظام تشغيل وحوكمة بشكل تكاملي لا منفصل.",
        en: "Designing an operating and governance system in an integrated, not siloed, fashion.",
      },
      {
        ar: "ربط مكونات النظام الجديد بمتطلبات مرحلة النمو.",
        en: "Linking the components of the new system to the requirements of the growth stage.",
      },
    ],
    solution: [
      {
        ar: "هيكل إداري وحوكمة مؤسسية متكاملة.",
        en: "An integrated management structure with institutional governance.",
      },
      {
        ar: "نظام تشغيل موثّق للأنشطة الأساسية.",
        en: "A documented operating system for the core activities.",
      },
      {
        ar: "إطار حوكمة شرعية يربط الفتوى المؤسسية بالقرار التنفيذي.",
        en: "A Sharia-governance framework connecting institutional fatwa with executive decisions.",
      },
    ],
    impact: [
      {
        ar: "تأسيس نموذج مؤسسي واضح للشركة.",
        en: "Establishment of a clear institutional model for the company.",
      },
      {
        ar: "تكامل بين البعدين الإداري والشرعي في القرار.",
        en: "Integration between the managerial and Sharia dimensions in decision-making.",
      },
      {
        ar: "جاهزية أعلى للتوسع والمراحل اللاحقة.",
        en: "Higher readiness to scale into subsequent stages.",
      },
    ],
    serviceSlugs: ["islamic-systems", "management-systems"],
  },
];

/* ──────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */

export function getCaseStudyById(id: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.id === id);
}

export function getCaseStudiesByService(slug: string): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.serviceSlugs?.includes(slug));
}

export function getCaseStudiesByIndustry(industrySlug: string): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.tags.industry.slug === industrySlug);
}

export function getCaseStudiesByPractice(practiceSlug: string): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.tags.practice.slug === practiceSlug);
}

export function getCaseStudiesByGeography(geographySlug: string): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.tags.geography.slug === geographySlug);
}

export function getFeaturedCaseStudies(): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.flagship);
}

export function getRelatedCaseStudies(
  caseStudy: CaseStudy,
  limit = 3,
): CaseStudy[] {
  const ownServices = new Set(caseStudy.serviceSlugs ?? []);
  return CASE_STUDIES.filter((c) => {
    if (c.id === caseStudy.id) return false;
    const sameIndustry = c.tags.industry.slug === caseStudy.tags.industry.slug;
    const samePractice = c.tags.practice.slug === caseStudy.tags.practice.slug;
    const sharesService = (c.serviceSlugs ?? []).some((s) => ownServices.has(s));
    return sameIndustry || samePractice || sharesService;
  }).slice(0, limit);
}
