export interface AboutStep { ar: string; en: string; descAr: string; descEn: string }
export interface AboutValue { ar: string; en: string }

/** Everything on /about that the admin can edit. The institutional-structure links stay in code. */
export interface AboutContent {
  imageUrl: string;
  /** Images shown beside each section in the "rosewell" About design. */
  visionImageUrl: string;
  missionImageUrl: string;
  approachImageUrl: string;
  valuesImageUrl: string;
  structureImageUrl: string;
  titleAr: string; titleEn: string;
  introAr: string; introEn: string;
  visionAr: string; visionEn: string;
  missionAr: string; missionEn: string;
  approachIntroAr: string; approachIntroEn: string;
  steps: AboutStep[];
  values: AboutValue[];
}

const DEFAULT_STEPS: AboutStep[] = [
  {
    ar: "نفهم الاحتياجات ونحدد الفجوات",
    en: "Understand Needs & Identify Gaps",
    descAr: "نتعرّف إلى أهداف الجهة وتحدياتها، ونستمع إلى أصحاب المصلحة، ونحدد الفجوات في السياسات والأداء والقدرات؛ لنتفق على الأولويات والنتائج المطلوبة.",
    descEn: "We identify organizational goals and challenges, listen to stakeholders, and identify gaps in policy, performance, and capacity to align on priorities and desired outcomes.",
  },
  {
    ar: "نؤصّل ونحلل",
    en: "Ground & Analyze",
    descAr: "ندرس الأصول الشرعية ذات الصلة، ونحلل الواقع والبيانات وأسباب الفجوات، ونستفيد من مناهج العلوم السياسية والإدارية والخبرات والتجارب المقارنة؛ لبناء فهم متكامل تستند إليه الحلول.",
    descEn: "We study relevant Sharia foundations, analyze data and underlying causes of gaps, and draw on political and administrative sciences as well as comparative benchmarks to build a holistic foundation for solutions.",
  },
  {
    ar: "نصمم الحلول والبرامج",
    en: "Design Solutions & Programs",
    descAr: "نطوّر دراسات وتوصيات وسياسات وبرامج تدريب وأدوات عملية تستجيب للاحتياجات، وتراعي الموارد المتاحة والسياق المؤسسي ومتطلبات التنفيذ.",
    descEn: "We develop studies, policy recommendations, training programs, and practical tools tailored to needs, taking into account available resources, institutional context, and execution requirements.",
  },
  {
    ar: "ندعم التنفيذ ونقيّم الأثر",
    en: "Support Execution & Assess Impact",
    descAr: "نساند وضع خطط التنفيذ وتحديد المسؤوليات ومؤشرات المتابعة، ونقيّم النتائج والأثر، ونستفيد مما نتعلمه في تطوير الحلول وتحسين الأداء.",
    descEn: "We assist in formulating implementation plans, defining responsibilities and KPIs, evaluate outcomes and impact, and leverage insights for continuous performance improvement.",
  },
];

const DEFAULT_VALUES: AboutValue[] = [
  { ar: "الالتزام بالمرجعية الإسلامية", en: "Commitment to Islamic Foundations" },
  { ar: "الأمانة العلمية", en: "Scholarly Integrity" },
  { ar: "الانضباط المنهجي", en: "Methodological Rigor" },
  { ar: "المصلحة العامة", en: "Public Interest" },
  { ar: "التكامل", en: "Integration" },
  { ar: "الجودة", en: "Quality" },
];

