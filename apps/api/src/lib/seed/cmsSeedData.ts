// Content mirrors the approved home reference (DarNozom_Homepage_Reference.png).
// Seeded as published at the client's request; admins replace it from the panel.
import type { FeaturedSlideInput } from "../cms/schemas";

const p = (s: string) => `<p>${s}</p>`;
const org = { authorAr: "دار نظم", authorEn: "DarNozom" };

export const SEED_ITEMS: Record<string, unknown>[] = [
  {
    type: "observatory", slug: "policy-public-affairs-developments", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-04T08:00:00Z", coverImageUrl: "/seed/observatory.webp",
    titleAr: "مستجدات السياسات والإدارة والشأن العام", titleEn: "Developments in Policy, Administration and Public Affairs",
    summaryAr: "قراءات تحليلية لأبرز التطورات في السياسات العامة والإدارة والحوكمة، مع التركيز على دلالاتها المستقبلية.",
    summaryEn: "Analytical readings of key developments in public policy, administration and governance, focusing on their future implications.",
    details: {
      kind: "weekly_review", region: "middle_east", sources: [],
      whatHappenedAr: p("رصد لأبرز القرارات والتوجهات في السياسات العامة والإدارة خلال الفترة الأخيرة."),
      whatHappenedEn: p("A review of the most significant recent decisions and trends in public policy and administration."),
      ourReadingAr: p("تكشف هذه التطورات عن حاجة متزايدة إلى ربط القرار العام بأدلة بحثية ونظم حوكمة واضحة."),
      ourReadingEn: p("These developments show a growing need to link public decisions to research evidence and clear governance systems."),
      researchQuestionsAr: p("كيف يمكن قياس أثر هذه السياسات على جودة الخدمات العامة؟"),
      researchQuestionsEn: p("How can the impact of these policies on public service quality be measured?"),
    },
  },
  {
    type: "observatory", slug: "daily-brief", status: "published", ...org, publishedAt: "2026-10-03T08:00:00Z",
    coverImageUrl: "/seed/daily.webp", titleAr: "الموجز اليومي", titleEn: "Daily Brief",
    summaryAr: "أبرز المستجدات والتحليلات في قضايا السياسات والمؤسسات.",
    summaryEn: "The key developments and analyses on policy and institutional issues.",
    details: { kind: "daily_brief", sources: [] },
  },
  {
    type: "observatory", slug: "research-output-review", status: "published", ...org, publishedAt: "2026-10-02T08:00:00Z",
    coverImageUrl: "/seed/research.webp", titleAr: "الإنتاج الفكري والبحثي", titleEn: "Intellectual and Research Output",
    summaryAr: "مراجعات وقراءات في الإصدارات الجديدة والدراسات الحديثة.",
    summaryEn: "Reviews and readings of new publications and recent studies.",
    details: { kind: "research_output", sources: [] },
  },
  {
    type: "observatory", slug: "follow-up-files", status: "published", ...org, publishedAt: "2026-10-01T08:00:00Z",
    coverImageUrl: "/seed/files.webp", titleAr: "ملفات المتابعة", titleEn: "Follow-up Files",
    summaryAr: "ملفات معمقة حول قضايا محورية في الشأن العام.",
    summaryEn: "In-depth files on pivotal public-affairs issues.",
    details: { kind: "follow_up_file", sources: [] },
  },
  {
    type: "article", slug: "public-value-decision-quality", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-03T09:00:00Z", coverImageUrl: "/seed/articlePolicy.webp",
    titleAr: "القيمة العامة وجودة القرار", titleEn: "Public Value and Decision Quality",
    summaryAr: "نحو قرارات أكثر فاعلية في خدمة الصالح العام.", summaryEn: "Towards more effective decisions that serve the public good.",
    bodyAr: p("تتناول هذه المقالة مفهوم القيمة العامة بوصفه معيارًا لتقويم القرارات العامة، وكيف يمكن للمؤسسات أن تبني قراراتها على أدلة واضحة تخدم الصالح العام."),
    bodyEn: p("This article examines public value as a yardstick for public decisions, and how institutions can ground their decisions in clear evidence that serves the public good."),
    details: { relatedLinks: [] },
  },
  {
    type: "article", slug: "leadership-institution-building", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-02T09:00:00Z", coverImageUrl: "/seed/articleLeadership.webp",
    titleAr: "القيادة وبناء المؤسسات", titleEn: "Leadership and Institution Building",
    summaryAr: "أطر وممارسات لتعزيز كفاءة المؤسسات واستدامة أدائها.", summaryEn: "Frameworks and practices that strengthen institutional efficiency and sustain performance.",
    bodyAr: p("تعرض المقالة أطرًا عملية لدور القيادة في تأسيس المؤسسات وتطوير نظم إدارتها وحوكمتها."),
    bodyEn: p("The article presents practical frameworks for leadership's role in founding institutions and developing their management and governance systems."),
    details: { relatedLinks: [] },
  },
  {
    type: "article", slug: "sharia-grounding-understanding-reality", status: "published", area: "sharia_policy", ...org,
    publishedAt: "2026-10-01T09:00:00Z", coverImageUrl: "/seed/articleSharia.webp",
    titleAr: "التأصيل الشرعي وفهم الواقع", titleEn: "Sharia Grounding and Understanding Reality",
    summaryAr: "مقاربات معاصرة لربط المقاصد الشرعية بالسياسات العامة.", summaryEn: "Contemporary approaches linking the objectives of Sharia to public policy.",
    bodyAr: p("تناقش المقالة كيف يسهم فهم الواقع في تنزيل المقاصد الشرعية على السياسات العامة بصورة منهجية."),
    bodyEn: p("The article discusses how understanding reality helps apply the objectives of Sharia to public policy methodically."),
    details: { relatedLinks: [] },
  },
  {
    type: "study", slug: "governance-public-service-quality", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-03T10:00:00Z", coverImageUrl: "/seed/studyGovernance.webp",
    titleAr: "الحوكمة وجودة الخدمات العامة", titleEn: "Governance and Public Service Quality",
    summaryAr: "دراسة في المبادئ والممارسات الداعمة لتحسين الأداء المؤسسي.", summaryEn: "A study of the principles and practices that improve institutional performance.",
    details: {
      questionAr: p("ما أثر مبادئ الحوكمة على جودة الخدمات العامة؟"), questionEn: p("How do governance principles affect public service quality?"),
      methodAr: p("مراجعة أدبيات وتحليل مقارن لممارسات مؤسسية."), methodEn: p("A literature review and comparative analysis of institutional practices."),
      keywords: ["الحوكمة", "الخدمات العامة"], pdfUrl: "",
    },
  },
  {
    type: "study", slug: "sharia-policy-institution-building", status: "published", area: "sharia_policy", ...org,
    publishedAt: "2026-10-02T10:00:00Z", coverImageUrl: "/seed/studySharia.webp",
    titleAr: "السياسة الشرعية وبناء المؤسسات", titleEn: "Sharia Policy and Institution Building",
    summaryAr: "دراسة تحليلية في الأطر والمفاهيم والتطبيقات المعاصرة.", summaryEn: "An analytical study of frameworks, concepts and contemporary applications.",
    details: {
      questionAr: p("كيف تسهم السياسة الشرعية في بناء مؤسسات فاعلة؟"), questionEn: p("How does Sharia policy contribute to building effective institutions?"),
      keywords: ["السياسة الشرعية", "المؤسسات"], pdfUrl: "",
    },
  },
  {
    type: "publication", slug: "public-policy-report", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-03T11:00:00Z", coverImageUrl: "/seed/pubPolicy.webp",
    titleAr: "السياسات العامة", titleEn: "Public Policy",
    summaryAr: "تقرير يرصد اتجاهات السياسات العامة وأدوات تطويرها.", summaryEn: "A report tracking public policy trends and the tools to develop them.",
    details: { kind: "report", issueNumber: "", pdfUrl: "" },
  },
  {
    type: "publication", slug: "public-administration-periodical", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-02T11:00:00Z", coverImageUrl: "/seed/pubAdmin.webp",
    titleAr: "الإدارة العامة", titleEn: "Public Administration",
    summaryAr: "دورية تعنى بقضايا الإدارة العامة وتطوير الأداء.", summaryEn: "A periodical on public administration and performance development.",
    details: { kind: "periodical", issueNumber: "1", pdfUrl: "" },
  },
  {
    type: "publication", slug: "leadership-governance-research", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-01T11:00:00Z", coverImageUrl: "/seed/pubLeadership.webp",
    titleAr: "القيادة والحوكمة", titleEn: "Leadership and Governance",
    summaryAr: "بحث علمي في نماذج القيادة وأطر الحوكمة المؤسسية.", summaryEn: "Scientific research on leadership models and institutional governance frameworks.",
    details: { kind: "research", issueNumber: "", pdfUrl: "" },
  },
  {
    type: "news", slug: "darnozom-news", status: "published", ...org, publishedAt: "2026-10-04T12:00:00Z",
    coverImageUrl: "/seed/news.webp", titleAr: "جديد دار نظم", titleEn: "What's New at DarNozom",
    summaryAr: "إعلانات ومستجدات حول برامج وإصدارات المؤسسة.", summaryEn: "Announcements and updates on DarNozom's programs and publications.",
    bodyAr: p("تابع أحدث إعلانات دار نظم حول البرامج والإصدارات والأنشطة العلمية والمهنية."),
    bodyEn: p("Follow DarNozom's latest announcements on programs, publications and scholarly and professional activities."),
    details: { relatedLinks: [] },
  },
  {
    type: "event", slug: "public-policy-institutions-seminar", status: "published", area: "public_policy_admin", ...org,
    publishedAt: "2026-10-03T12:00:00Z", coverImageUrl: "/seed/seminar.webp",
    titleAr: "السياسات العامة وتطوير المؤسسات", titleEn: "Public Policy and Institutional Development",
    summaryAr: "ندوة فكرية حول التحديات والفرص في بناء مؤسسات أكثر فاعلية.", summaryEn: "A seminar on the challenges and opportunities of building more effective institutions.",
    details: { kind: "seminar", mode: "in_person", registration: "interest" },
  },
  {
    type: "event", slug: "leadership-governance-workshop", status: "published", area: "leadership_governance", ...org,
    publishedAt: "2026-10-02T12:00:00Z", coverImageUrl: "/seed/workshop.webp",
    titleAr: "القيادة والإدارة والحوكمة", titleEn: "Leadership, Management and Governance",
    summaryAr: "ورشة عمل تطبيقية لتعزيز الممارسات المؤسسية.", summaryEn: "A hands-on workshop to strengthen institutional practices.",
    details: { kind: "workshop", mode: "in_person", registration: "interest" },
  },
];

const slide = (s: Omit<FeaturedSlideInput, "sourceKind" | "contentItemId" | "medusaProductId" | "isActive">): FeaturedSlideInput => ({
  sourceKind: "custom",
  contentItemId: null,
  medusaProductId: null,
  isActive: true,
  ...s,
});

export const SEED_SLIDES: FeaturedSlideInput[] = [
  slide({
    badgeAr: "مشروع بحثي", badgeEn: "Research Project",
    titleAr: "نحو تأسيس علم السياسة الشرعية المعاصرة", titleEn: "Towards a Contemporary Science of Sharia Policy",
    summaryAr: "مشروع بحثي يؤصل المفاهيم ويطور الأطر النظرية والمنهجية لربط السياسة الشرعية بمتطلبات الواقع المؤسسي المعاصر.",
    summaryEn: "A research project that grounds concepts and develops theoretical and methodological frameworks linking Sharia policy to contemporary institutional needs.",
    imageUrl: "/seed/hero.webp", ctaLabelAr: "اكتشف المشروع", ctaLabelEn: "Explore the project", href: "/services/research",
  }),
  slide({
    badgeAr: "برنامج", badgeEn: "Program",
    titleAr: "القيادة والإدارة والحوكمة", titleEn: "Leadership, Management and Governance",
    summaryAr: "برامج تدريبية متخصصة لبناء القدرات القيادية والمؤسسية.", summaryEn: "Specialized training programs that build leadership and institutional capacity.",
    imageUrl: "/seed/academy.webp", ctaLabelAr: "اكتشف البرنامج", ctaLabelEn: "Explore the program", href: "/academy",
  }),
  slide({
    badgeAr: "إصدار", badgeEn: "Publication",
    titleAr: "كتب السياسة الشرعية والإدارة", titleEn: "Books on Sharia Policy and Management",
    summaryAr: "إصدارات علمية ومرجعية في قضايا الشأن العام.", summaryEn: "Scholarly and reference publications on public affairs.",
    imageUrl: "/seed/books.webp", ctaLabelAr: "تصفح الإصدارات", ctaLabelEn: "Browse publications", href: "/publications",
  }),
  slide({
    badgeAr: "حل رقمي", badgeEn: "Digital Solution",
    titleAr: "حلول نظم بلاتفورم", titleEn: "Nozom Platform Solutions",
    summaryAr: "حلول رقمية ومعرفية لدعم العمل المؤسسي ونشر المعرفة.", summaryEn: "Digital and knowledge solutions that support institutional work and spread knowledge.",
    imageUrl: "/seed/digital.webp", ctaLabelAr: "استكشف الحلول", ctaLabelEn: "Explore solutions", href: "/services/digital-transformation",
  }),
];