export const DEFAULT_ABOUT: AboutContent = {
  imageUrl: "/about-overview.png",
  visionImageUrl: "/seed/research.webp",
  missionImageUrl: "/seed/about.webp",
  approachImageUrl: "/seed/workshop.webp",
  valuesImageUrl: "/seed/seminar.webp",
  structureImageUrl: "/seed/academy.webp",
  titleAr: "من نحن", titleEn: "Who We Are",
  introAr: "دار نظم مؤسسة متخصصة في البحوث والاستشارات والتدريب وبناء القدرات في مجالات السياسات العامة والإدارة والقيادة والحوكمة. تضم نخبة من الباحثين والخبراء المتخصصين، وتجمع بين المرجعية الإسلامية والعلوم السياسية والإدارية والخبرة التطبيقية المعاصرة. وتعمل مع الحكومات والمؤسسات العامة والشركات ذات الدور الاستراتيجي والمنظمات غير الربحية على إنتاج المعرفة وصياغة الحلول الداعمة لصنع القرار، وتطوير السياسات وتأهيل القيادات وبناء مؤسسات فاعلة؛ بما يعزز كفاءة الأداء، ويحسّن الخدمات، ويسهم في التنمية وتحقيق المصالح العامة.",
  introEn: "DarNozom is an institution specialized in research, consulting, training, and capacity building in public policy, management, leadership, and governance. It brings together an elite group of researchers and specialized experts, combining an Islamic frame of reference with political and administrative sciences and contemporary applied expertise. It collaborates with governments, public entities, strategically vital companies, and non-profit organizations to generate knowledge, formulate decision-support solutions, develop policies, qualify leaders, and build effective institutions—thereby enhancing performance efficiency, improving public services, and contributing to development and the public interest.",
  visionAr: "أن تكون دار نظم مؤسسة مرجعية وشريكًا موثوقًا في تطوير السياسات وبناء قيادات ومؤسسات فاعلة، من خلال التكامل بين المرجعية الإسلامية والعلوم السياسية والإدارية والخبرة المعاصرة.",
  visionEn: "For DarNozom to be a benchmark institution and a trusted partner in developing policies and building effective leaders and institutions, through the integration of an Islamic frame of reference, political and administrative sciences, and contemporary expertise.",
  missionAr: "ننتج معرفة تدعم القرار، ونطوّر سياسات وحلولًا تستجيب للاحتياجات والتحديات، ونؤهّل القيادات ونبني القدرات، ونساند تأسيس المؤسسات وتطوير إدارتها وحوكمتها. ونربط التأصيل الشرعي بالبحث العلمي والخبرة التطبيقية؛ لتحويل المعرفة إلى ممارسات قابلة للتنفيذ ونتائج قابلة للتقييم، بما يرتقي بالأداء والخدمات، ويسهم في التنمية وتحقيق المصالح العامة.",
  missionEn: "We produce decision-support knowledge, develop policies and solutions responsive to needs and challenges, train leaders, and build institutional capacities. We assist in establishing organizations and developing their management and governance systems, linking Islamic grounding with scientific research and applied expertise to translate knowledge into actionable practices and measurable outcomes—elevating performance and services, and advancing development and the public interest.",
  approachIntroAr: "ننطلق من فهم الاحتياجات وتحديد الفجوات بين الواقع والنتائج المستهدفة، ونجمع بين التأصيل الشرعي والتحليل العلمي والخبرة العملية؛ لتطوير حلول تستند إلى الأدلة، وتناسب السياق والإمكانات، مع دعم تنفيذها وتقييم أثرها وتحسينها.",
  approachIntroEn: "We start by understanding needs and identifying gaps between current reality and targeted outcomes, combining Islamic grounding, scientific analysis, and practical experience to develop evidence-based solutions tailored to context and resources, while supporting execution, evaluating impact, and driving continuous improvement.",
  steps: DEFAULT_STEPS,
  values: DEFAULT_VALUES,
};

/** Stored content is a partial override: any missing or blank field falls back to the default. */
export function mergeAbout(stored: Partial<AboutContent> | null | undefined): AboutContent {
  const out: Record<string, unknown> = { ...DEFAULT_ABOUT };
  for (const [k, v] of Object.entries(stored ?? {})) {
    if (!(k in DEFAULT_ABOUT)) continue;
    if (Array.isArray(v)) { if (v.length > 0) out[k] = v; }
    else if (typeof v === "string" && (v.trim() !== "" || k.endsWith("ImageUrl") || k === "imageUrl")) out[k] = v;
  }
  return out as unknown as AboutContent;
}
