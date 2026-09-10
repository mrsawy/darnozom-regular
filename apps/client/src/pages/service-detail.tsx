import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Scale, Briefcase, Laptop, Lightbulb, GraduationCap,
  FileText, Languages, ShoppingCart, ChevronLeft,
  CheckCircle2, ArrowLeft, Mail, Phone,
  Settings, Users, Target, PenTool, Rocket, TrendingUp,
  Landmark, Coins, Handshake, HeartHandshake, Map,
  Database, ShieldCheck, Brain, Sparkles, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/site-nav";
import NotFound from "@/pages/not-found";
import { useLanguage } from "@/lib/language-context";
import { getCaseStudiesByService } from "@/lib/case-studies";
import { SiteFooter } from "@/components/site-footer";

interface Bilingual { ar: string; en: string }

interface ServiceDomain {
  icon: React.ReactNode;
  title: Bilingual;
  promise: Bilingual;
  bullets: Bilingual[];
  bulletColumns?: 1 | 2;
}

interface MethodStep {
  title: Bilingual;
  description: Bilingual;
}

interface ServiceData {
  slug: string;
  title: Bilingual;
  subtitle: string;
  listingLabel?: Bilingual;
  icon: React.ReactNode;
  overview: Bilingual;
  offerings?: Bilingual[];
  value: Bilingual;
  color: string;
  pov?: Bilingual;
  approachIntro?: Bilingual;
  domains?: ServiceDomain[];
  methodTitle?: Bilingual;
  methodIntro?: Bilingual;
  method?: MethodStep[];
  closingCta?: Bilingual;
}

const services: Record<string, ServiceData> = {
  "islamic-systems": {
    slug: "islamic-systems",
    title: { ar: "أنظمة الحوكمة والامتثال الشرعي", en: "Shariah Governance & Compliance Systems" },
    subtitle: "Shariah Governance & Compliance Systems",
    icon: <Scale size={48} />,
    overview: {
      ar: "نُساعد المؤسسات على بناء نظم إسلامية متكاملة — من الحوكمة الشرعية إلى التمويل والأخلاق والمسؤولية الاجتماعية — بمنهجية موحّدة تربط الالتزام الشرعي بالأداء المؤسسي.",
      en: "We help institutions build integrated Islamic systems — from Sharia governance to finance, ethics, and social responsibility — with a unified methodology that connects Sharia compliance to institutional performance.",
    },
    pov: {
      ar: "لم تعد النظم الإسلامية خيارًا تكميليًا لمؤسسات المنطقة، بل أصبحت ركيزة استراتيجية تُحدّد ثقة العملاء، والقدرة على الوصول إلى الأسواق الإسلامية، والامتثال للمتطلبات التنظيمية المتنامية. غير أن كثيرًا من المؤسسات تتعامل معها كقرارات شرعية متفرقة — فتوى هنا، عقد هناك — بدل أن تبنيها كمنظومة متكاملة تربط الحوكمة الشرعية بالتمويل والثقافة والمسؤولية الاجتماعية. والمؤسسات التي ستتقدّم في العقد القادم هي التي تُحوّل القيم الإسلامية إلى أنظمة عمل قابلة للتدقيق والتطوير.",
      en: "Islamic systems are no longer a complementary option for organizations in the region — they have become a strategic foundation that shapes customer trust, access to Islamic markets, and compliance with growing regulatory expectations. Yet many institutions still treat them as isolated Sharia decisions — a fatwa here, a contract there — instead of building them as an integrated framework that connects Sharia governance to finance, culture, and social responsibility. The institutions that will lead the next decade are those that translate Islamic values into auditable, evolving operating systems.",
    },
    approachIntro: {
      ar: "النظم الإسلامية الفعّالة لا تُبنى بمبادرات معزولة — بل بمواءمة بين أربعة مجالات متكاملة تربط الفقه بالحوكمة، والعقد بالعملية، والقيمة بالأداء.",
      en: "Effective Islamic systems are not built through isolated initiatives. They require alignment across four integrated domains that connect fiqh to governance, contracts to operations, and values to performance.",
    },
    domains: [
      {
        icon: <Landmark size={22} />,
        title: { ar: "الحوكمة الشرعية والامتثال", en: "Sharia Governance & Compliance" },
        promise: {
          ar: "نُؤسّس مرجعية شرعية واضحة، ونُرسّخ ضوابط ورقابة قابلة للتدقيق على كل قرار.",
          en: "We establish a clear Sharia reference and embed auditable controls over every decision.",
        },
        bullets: [
          { ar: "تصميم أنظمة الحوكمة الشرعية المؤسسية", en: "Institutional Sharia governance system design" },
          { ar: "بناء منظومات الامتثال الشرعي وإطار الضوابط", en: "Sharia compliance framework & control mechanisms" },
          { ar: "التدقيق والمراجعة الشرعية الدورية", en: "Periodic Sharia audit & review" },
          { ar: "بناء منظومة الفتوى المؤسسية", en: "Institutional fatwa framework" },
        ],
      },
      {
        icon: <Coins size={22} />,
        title: { ar: "التمويل والاستثمار الإسلامي", en: "Islamic Finance & Investments" },
        promise: {
          ar: "نُصمّم منتجات ومحافظ متوافقة شرعًا — قابلة للتسويق والتشغيل والمراجعة.",
          en: "We design Sharia-compliant products and portfolios — marketable, operable, and auditable.",
        },
        bulletColumns: 2,
        bullets: [
          { ar: "نماذج التمويل الإسلامي للشركات والبنوك", en: "Islamic finance models for corporates & banks" },
          { ar: "نظام البورصة والاستثمارات الإسلامية", en: "Islamic stock market & investment system" },
          { ar: "تصميم أنظمة التأمين التكافلي", en: "Takaful (cooperative insurance) systems" },
          { ar: "العقود الشرعية (مرابحة · مضاربة · مشاركة · إجارة · استصناع)", en: "Sharia contracts (Murabaha · Mudaraba · Musharaka · Ijara · Istisna)" },
          { ar: "آليات الزكاة المؤسسية والوقف المعاصر", en: "Institutional Zakat & contemporary Waqf mechanisms" },
        ],
      },
      {
        icon: <Handshake size={22} />,
        title: { ar: "دورة الحياة المؤسسية والتحكيم", en: "Corporate Lifecycle & Arbitration" },
        promise: {
          ar: "نُنظّم العلاقات بين الشركاء — من التأسيس إلى التصفية — بإطار شرعي عادل وقابل للتنفيذ.",
          en: "We structure partner relationships — from founding to liquidation — within a fair, enforceable Sharia framework.",
        },
        bullets: [
          { ar: "التأسيس وانضمام الشركاء وفق الضوابط الشرعية", en: "Founding & partner onboarding under Sharia governance" },
          { ar: "تنظيم الشراكات والانفصال والتصفية الشرعية", en: "Partnerships, dissolution & Sharia-compliant liquidation" },
          { ar: "التحكيم الشرعي وفض النزاعات المالية", en: "Sharia arbitration & financial dispute resolution" },
        ],
      },
      {
        icon: <HeartHandshake size={22} />,
        title: { ar: "المقصد والثقافة والمسؤولية الاجتماعية", en: "Purpose, Culture & Social Responsibility" },
        promise: {
          ar: "نُحوّل القيم الإسلامية إلى ثقافة معاشة، وأثر اجتماعي ملموس، وقدرات بشرية متجدّدة.",
          en: "We turn Islamic values into lived culture, tangible social impact, and continuously developed capabilities.",
        },
        bullets: [
          { ar: "مواءمة المقصد الاستراتيجي مع القيم الإسلامية", en: "Strategic purpose alignment with Islamic values" },
          { ar: "نظام الثقافة الإسلامية وميثاق الأخلاق المؤسسية", en: "Islamic culture system & corporate code of ethics" },
          { ar: "نظام المسؤولية الاجتماعية المؤسسية", en: "Institutional social responsibility system" },
          { ar: "برامج تدريبية وتأهيلية في النظم الإسلامية", en: "Sharia systems training & enablement programs" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل ارتباط شرعي يتبع مساراً منضبطاً من أربع خطوات، يربط بين الاجتهاد الفقهي والتطبيق المؤسسي.",
      en: "Every Sharia engagement follows a disciplined four-step path that links fiqh judgment to institutional execution.",
    },
    method: [
      {
        title: { ar: "تشخيص شرعي", en: "Sharia Diagnose" },
        description: {
          ar: "تقييم شامل لمستوى الالتزام الشرعي والثغرات في الحوكمة والعقود والثقافة — بناءً على أدلة لا انطباعات.",
          en: "Comprehensive assessment of Sharia compliance, governance, contracts, and culture gaps — evidence-based, not opinion-based.",
        },
      },
      {
        title: { ar: "تصميم النظم", en: "Design Systems" },
        description: {
          ar: "بناء أطر الحوكمة والعقود والسياسات الشرعية، بالشراكة مع هيئة الفتوى وفريق القيادة.",
          en: "Build Sharia governance, contracts, and policy frameworks — co-created with the fatwa board and leadership team.",
        },
      },
      {
        title: { ar: "تطبيق وتمكين", en: "Implement & Enable" },
        description: {
          ar: "تنفيذ مدمج مع تأهيل الفرق، وإصدار الفتاوى التشغيلية، وضبط المسؤوليات على كل مستوى.",
          en: "Embedded rollout with team enablement, operational fatwa issuance, and clear accountability at every level.",
        },
      },
      {
        title: { ar: "تدقيق واستدامة", en: "Audit & Sustain" },
        description: {
          ar: "مراجعة شرعية دورية، ومؤشرات امتثال، وآليات تحديث تجعل النظام حيًّا ومتطوّرًا مع تطوّر المؤسسة.",
          en: "Periodic Sharia audit, compliance KPIs, and update mechanisms that keep the system living and evolving with the institution.",
        },
      },
    ],
    closingCta: {
      ar: "اعقد شراكتك مع دار نظم لبناء منظومة شرعية متكاملة تُحوّل قيمك إلى ميزة تنافسية مؤسسية.",
      en: "Partner with DarNozom to build an integrated Sharia system that turns your values into a lasting institutional advantage.",
    },
    value: {
      ar: "نساعد المؤسسات على العمل بثقة ووضوح من خلال أنظمة شرعية متكاملة تقلل المخاطر وتعزز الاستقرار.",
      en: "We help organizations operate with confidence and clarity through integrated Sharia systems that reduce risks and enhance stability.",
    },
    color: "from-primary to-primary/80",
  },
  "management-systems": {
    slug: "management-systems",
    title: { ar: "بناء مؤسسات عالية الأداء", en: "Building High-Performance Organizations" },
    subtitle: "Management",
    listingLabel: { ar: "الإدارة", en: "Management" },
    icon: <Briefcase size={48} />,
    overview: {
      ar: "نعمل جنبًا إلى جنب مع فرق القيادة لرسم الاستراتيجية، وقيادة التحول، وبناء مؤسسات تحقق نتائج مستدامة وقابلة للقياس.",
      en: "We partner with leadership teams to define strategy, drive transformation, and build organizations that deliver sustained, measurable results.",
    },
    pov: {
      ar: "تنمو المؤسسات في المنطقة بوتيرة أسرع مما تستطيع نماذجها التشغيلية استيعابه. وتُسهم ضغوط التكلفة، ومتطلبات التوطين المتسقة مع الرؤى الوطنية، وارتفاع سقف توقعات الحوكمة، في كشف هشاشة العمليات وضبابية المسؤوليات. والمؤسسات التي ستقود العقد القادم هي تلك التي تعيد بناء طريقة عملها — لا مجرد ما تقدمه.",
      en: "Regional organizations are scaling faster than their operating models can absorb. Cost pressure, Vision-aligned localization, and rising governance expectations are exposing fragmented processes and unclear accountability. The institutions that will lead the next decade are the ones rebuilding how they operate — not just what they do.",
    },
    approachIntro: {
      ar: "الأداء المستدام يتطلب أكثر من مبادرات معزولة — يتطلب مواءمة بين العناصر الجوهرية للمؤسسة. لذلك نعمل عبر أربعة مجالات متكاملة لضمان ترجمة الاستراتيجية إلى تنفيذ، والحفاظ على هذا الأداء على المدى البعيد.",
      en: "Sustained performance requires more than isolated initiatives. It requires alignment across the core elements of the organization. We work across four integrated domains to ensure that strategy is translated into execution — and sustained over time.",
    },
    domains: [
      {
        icon: <Target size={22} />,
        title: { ar: "الاستراتيجية", en: "Strategy" },
        promise: {
          ar: "نُحدّد أين نتنافس وكيف ننتصر — بمسارٍ واضح للنمو وخلق القيمة.",
          en: "We define where to compete and how to win — establishing a clear path to growth and value creation.",
        },
        bullets: [
          { ar: "استراتيجية الشركة والنمو", en: "Corporate & growth strategy" },
          { ar: "دخول الأسواق والتوسع", en: "Market entry & expansion" },
          { ar: "الاندماج والاستحواذ", en: "M&A" },
          { ar: "استراتيجية التحول والابتكار", en: "Transformation & innovation strategy" },
          { ar: "التموضع التنافسي وتصميم القيمة المقدمة", en: "Competitive positioning & value proposition design" },
        ],
      },
      {
        icon: <Settings size={22} />,
        title: { ar: "الإدارة والعمليات", en: "Management & Operations" },
        promise: {
          ar: "نُصمّم نماذج تشغيلية تُحقّق الكفاءة والقابلية للتوسع والأداء المتسق.",
          en: "We design operating models that deliver efficiency, scalability, and consistent performance.",
        },
        bullets: [
          { ar: "النموذج التشغيلي والتصميم التنظيمي", en: "Operating model & org design" },
          { ar: "تحسين التكلفة وبرامج رفع الكفاءة", en: "Cost optimization & efficiency programs" },
          { ar: "سلسلة الإمداد والأداء التشغيلي", en: "Supply chain & operational performance" },
          { ar: "إعادة تصميم العمليات وإدارة الأداء", en: "Process redesign & performance management" },
          { ar: "التميز التشغيلي", en: "Operational excellence" },
        ],
      },
      {
        icon: <Laptop size={22} />,
        title: { ar: "الأنظمة والتقنية", en: "Systems & Technology" },
        promise: {
          ar: "نُمكّن المؤسسات بأنظمة وبيانات وقدرات رقمية متكاملة — لضمان الوضوح والتحكم والقابلية للتوسع.",
          en: "We enable organizations through integrated systems, data, and digital capabilities — ensuring visibility, control, and scalability.",
        },
        bulletColumns: 2,
        bullets: [
          { ar: "أنظمة تشغيلية متكاملة عبر الوظائف الجوهرية", en: "Integrated operating systems across core functions" },
          { ar: "أنظمة الابتكار وتطوير المنتجات", en: "Innovation & product development systems" },
          { ar: "أنظمة رأس المال البشري والمالية والتجارية", en: "Human capital / finance / commercial systems" },
          { ar: "أنظمة تخطيط موارد المؤسسة (SAP · Oracle)", en: "ERP & enterprise platforms (SAP, Oracle)" },
          { ar: "التحول الرقمي والأتمتة", en: "Digital transformation & automation" },
          { ar: "تمكين البيانات والتحليلات", en: "Data & analytics enablement" },
          { ar: "بنية تقنية المعلومات والأمن السيبراني", en: "IT architecture & cybersecurity" },
        ],
      },
      {
        icon: <Users size={22} />,
        title: { ar: "رأس المال البشري", en: "People" },
        promise: {
          ar: "نبني قدرات القيادة ونُحقق المواءمة المؤسسية لاستدامة الأداء والتحول.",
          en: "We build leadership capabilities and align organizations to sustain performance and transformation.",
        },
        bullets: [
          { ar: "تنمية القيادات", en: "Leadership development" },
          { ar: "ثقافة المؤسسة والمواءمة", en: "Organizational culture & alignment" },
          { ar: "استراتيجية المواهب والقوى العاملة", en: "Talent & workforce strategy" },
          { ar: "أنظمة الأداء والحوافز", en: "Performance & incentive systems" },
          { ar: "إدارة التغيير", en: "Change management" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "تتبع كل ارتباط معنا مساراً منضبطاً من أربع خطوات، مُصمَّماً لتحويل البصيرة إلى أداء راسخ.",
      en: "Every engagement follows a disciplined four-step path designed to translate insight into lasting performance.",
    },
    method: [
      {
        title: { ar: "تشخيص", en: "Diagnose" },
        description: {
          ar: "خط أساس قائم على الحقائق يغطي الاستراتيجية والعمليات والأنظمة والإنسان — لكشف القيود الحقيقية لا الأعراض.",
          en: "Fact-based baseline across strategy, operations, systems, and people. Surfacing the real constraints, not the symptoms.",
        },
      },
      {
        title: { ar: "تصميم", en: "Design" },
        description: {
          ar: "نموذج تشغيلي مستهدف وخارطة طريق، نُصمّمها بالشراكة مع فريق القيادة وبما يلائم سياق المؤسسة.",
          en: "Target operating model and roadmap, co-created with the leadership team and tailored to the institution's context.",
        },
      },
      {
        title: { ar: "تنفيذ", en: "Deliver" },
        description: {
          ar: "تنفيذ مشترك مع فرق مدمجة، مع وضوح في المسؤوليات ونقل للقدرات في كل خطوة.",
          en: "Joint execution with embedded teams, clear ownership, and capability transfer at every step.",
        },
      },
      {
        title: { ar: "استدامة", en: "Sustain" },
        description: {
          ar: "حوكمة ومؤشرات أداء وإيقاع تشغيلي يجعل التغيير دائماً ومتجذراً في المؤسسة.",
          en: "Governance, KPIs, and performance rhythms that make the change permanent.",
        },
      },
    ],
    closingCta: {
      ar: "اعقد شراكتك معنا لرسم استراتيجيتك، وتحويل عملياتك، وبناء مؤسسة عالية الأداء.",
      en: "Partner with us to define your strategy, transform your operations, and build a high-performing organization.",
    },
    value: {
      ar: "تمكين المؤسسات من تحقيق أداء مستدام، ووضوح في القرار، ونمو يتجدد عبر الزمن.",
      en: "Empowering organizations to achieve sustained performance, decision clarity, and growth that compounds over time.",
    },
    color: "from-primary to-primary/80",
  },
  "digital-transformation": {
    slug: "digital-transformation",
    title: { ar: "التحول الرقمي", en: "Digital Transformation" },
    subtitle: "Digital Transformation",
    icon: <Laptop size={48} />,
    overview: {
      ar: "نُمكّن المؤسسات من التحول إلى منظومات رقمية ذكية ومتكاملة — تربط الاستراتيجية بالأنظمة، والبيانات بالقرار، والأتمتة بالأداء.",
      en: "We enable organizations to transform into intelligent, integrated digital ecosystems — connecting strategy to systems, data to decisions, and automation to performance.",
    },
    pov: {
      ar: "أصبح التحول الرقمي شرطًا للبقاء، لا ميزة تنافسية. غير أن أغلب المبادرات الرقمية في المنطقة تتعثّر — ليس بسبب التقنية، بل بسبب غياب البنية المؤسسية، وضعف حوكمة البيانات، وتنفيذ مُجزّأ لأنظمة لا تتحدّث مع بعضها. والمؤسسات التي ستتقدّم في العقد القادم هي التي تبني التحول الرقمي كمنظومة واحدة: بنية تخطيط موارد مؤسسية موحّدة، وبيانات موثوقة، وذكاء اصطناعي مدمج في القرار، وأمن سيبراني مُؤسَّس من اليوم الأول.",
      en: "Digital transformation is now a condition for survival, not a competitive edge. Yet most regional digital initiatives stall — not because of technology, but because of weak institutional architecture, fragmented data governance, and disconnected systems. The institutions that will lead the next decade are the ones building digital transformation as one integrated stack: a unified ERP backbone, trustworthy data, AI embedded in decisions, and cybersecurity engineered in from day one.",
    },
    approachIntro: {
      ar: "التحول الرقمي المستدام لا يُبنى بمشاريع متفرقة — بل بمواءمة بين أربعة مجالات متكاملة تربط الاستراتيجية بالمنصات، والبيانات بالذكاء، والأتمتة بالأمن.",
      en: "Sustainable digital transformation isn't built through isolated projects. It requires alignment across four integrated domains that connect strategy to platforms, data to intelligence, and automation to security.",
    },
    domains: [
      {
        icon: <Map size={22} />,
        title: { ar: "الاستراتيجية وخارطة الطريق", en: "Strategy & Roadmap" },
        promise: {
          ar: "نُحدّد أين يجب أن تتحوّل المؤسسة أولًا، وكيف نقود التحول بحوكمة واضحة وقياس مستمر.",
          en: "We define where the organization must transform first, and how to lead the change with clear governance and continuous measurement.",
        },
        bullets: [
          { ar: "تقييم النضج الرقمي للمؤسسة", en: "Digital maturity assessment" },
          { ar: "تصميم خارطة طريق التحول الرقمي", en: "Digital transformation roadmap design" },
          { ar: "بناء نموذج الحوكمة الرقمية ومكتب التحول", en: "Digital governance model & transformation office" },
          { ar: "إدارة التغيير الرقمي وثقافة التحول", en: "Digital change management & transformation culture" },
        ],
      },
      {
        icon: <Settings size={22} />,
        title: { ar: "المنصات وتخطيط موارد المؤسسة", en: "Platforms & ERP" },
        promise: {
          ar: "نُؤسّس عمودًا فقريًا مؤسسيًا موحّدًا — كشريك معتمد لـ Odoo — يربط المالية والعمليات والعملاء والموارد البشرية في منظومة واحدة.",
          en: "We establish a unified enterprise backbone — as an Official Odoo Partner — that connects finance, operations, customers, and HR into one system.",
        },
        bulletColumns: 2,
        bullets: [
          { ar: "تنفيذ Odoo (شريك معتمد) للمؤسسات الناشئة والمتوسطة", en: "Odoo implementation (Official Partner) for SMEs & mid-market" },
          { ar: "تنفيذ SAP و Oracle للمؤسسات الكبرى", en: "SAP & Oracle implementation for large enterprises" },
          { ar: "اختيار وتطبيق CRM · HRIS · LMS", en: "CRM · HRIS · LMS selection & rollout" },
          { ar: "بنية الأنظمة المؤسسية والتكامل بينها", en: "Enterprise systems architecture & integration" },
          { ar: "تطوير تطبيقات الجوال والويب المخصصة", en: "Custom mobile & web application development" },
        ],
      },
      {
        icon: <Database size={22} />,
        title: { ar: "البيانات والتحليلات والذكاء الاصطناعي", en: "Data, Analytics & AI" },
        promise: {
          ar: "نُحوّل البيانات إلى قرار، ولوحات المعلومات إلى أداة قيادة، والذكاء الاصطناعي إلى ميزة تشغيلية.",
          en: "We turn data into decisions, dashboards into leadership tools, and AI into an operational advantage.",
        },
        bullets: [
          { ar: "حوكمة البيانات وجودتها وإدارتها", en: "Data governance, quality & management" },
          { ar: "لوحات معلومات تنفيذية وتحليلات Power BI", en: "Executive dashboards & Power BI analytics" },
          { ar: "تطبيقات الذكاء الاصطناعي والتعلم الآلي للأعمال", en: "Applied AI & machine-learning use-cases for business" },
          { ar: "دمج أدوات الذكاء الاصطناعي في تدفقات العمل اليومية", en: "Embedding AI tools into daily workflows" },
        ],
      },
      {
        icon: <ShieldCheck size={22} />,
        title: { ar: "الأتمتة والسحابة والأمن السيبراني", en: "Automation, Cloud & Cybersecurity" },
        promise: {
          ar: "نُسرّع العمليات، ونُعيد بناء البنية على السحابة، ونحمي المؤسسة بإطار أمني معتمد دوليًا.",
          en: "We accelerate operations, rebuild infrastructure on the cloud, and protect the organization with an internationally aligned security framework.",
        },
        bulletColumns: 2,
        bullets: [
          { ar: "أتمتة العمليات (RPA · سير العمل · أتمتة المستندات)", en: "Process automation (RPA · workflow · document automation)" },
          { ar: "بنية السحابة والترحيل (Cloud Architecture & Migration)", en: "Cloud architecture & migration" },
          { ar: "تقييم المخاطر السيبرانية وإطار الأمن السيبراني", en: "Cyber risk assessment & cybersecurity framework" },
          { ar: "حماية المعلومات والامتثال (ISO 27001 · NIST)", en: "Information protection & compliance (ISO 27001 · NIST)" },
          { ar: "خطط الاستجابة للحوادث واستمرارية الأعمال (BCP · DR)", en: "Incident response & business continuity plans (BCP · DR)" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل ارتباط رقمي يتبع مساراً منضبطاً من أربع خطوات، يربط بين الرؤية والتنفيذ والقياس.",
      en: "Every digital engagement follows a disciplined four-step path that connects vision, execution, and measurement.",
    },
    method: [
      {
        title: { ar: "تقييم", en: "Assess" },
        description: {
          ar: "خط أساس قائم على الحقائق لمستوى النضج الرقمي والبيانات والأنظمة والمخاطر — لكشف الفجوات الحقيقية والأولويات.",
          en: "Fact-based baseline of digital maturity, data, systems, and risk — surfacing real gaps and priorities.",
        },
      },
      {
        title: { ar: "تصميم البنية", en: "Architect" },
        description: {
          ar: "بنية مستهدفة وخارطة طريق متكاملة للأنظمة والبيانات والذكاء والأمن — مُصمَّمة بالشراكة مع القيادة.",
          en: "Target architecture and integrated roadmap for systems, data, intelligence, and security — co-created with leadership.",
        },
      },
      {
        title: { ar: "تطبيق", en: "Implement" },
        description: {
          ar: "تنفيذ مدمج للمنصات والبيانات والذكاء الاصطناعي والأتمتة، مع إدارة تغيير وتأهيل في كل خطوة.",
          en: "Embedded rollout of platforms, data, AI, and automation — with change management and enablement at every step.",
        },
      },
      {
        title: { ar: "توسعة واستدامة", en: "Scale & Sustain" },
        description: {
          ar: "حوكمة ومؤشرات أداء وتحسين مستمر يجعل التحول دائمًا ومتجدّدًا بدل أن يكون مشروعًا منتهيًا.",
          en: "Governance, KPIs, and continuous optimization that make transformation permanent and evolving — not a finished project.",
        },
      },
    ],
    closingCta: {
      ar: "اعقد شراكتك مع دار نظم لبناء منظومة رقمية متكاملة — من تخطيط الموارد إلى الذكاء الاصطناعي والأمن السيبراني — تُحوّل التقنية إلى ميزة تنافسية مستدامة.",
      en: "Partner with DarNozom to build an integrated digital stack — from ERP to AI to cybersecurity — that turns technology into a sustained competitive advantage.",
    },
    value: {
      ar: "تحقيق سرعة وكفاءة أعلى، وتعزيز القدرة التنافسية للمؤسسة.",
      en: "Achieving higher speed and efficiency, and enhancing the organization's competitive capacity.",
    },
    color: "from-primary to-primary/80",
  },
  consulting: {
    slug: "consulting",
    title: { ar: "الاستشارات", en: "Consulting" },
    subtitle: "Consulting",
    icon: <Lightbulb size={48} />,
    overview: {
      ar: "نقدم خدمات استشارية متخصصة تجمع بين البعد الشرعي والإداري، مع التركيز على الحلول العملية القابلة للتطبيق.",
      en: "We provide specialized consulting services combining the Sharia and managerial dimensions, focusing on practical and applicable solutions.",
    },
    pov: {
      ar: "كثير من المؤسسات في المنطقة تستعين بمستشارين في عزلة — فتوى شرعية هنا، دراسة إدارية هناك، وخطة تحول رقمي في ملف ثالث — فتتراكم التوصيات دون أن تتحول إلى أداء حقيقي. والمؤسسات التي تتقدّم اليوم هي التي تختار شريكاً استشارياً واحداً يربط البعد الشرعي بالإداري والرقمي في منظومة قرار واحدة، ويرافقها من التشخيص حتى الأثر.",
      en: "Many institutions in the region engage advisors in isolation — a fatwa here, a management study there, a digital roadmap somewhere else — and recommendations pile up without ever turning into real performance. The organizations pulling ahead today are those that choose a single advisory partner who connects the Sharia, managerial, and digital dimensions into one decision system, and stays with them from diagnosis through impact.",
    },
    approachIntro: {
      ar: "الاستشارات الفعّالة لا تُقدَّم كتوصيات منفصلة — بل عبر أربع ممارسات متكاملة تربط الشرعي بالإداري والرقمي والقيادي في قرار واحد.",
      en: "Effective consulting is not delivered as scattered recommendations. It is built across four integrated practices that connect Sharia, management, digital, and leadership into one decision.",
    },
    domains: [
      {
        icon: <Landmark size={22} />,
        title: { ar: "ممارسة الحوكمة الشرعية", en: "Sharia Governance Practice" },
        promise: {
          ar: "نُؤطّر القرارات الشرعية في منظومة حوكمة واضحة — قابلة للتدقيق ومتسقة مع متطلبات التنظيم.",
          en: "We frame Sharia decisions inside a clear governance system — auditable and aligned with regulatory expectations.",
        },
        bullets: [
          { ar: "مراجعة المنتجات والعقود شرعيًا", en: "Sharia review of products & contracts" },
          { ar: "هياكل هيئات الفتوى والرقابة", en: "Sharia board & oversight structures" },
          { ar: "تقييم الامتثال الشرعي", en: "Sharia compliance assessments" },
        ],
      },
      {
        icon: <Settings size={22} />,
        title: { ar: "ممارسة الإدارة والعمليات", en: "Management & Operations Practice" },
        promise: {
          ar: "نُعيد تصميم النموذج التشغيلي والعمليات لتحقيق كفاءة وأداء مستدامين.",
          en: "We redesign operating models and processes to deliver sustained efficiency and performance.",
        },
        bullets: [
          { ar: "النموذج التشغيلي والهيكل التنظيمي", en: "Operating model & org design" },
          { ar: "إعادة هندسة العمليات وإدارة الأداء", en: "Process redesign & performance management" },
          { ar: "تحسين التكلفة والكفاءة التشغيلية", en: "Cost optimization & operational efficiency" },
        ],
      },
      {
        icon: <TrendingUp size={22} />,
        title: { ar: "ممارسة تطوير الأداء والاستراتيجية", en: "Performance & Strategy Practice" },
        promise: {
          ar: "نُحوّل الطموح الاستراتيجي إلى خارطة طريق واضحة ومؤشرات أداء قابلة للقياس.",
          en: "We turn strategic ambition into a clear roadmap and measurable performance indicators.",
        },
        bullets: [
          { ar: "صياغة الاستراتيجية وخارطة الطريق", en: "Strategy formulation & roadmap" },
          { ar: "تصميم بطاقات الأداء المتوازن (KPIs)", en: "Balanced scorecard & KPI design" },
          { ar: "تقييم النضج المؤسسي والمقارنات المرجعية", en: "Institutional maturity & benchmarking" },
        ],
      },
      {
        icon: <Rocket size={22} />,
        title: { ar: "ممارسة التحول المؤسسي", en: "Institutional Transformation Practice" },
        promise: {
          ar: "نقود رحلات التحول من الفكرة إلى الأثر — مع إدارة تغيير وتأهيل لفرق العمل في كل خطوة.",
          en: "We lead transformation journeys from idea to impact — with change management and team enablement at every step.",
        },
        bullets: [
          { ar: "إدارة برامج التحول الكبرى (PMO)", en: "Major transformation program management (PMO)" },
          { ar: "إدارة التغيير وتأهيل القيادات", en: "Change management & leadership enablement" },
          { ar: "إعادة هيكلة المؤسسات وتطوير الثقافة", en: "Org restructuring & culture development" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل ارتباط استشاري يتبع مساراً منضبطاً من أربع خطوات — يربط التشخيص بالتنفيذ، والتوصية بالأثر.",
      en: "Every advisory engagement follows a disciplined four-step path — connecting diagnosis to execution, and recommendation to impact.",
    },
    method: [
      {
        title: { ar: "تشخيص", en: "Diagnose" },
        description: {
          ar: "تشخيص قائم على الحقائق يكشف القيود الحقيقية لا الأعراض — ويُحدّد الأولويات.",
          en: "Fact-based diagnosis that surfaces the real constraints — not symptoms — and prioritizes them.",
        },
      },
      {
        title: { ar: "تصميم الحل", en: "Design the Solution" },
        description: {
          ar: "تصميم تشاركي للحل مع فريق القيادة — قابل للتنفيذ ومتوافق مع سياق المؤسسة.",
          en: "Co-designed solution with the leadership team — executable and tailored to the institution's context.",
        },
      },
      {
        title: { ar: "تنفيذ مدمج", en: "Embedded Delivery" },
        description: {
          ar: "تنفيذ جنباً إلى جنب مع فرق العميل، ونقل للقدرات في كل خطوة.",
          en: "Side-by-side execution with the client teams, and capability transfer at every step.",
        },
      },
      {
        title: { ar: "متابعة الأثر", en: "Track Impact" },
        description: {
          ar: "مؤشرات أثر واضحة ومراجعة دورية تجعل التوصية تتحوّل إلى نتيجة دائمة.",
          en: "Clear impact KPIs and periodic review that turn recommendations into lasting outcomes.",
        },
      },
    ],
    closingCta: {
      ar: "اعقد شراكتك مع دار نظم لاستشارات تجمع الشرعي والإداري والرقمي في قرار واحد — وتُحوّل التوصية إلى أثر.",
      en: "Partner with DarNozom for advisory that unites Sharia, management, and digital into one decision — and turns recommendation into impact.",
    },
    value: {
      ar: "حلول متكاملة تعالج جذور التحديات وتحقق نتائج ملموسة.",
      en: "Integrated solutions that address the root causes of challenges and achieve tangible results.",
    },
    color: "from-primary to-primary/80",
  },
  academy: {
    slug: "academy",
    title: { ar: "أكاديمية دار نظم", en: "DarNozom Academy" },
    subtitle: "Dar Nozom Academy",
    icon: <GraduationCap size={48} />,
    overview: {
      ar: "تقدم أكاديمية دار نظم برامج تدريبية متخصصة تهدف إلى تطوير الأفراد وبناء قيادات قادرة على الجمع بين القيم والاحتراف.",
      en: "DarNozom Academy offers specialized training programs aimed at developing individuals and building leaders capable of combining values with professionalism.",
    },
    pov: {
      ar: "تواجه المؤسسات في المنطقة فجوة قيادية حقيقية: قادة يفهمون الإدارة الحديثة لكن يفتقرون للعمق الشرعي، أو علماء يمتلكون البصيرة الشرعية دون أدوات الإدارة المعاصرة. ولم تعد البرامج التدريبية العامة كافية لسدّ هذه الفجوة. والمؤسسات التي ستقود العقد القادم هي التي تستثمر في إعداد قيادات تجمع بين الأصالة الشرعية والاحتراف الإداري — في مسارات تأهيل منظّمة لا في دورات متناثرة.",
      en: "Organizations in the region face a real leadership gap: leaders who understand modern management but lack Sharia depth, or scholars with Sharia insight but without contemporary management tools. Generic training programs are no longer enough to close this gap. The institutions that will lead the next decade are those that invest in leaders who combine Sharia authenticity with managerial professionalism — through structured tracks, not scattered courses.",
    },
    approachIntro: {
      ar: "التأهيل الفعّال لا يُبنى بدورات معزولة — بل بمسارات متكاملة تُغطّي العمق الشرعي، والاحتراف الإداري، والتخصص القطاعي، والتدريب المؤسسي المصمّم حسب الحاجة.",
      en: "Effective development is not built through isolated courses. It requires integrated tracks that cover Sharia depth, managerial professionalism, sector specialization, and tailored in-house training.",
    },
    domains: [
      {
        icon: <Landmark size={22} />,
        title: { ar: "مسار النظم الإسلامية", en: "Islamic Systems Track" },
        promise: {
          ar: "نُؤهّل القيادات في الحوكمة الشرعية والتمويل الإسلامي وأخلاقيات المؤسسة.",
          en: "We develop leaders in Sharia governance, Islamic finance, and corporate ethics.",
        },
        bullets: [
          { ar: "النظم الإسلامية العامة للقيادات", en: "General Islamic Systems for leaders" },
          { ar: "النظم الإسلامية المتخصصة (تمويل · حوكمة · أوقاف)", en: "Specialized Islamic Systems (finance · governance · waqf)" },
          { ar: "أخلاقيات المؤسسة والمسؤولية الاجتماعية", en: "Corporate ethics & social responsibility" },
        ],
      },
      {
        icon: <Briefcase size={22} />,
        title: { ar: "مسار الإدارة المهنية", en: "Professional Management Track" },
        promise: {
          ar: "نُمكّن المديرين بأدوات الإدارة الحديثة — من الاستراتيجية إلى التنفيذ.",
          en: "We equip managers with modern management tools — from strategy to execution.",
        },
        bullets: [
          { ar: "أساسيات الإدارة والقيادة", en: "Management & leadership fundamentals" },
          { ar: "إدارة الأداء والمشاريع", en: "Performance & project management" },
          { ar: "مهارات القيادة التنفيذية", en: "Executive leadership skills" },
        ],
      },
      {
        icon: <Map size={22} />,
        title: { ar: "المسارات القطاعية المتخصصة", en: "Specialized Sector Tracks" },
        promise: {
          ar: "نُصمّم محتوى تأهيلياً يلامس واقع كل قطاع — عام، أعمال، حكومي، غير ربحي.",
          en: "We tailor learning content to the reality of each sector — general, business, government, and non-profit.",
        },
        bulletColumns: 2,
        bullets: [
          { ar: "مسار الإدارة العامة", en: "General management track" },
          { ar: "مسار إدارة الأعمال", en: "Business management track" },
          { ar: "مسار الإدارة الحكومية", en: "Government management track" },
          { ar: "مسار إدارة المؤسسات غير الربحية", en: "Non-profit management track" },
        ],
      },
      {
        icon: <Users size={22} />,
        title: { ar: "التدريب المؤسسي المصمَّم", en: "Custom In-House Training" },
        promise: {
          ar: "نُصمّم برامج تدريبية داخلية تُعالج تحديات مؤسستك المحدّدة وترفع قدرات فرقك.",
          en: "We design in-house programs that address your organization's specific challenges and lift your teams' capabilities.",
        },
        bullets: [
          { ar: "تحليل احتياجات التدريب", en: "Training needs analysis" },
          { ar: "تصميم منهج مخصّص للمؤسسة", en: "Custom curriculum design" },
          { ar: "تنفيذ حضوري ورقمي وتقييم أثر", en: "Onsite / digital delivery & impact assessment" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل برنامج تأهيلي يتبع مساراً منضبطاً من أربع خطوات — يربط المعرفة بالتطبيق والشهادة بالأثر.",
      en: "Every program follows a disciplined four-step path — connecting knowledge to practice and certification to impact.",
    },
    method: [
      {
        title: { ar: "تشخيص الفجوة", en: "Diagnose the Gap" },
        description: {
          ar: "تشخيص دقيق لاحتياجات المتعلّمين والمؤسسة، وتحديد فجوات القدرات الحقيقية.",
          en: "Precise diagnosis of learner and institutional needs, identifying real capability gaps.",
        },
      },
      {
        title: { ar: "تصميم المنهج", en: "Design the Curriculum" },
        description: {
          ar: "بناء منهج تدريبي يدمج العمق الشرعي والاحتراف الإداري وحالات التطبيق الواقعية.",
          en: "Build a curriculum that integrates Sharia depth, management professionalism, and real applied cases.",
        },
      },
      {
        title: { ar: "تنفيذ وتأهيل", en: "Deliver & Enable" },
        description: {
          ar: "تنفيذ تفاعلي عبر مدرّبين خبراء، مع تمارين تطبيقية ومتابعة فردية.",
          en: "Interactive delivery by expert instructors, with applied exercises and individual follow-up.",
        },
      },
      {
        title: { ar: "تقييم وشهادة", en: "Assess & Certify" },
        description: {
          ar: "تقييم موضوعي للأداء، ومنح شهادات معتمدة، ومتابعة أثر التدريب على الأداء المؤسسي.",
          en: "Objective performance assessment, accredited certification, and follow-up on training impact at the institutional level.",
        },
      },
    ],
    closingCta: {
      ar: "ارتقِ بقياداتك مع أكاديمية دار نظم — حيث تلتقي الأصالة الشرعية بالاحتراف الإداري في مسارات تأهيل تصنع قادة المستقبل.",
      en: "Elevate your leaders with DarNozom Academy — where Sharia authenticity meets management professionalism in learning tracks that shape future leaders.",
    },
    value: {
      ar: "إعداد كوادر مؤهلة تمتلك المعرفة والمهارات اللازمة لقيادة المؤسسات بفعالية.",
      en: "Developing qualified professionals with the knowledge and skills necessary to lead organizations effectively.",
    },
    color: "from-primary to-primary/80",
  },
  research: {
    slug: "research",
    title: { ar: "البحث والتأليف", en: "Research & Authoring" },
    subtitle: "Research & Development",
    icon: <FileText size={48} />,
    overview: {
      ar: "يمثل البحث العلمي أحد الركائز الأساسية في دار نظم، حيث نعمل على تطوير المعرفة في مجالات النظم الإسلامية والإدارية.",
      en: "Scientific research is one of DarNozom's core pillars, as we work on developing knowledge in the fields of Islamic and management systems.",
    },
    pov: {
      ar: "تعتمد كثير من المؤسسات في قراراتها على ممارسات مستوردة لا تأخذ بعين الاعتبار السياق الشرعي ولا الواقع الإقليمي. وتفتقر المكتبة العربية إلى مرجعيات علمية حديثة تربط بين الأصول الشرعية وأفضل الممارسات الإدارية المعاصرة. والمؤسسات التي تصنع المرجعية اليوم هي التي تستثمر في بحث علمي رصين، وتأليف منهجي، ونشر تحليلي مستمر يُسهم في تشكيل الفكر الإداري والشرعي للمنطقة.",
      en: "Many organizations base their decisions on imported practices that ignore both the Sharia context and regional realities. The Arabic library lacks modern scholarly references that bridge Sharia foundations with contemporary management best practices. The institutions shaping the reference today are those investing in rigorous research, methodical authoring, and ongoing analytical publishing that helps form the management and Sharia thinking of the region.",
    },
    approachIntro: {
      ar: "الإنتاج العلمي الفعّال لا يقوم على جهود فردية متفرّقة — بل على منظومة بحث وتأليف ونشر متكاملة، تربط الأصول الشرعية بالممارسات الإدارية المعاصرة.",
      en: "Effective scholarly output is not built on scattered individual efforts. It is built on an integrated research, authoring, and publishing system that bridges Sharia foundations with contemporary management practice.",
    },
    domains: [
      {
        icon: <Lightbulb size={22} />,
        title: { ar: "الأبحاث العلمية المتخصصة", en: "Specialized Research" },
        promise: {
          ar: "نُنتج أبحاثاً رصينة في النظم الإسلامية والإدارية — مبنية على منهجية علمية واضحة.",
          en: "We produce rigorous research in Islamic & management systems — grounded in a clear scholarly methodology.",
        },
        bullets: [
          { ar: "أبحاث الحوكمة الشرعية والتمويل الإسلامي", en: "Sharia governance & Islamic finance research" },
          { ar: "أبحاث الإدارة والقيادة المؤسسية", en: "Management & institutional leadership research" },
          { ar: "دراسات حالة قطاعية", en: "Sectoral case studies" },
        ],
      },
      {
        icon: <PenTool size={22} />,
        title: { ar: "التأليف العلمي", en: "Scholarly Authoring" },
        promise: {
          ar: "نُؤلّف كتباً مرجعية ودراسات منهجية تُثري المكتبة العربية في مجالات تخصصنا.",
          en: "We author reference books and methodical studies that enrich the Arabic library in our specialty areas.",
        },
        bullets: [
          { ar: "تأليف الكتب المرجعية", en: "Authoring reference books" },
          { ar: "إعداد الأدلة المنهجية للممارسين", en: "Producing practitioner methodology guides" },
          { ar: "تطوير مناهج تأهيلية", en: "Developing training curricula" },
        ],
      },
      {
        icon: <FileText size={22} />,
        title: { ar: "المقالات وأوراق السياسات", en: "Articles & Policy Papers" },
        promise: {
          ar: "نُقدّم تحليلاً موجزاً ومركّزاً لصانعي القرار حول القضايا الراهنة.",
          en: "We deliver focused, concise analysis for decision-makers on current issues.",
        },
        bullets: [
          { ar: "مقالات تحليلية دورية", en: "Periodic analytical articles" },
          { ar: "أوراق سياسات وتوصيات للجهات التنظيمية", en: "Policy papers & recommendations for regulators" },
          { ar: "ملخصات تنفيذية للقيادات", en: "Executive briefs for leadership" },
        ],
      },
      {
        icon: <Database size={22} />,
        title: { ar: "المجلة والمنصة العلمية", en: "Journal & Scholarly Platform" },
        promise: {
          ar: "نُصدر مجلة علمية محكّمة، ونبني منصة معرفية تجمع الإنتاج العلمي في موضع واحد.",
          en: "We publish a peer-reviewed journal and build a knowledge platform that brings scholarly output together in one place.",
        },
        bullets: [
          { ar: "مجلة علمية محكّمة دورية", en: "Periodic peer-reviewed journal" },
          { ar: "منصة رقمية للأبحاث والدراسات", en: "Digital research & studies platform" },
          { ar: "شراكات بحثية مع المراكز والجامعات", en: "Research partnerships with centers & universities" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل عمل بحثي يتبع مساراً علمياً منضبطاً من أربع خطوات — يربط السؤال البحثي بالمرجعية، والتحليل بالنشر.",
      en: "Every research project follows a disciplined four-step scholarly path — connecting the research question to reference, and analysis to publishing.",
    },
    method: [
      {
        title: { ar: "تحديد السؤال والنطاق", en: "Define Question & Scope" },
        description: {
          ar: "تحديد دقيق للسؤال البحثي ونطاقه — بناءً على الحاجة المؤسسية أو الفجوة المعرفية.",
          en: "Precisely define the research question and scope — driven by institutional need or knowledge gap.",
        },
      },
      {
        title: { ar: "بحث ومراجعة", en: "Research & Review" },
        description: {
          ar: "مراجعة شاملة للأدبيات الشرعية والإدارية، وجمع البيانات، وتحليلها بمنهجية رصينة.",
          en: "Comprehensive review of Sharia and management literature, data collection, and rigorous analysis.",
        },
      },
      {
        title: { ar: "تحكيم علمي", en: "Peer Review" },
        description: {
          ar: "تحكيم العمل عبر لجنة علمية متخصصة لضمان الجودة المنهجية والدقة المرجعية.",
          en: "Peer-review by a specialized scholarly committee to ensure methodological quality and reference accuracy.",
        },
      },
      {
        title: { ar: "نشر وأثر", en: "Publish & Impact" },
        description: {
          ar: "نشر العمل عبر القنوات المناسبة، ومتابعة أثره المعرفي والمؤسسي.",
          en: "Publish through the appropriate channels and track scholarly and institutional impact.",
        },
      },
    ],
    closingCta: {
      ar: "اشترك مع دار نظم في إنتاج المعرفة — لتأليف وأبحاث تصنع المرجعية وتدعم قرارك المؤسسي.",
      en: "Partner with DarNozom in producing knowledge — authoring and research that shape the reference and support your institutional decisions.",
    },
    value: {
      ar: "توفير مرجعية علمية تدعم تطوير الأنظمة وصناعة القرار.",
      en: "Providing a scientific reference that supports system development and decision-making.",
    },
    color: "from-primary to-primary/80",
  },
  publishing: {
    slug: "publishing",
    title: { ar: "الترجمة والنشر", en: "Translation & Publishing" },
    subtitle: "Translation & Publishing",
    icon: <Languages size={48} />,
    overview: {
      ar: "نعمل على نقل وتوطين المعرفة العالمية في مجالات الإدارة والحوكمة بما يتوافق مع القيم الإسلامية.",
      en: "We work on transferring and localizing global knowledge in the fields of management and governance in alignment with Islamic values.",
    },
    pov: {
      ar: "تتسارع وتيرة الإنتاج المعرفي العالمي في الإدارة والحوكمة والتقنية، في حين يبقى المتاح منه باللغة العربية محدوداً ومتأخراً سنوات عن المرجع الأصلي. والترجمة الحرفية وحدها لا تكفي — فالمعرفة المستوردة دون توطين تُنتج ممارسات مقطوعة عن السياق. والمؤسسات التي تكسر هذه الفجوة هي التي تستثمر في ترجمة أمينة، وتوطين معرفي يُعيد صياغة المفاهيم وفق القيم الإسلامية والواقع الإقليمي، ونشر احترافي يصل إلى القارئ بجودة عالية.",
      en: "Global knowledge production in management, governance, and technology is accelerating, while what's available in Arabic remains limited and years behind the original references. Literal translation alone is not enough — imported knowledge without localization produces practices disconnected from context. The institutions that close this gap are those investing in faithful translation, knowledge localization that reframes concepts within Islamic values and regional reality, and professional publishing that reaches readers with high quality.",
    },
    approachIntro: {
      ar: "نقل المعرفة الفعّال لا يقف عند الترجمة — بل يمتد عبر أربع مراحل متكاملة: انتقاء المرجع، الترجمة الأمينة، التوطين السياقي، والنشر الاحترافي.",
      en: "Effective knowledge transfer doesn't stop at translation. It spans four integrated stages: reference selection, faithful translation, contextual localization, and professional publishing.",
    },
    domains: [
      {
        icon: <Lightbulb size={22} />,
        title: { ar: "انتقاء المراجع", en: "Reference Selection" },
        promise: {
          ar: "نختار من الإنتاج العالمي ما يُضيف فعلاً للمكتبة العربية ويخدم احتياج المؤسسات في المنطقة.",
          en: "We select from global output what truly adds to the Arabic library and serves the needs of institutions in the region.",
        },
        bullets: [
          { ar: "رصد أحدث الإصدارات العالمية", en: "Tracking the latest global publications" },
          { ar: "تقييم الأهمية والملاءمة الشرعية", en: "Assessing relevance & Sharia compatibility" },
          { ar: "التفاوض على حقوق الترجمة والنشر", en: "Negotiating translation & publishing rights" },
        ],
      },
      {
        icon: <Languages size={22} />,
        title: { ar: "الترجمة الأمينة", en: "Faithful Translation" },
        promise: {
          ar: "نُترجم بأمانة علمية تحافظ على المعنى الأصلي مع جودة لغوية عربية رفيعة.",
          en: "We translate with scholarly fidelity that preserves original meaning with high Arabic linguistic quality.",
        },
        bullets: [
          { ar: "مترجمون متخصصون في كل مجال", en: "Specialist translators in each domain" },
          { ar: "ضبط المصطلحات الفنية والشرعية", en: "Calibrating technical & Sharia terminology" },
          { ar: "مراجعة لغوية متعدّدة الطبقات", en: "Multi-layer linguistic review" },
        ],
      },
      {
        icon: <HeartHandshake size={22} />,
        title: { ar: "التوطين السياقي", en: "Contextual Localization" },
        promise: {
          ar: "نُعيد صياغة المفاهيم لتلائم القيم الإسلامية والواقع الإقليمي — دون تشويه الأصل.",
          en: "We reframe concepts to fit Islamic values and regional reality — without distorting the original.",
        },
        bullets: [
          { ar: "مواءمة الأمثلة وحالات الدراسة", en: "Adapting examples & case studies" },
          { ar: "مراجعة شرعية للمحتوى الحسّاس", en: "Sharia review of sensitive content" },
          { ar: "إضافة هوامش وشروح للسياق العربي", en: "Adding footnotes & commentary for the Arab context" },
        ],
      },
      {
        icon: <FileText size={22} />,
        title: { ar: "النشر والطباعة والتوزيع", en: "Publishing, Printing & Distribution" },
        promise: {
          ar: "نُصدر العمل بإخراج احترافي ونوصله للقارئ عبر قنوات نشر متعدّدة — ورقياً ورقمياً.",
          en: "We publish with professional production and reach readers through multiple channels — print and digital.",
        },
        bullets: [
          { ar: "تصميم وإخراج فني احترافي", en: "Professional design & art direction" },
          { ar: "طباعة عالية الجودة", en: "High-quality printing" },
          { ar: "توزيع ورقي ورقمي عبر المنصات", en: "Print & digital distribution across platforms" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل عمل ترجمي ونشري يتبع مساراً منضبطاً من أربع خطوات — يربط الأصالة بالأمانة، والتوطين بالجودة.",
      en: "Every translation and publishing project follows a disciplined four-step path — connecting authenticity to fidelity, and localization to quality.",
    },
    method: [
      {
        title: { ar: "انتقاء", en: "Select" },
        description: {
          ar: "اختيار المرجع بناءً على أهميته العلمية وملاءمته السياقية وحاجة السوق.",
          en: "Select the reference based on scholarly importance, contextual fit, and market need.",
        },
      },
      {
        title: { ar: "ترجمة", en: "Translate" },
        description: {
          ar: "ترجمة أمينة بفريق متخصص، مع ضبط المصطلحات وحفظ روح النص الأصلي.",
          en: "Faithful translation by a specialist team, with terminology calibration and preservation of the original spirit.",
        },
      },
      {
        title: { ar: "توطين ومراجعة", en: "Localize & Review" },
        description: {
          ar: "توطين سياقي ومراجعة شرعية ولغوية متعدّدة الطبقات لضمان الجودة والملاءمة.",
          en: "Contextual localization with multi-layer Sharia and linguistic review to ensure quality and fit.",
        },
      },
      {
        title: { ar: "نشر وتوزيع", en: "Publish & Distribute" },
        description: {
          ar: "إخراج احترافي، طباعة عالية الجودة، وتوزيع ورقي ورقمي يصل للقارئ.",
          en: "Professional production, high-quality printing, and print + digital distribution that reaches the reader.",
        },
      },
    ],
    closingCta: {
      ar: "اعقد شراكتك مع دار نظم لنقل أفضل المعرفة العالمية إلى مكتبتك ومؤسستك — بأمانة علمية وتوطين سياقي.",
      en: "Partner with DarNozom to bring the best of global knowledge into your library and institution — with scholarly fidelity and contextual localization.",
    },
    value: {
      ar: "ربط المؤسسات بأفضل الممارسات العالمية في إطار قيمي متوازن.",
      en: "Connecting organizations to global best practices within a balanced value framework.",
    },
    color: "from-primary to-primary/80",
  },
  store: {
    slug: "store",
    title: { ar: "المتجر الإلكتروني", en: "Online Store" },
    subtitle: "Online Store",
    icon: <ShoppingCart size={48} />,
    overview: {
      ar: "نوفر منتجات معرفية وتطبيقية تساعد الأفراد والمؤسسات على تطوير أعمالهم بشكل عملي.",
      en: "We provide knowledge and applied products that help individuals and organizations develop their work in a practical manner.",
    },
    pov: {
      ar: "كثير من الممارسين والمدراء يصلون إلى الاستشارة عندما تتأزّم الأمور — في حين أن أغلب القرارات اليومية تحتاج فقط إلى أداة جاهزة، نموذج موثّق، أو دليل عملي مختصر يُسرّع التنفيذ ويقلّل التجربة والخطأ. والمؤسسات الذكية اليوم لا تكتفي بالاستشارات الكبرى — بل تبني مكتبة عمل من الأدوات والنماذج الجاهزة التي ترفع جودة القرار في كل مستوى، ويُمكن للفرق استخدامها بشكل مستقل.",
      en: "Many practitioners and managers reach out for consulting only when things escalate — yet most day-to-day decisions just need a ready tool, a documented template, or a concise practical guide that accelerates execution and reduces trial-and-error. Smart organizations today don't only rely on major consulting engagements; they build an operating library of ready tools and templates that lift decision quality at every level — usable by teams independently.",
    },
    approachIntro: {
      ar: "متجرنا ليس مجرد رفوف للبيع — بل مكتبة عمل منظّمة حول أربع فئات منتجات تخدم كل مستويات صنع القرار في المؤسسة.",
      en: "Our store isn't just shelves for sale — it's an operating library organized around four product categories that serve every decision-making level in the organization.",
    },
    domains: [
      {
        icon: <FileText size={22} />,
        title: { ar: "الأدلة والكتيّبات الإدارية", en: "Guides & Management Handbooks" },
        promise: {
          ar: "نُلخّص خبرات استشارية متراكمة في أدلة عملية مختصرة — مرجع سريع لكل تحدٍ إداري.",
          en: "We distill accumulated consulting expertise into concise practical guides — a quick reference for every management challenge.",
        },
        bullets: [
          { ar: "أدلة الحوكمة والامتثال", en: "Governance & compliance guides" },
          { ar: "أدلة الإدارة والقيادة", en: "Management & leadership guides" },
          { ar: "كتيّبات سريعة في موضوعات متخصصة", en: "Quick handbooks on specialized topics" },
        ],
      },
      {
        icon: <PenTool size={22} />,
        title: { ar: "النماذج والقوالب الجاهزة", en: "Ready Templates" },
        promise: {
          ar: "نماذج وثائقية مكتملة وقابلة للتخصيص — توفّر أسابيع من العمل من الصفر.",
          en: "Complete, customizable document templates — saving weeks of work from scratch.",
        },
        bulletColumns: 2,
        bullets: [
          { ar: "نماذج السياسات والإجراءات", en: "Policy & procedure templates" },
          { ar: "قوالب التقارير والعروض التنفيذية", en: "Report & executive presentation templates" },
          { ar: "نماذج العقود الشرعية الجاهزة", en: "Ready Sharia contract templates" },
          { ar: "قوالب الوصف الوظيفي وبطاقات الأداء", en: "Job description & scorecard templates" },
        ],
      },
      {
        icon: <Database size={22} />,
        title: { ar: "أدوات التشخيص والتقييم", en: "Diagnostic & Assessment Tools" },
        promise: {
          ar: "أدوات تقييم ذاتي تُتيح للمؤسسات قياس نضجها وكشف فجواتها — قبل اللجوء للاستشارة.",
          en: "Self-assessment tools that let organizations measure maturity and surface gaps — before turning to consulting.",
        },
        bullets: [
          { ar: "أداة تقييم النضج الشرعي والإداري", en: "Sharia & management maturity assessment tool" },
          { ar: "أدوات تشخيص الحوكمة والمخاطر", en: "Governance & risk diagnostic tools" },
          { ar: "مؤشرات أداء جاهزة (KPIs)", en: "Ready performance indicators (KPIs)" },
        ],
      },
      {
        icon: <GraduationCap size={22} />,
        title: { ar: "المحتوى التدريبي الرقمي والكتب", en: "Digital Training Content & Books" },
        promise: {
          ar: "محتوى تأهيلي مسجّل ومراجع علمية تصل للقارئ في أي وقت ومن أي مكان.",
          en: "Recorded learning content and scholarly references that reach the reader anytime, anywhere.",
        },
        bullets: [
          { ar: "دورات تدريبية مسجّلة", en: "Recorded training courses" },
          { ar: "كتب رقمية وورقية من إصدار دار نظم", en: "Digital & print books from DarNozom" },
          { ar: "مكتبة محاضرات وندوات", en: "Lecture & seminar library" },
        ],
      },
    ],
    methodTitle: { ar: "منهجية دار نظم", en: "The Darnozom Method" },
    methodIntro: {
      ar: "كل منتج في المتجر يمرّ بمسار منضبط من أربع خطوات — يضمن أن ما تشتريه يحلّ مشكلة فعلية، لا مجرد محتوى نظري.",
      en: "Every product in the store goes through a disciplined four-step path — ensuring what you buy solves a real problem, not just theoretical content.",
    },
    method: [
      {
        title: { ar: "تحديد الحاجة", en: "Identify Need" },
        description: {
          ar: "كل منتج يبدأ من حاجة فعلية رصدناها في ارتباطاتنا الاستشارية أو طلبات العملاء.",
          en: "Every product starts from a real need we observed in our consulting engagements or client requests.",
        },
      },
      {
        title: { ar: "تصميم المحتوى", en: "Design the Content" },
        description: {
          ar: "تصميم المنتج بمنهجية واضحة، وخبرة الفريق الاستشاري، وتنسيق احترافي قابل للاستخدام مباشرة.",
          en: "Design the product with a clear methodology, consulting team expertise, and professional formatting ready for immediate use.",
        },
      },
      {
        title: { ar: "تحكيم وتجربة", en: "Validate & Test" },
        description: {
          ar: "مراجعة شرعية ولغوية، وتجربة المنتج مع عيّنة من المستخدمين قبل النشر العام.",
          en: "Sharia and linguistic review, plus testing the product with a user sample before public release.",
        },
      },
      {
        title: { ar: "إتاحة وتحديث", en: "Deliver & Update" },
        description: {
          ar: "إتاحة المنتج رقمياً أو ورقياً، مع تحديثات دورية تواكب تطوّر الممارسات والتنظيمات.",
          en: "Deliver the product digitally or in print, with periodic updates that keep pace with evolving practices and regulations.",
        },
      },
    ],
    closingCta: {
      ar: "زُر متجر دار نظم لتُجهّز فريقك بأدوات ونماذج جاهزة تختصر الوقت وترفع جودة القرار في كل مستوى.",
      en: "Visit the DarNozom store to equip your team with ready tools and templates that save time and lift decision quality at every level.",
    },
    value: {
      ar: "تمكين المستخدم من التطبيق الفوري للمعرفة داخل مؤسسته.",
      en: "Empowering users to immediately apply knowledge within their organization.",
    },
    color: "from-primary to-primary/80",
  },
};

const serviceOrder = [
  "islamic-systems",
  "management-systems",
  "digital-transformation",
  "consulting",
  "academy",
  "research",
  "publishing",
  "store",
];

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { language, isArabic } = useLanguage();
  const service = slug ? services[slug] : null;

  if (!service) return <NotFound />;

  const currentIndex = serviceOrder.indexOf(slug!);
  const prevSlug = currentIndex > 0 ? serviceOrder[currentIndex - 1] : null;
  const nextSlug = currentIndex < serviceOrder.length - 1 ? serviceOrder[currentIndex + 1] : null;

  const relatedCaseStudies = (slug ? getCaseStudiesByService(slug) : []).slice(0, 3);

  const T = {
    ar: {
      dir: "rtl" as const,
      relatedCaseTitle: "نماذج أعمال ذات صلة",
      relatedCaseCta: "اعرض النموذج كاملاً",
      breadcrumbHome: "الرئيسية",
      breadcrumbServices: "الخدمات",
      whyNowTitle: "لماذا الآن؟",
      approachTitle: "ماذا نقدّم",
      valueTitle: "القيمة المقدمة",
      contactTitle: "تواصل معنا",
      contactDesc: "للاستفسار عن هذه الخدمة أو طلب اجتماع تعريفي، تواصل معنا مباشرة.",
      contactWhatsapp: "تواصل عبر واتساب",
      requestService: "طلب خدمة",
      startNow: "ابدأ الآن",
      startDesc: "المنصة متاحة الآن. سجّل الدخول وابدأ استشارتك الأولى بالذكاء الاصطناعي مباشرةً.",
      startBtn: "ابدأ الاستشارة الذكية",
      startNote: "يتطلب إنشاء حساب مجاني",
      platformCta: "منصة الذكاء الاصطناعي",
      platformDesc: "احصل على تقرير استشاري شامل لمؤسستك في دقائق — باستخدام منصة الذكاء الاصطناعي من دار نظم.",
      platformBtn: "الدخول إلى المنصة",
      otherServices: "خدمات أخرى",
      allServices: "← جميع الخدمات",
      copyright: "جميع الحقوق محفوظة",
    },
    en: {
      dir: "ltr" as const,
      relatedCaseTitle: "Related case studies",
      relatedCaseCta: "View full case",
      breadcrumbHome: "Home",
      breadcrumbServices: "Services",
      whyNowTitle: "Why This Matters Now",
      approachTitle: "What We Do",
      valueTitle: "Value Proposition",
      contactTitle: "Contact Us",
      contactDesc: "For inquiries about this service or to request an introductory meeting, contact us directly.",
      contactWhatsapp: "Contact via WhatsApp",
      requestService: "Request a Service",
      startNow: "Start Now",
      startDesc: "The platform is available now. Log in and start your first AI consulting session immediately.",
      startBtn: "Start AI Consulting",
      startNote: "Requires free account creation",
      platformCta: "AI Platform",
      platformDesc: "Get a comprehensive consulting report for your organization in minutes — using DarNozom's AI platform.",
      platformBtn: "Enter the Platform",
      otherServices: "Other Services",
      allServices: "All Services →",
      copyright: "All rights reserved",
    },
  };

  const t = T[language];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir={t.dir}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-muted-foreground text-xs mb-10 uppercase tracking-widest"
          >
            <Link href="/" className="hover:text-primary transition-colors">{t.breadcrumbHome}</Link>
            <span className="text-border">·</span>
            <Link href="/#services" className="hover:text-primary transition-colors">{t.breadcrumbServices}</Link>
            <span className="text-border">·</span>
            <span className="text-primary">{service.listingLabel?.[language] ?? service.title[language]}</span>
          </motion.div>

          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-10 bg-primary/40" />
              <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
                {service.listingLabel?.[language] ?? service.subtitle}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-medium text-foreground leading-[1.12] mb-6"
              style={{
                fontSize: "clamp(3rem, 6vw, 5rem)",
                fontFamily: isArabic
                  ? "'IBM Plex Sans Arabic', sans-serif"
                  : "Georgia, 'Times New Roman', 'Noto Serif', serif",
              }}
            >
              {service.title[language]}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-lg max-w-2xl leading-relaxed"
            >
              {service.overview[language]}
            </motion.p>
          </div>
        </div>
      </section>

      {slug === "digital-transformation" && (
        <section className="bg-muted/30 border-y border-border py-8" data-testid="odoo-partner-banner">
          <div className="container mx-auto px-6 md:px-12">
            <div className={`flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 ${isArabic ? "md:flex-row-reverse" : ""}`}>
              <img
                src={`${import.meta.env.BASE_URL}odoo-logo.png`}
                alt="Odoo"
                className="h-12 md:h-14 w-auto"
                data-testid="odoo-logo"
              />
              <div className={`${isArabic ? "text-center md:text-right border-secondary md:border-r-2 md:pr-6" : "text-center md:text-left border-secondary md:border-l-2 md:pl-6"}`}>
                <div className="text-secondary text-[11px] font-bold tracking-[0.25em] uppercase mb-1">
                  {isArabic ? "شريك معتمد" : "Official Partner"}
                </div>
                <div className="text-primary font-bold font-serif text-base md:text-lg">
                  {isArabic ? "دار نظم — شريك Odoo المعتمد لتنفيذ تخطيط موارد المؤسسة" : "DarNozom — Official Odoo Partner for ERP Implementation"}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-3 gap-16">

            {/* Offerings */}
            <div className="lg:col-span-2 space-y-16">
              {/* Why This Matters Now (POV pullquote) */}
              {service.pov && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  data-testid="section-why-now"
                >
                  <div className="text-secondary text-[11px] font-bold tracking-[0.25em] uppercase mb-4">
                    {t.whyNowTitle}
                  </div>
                  <div className={`${isArabic ? "border-r-4 pr-6" : "border-l-4 pl-6"} border-secondary`}>
                    <p className="text-foreground text-xl md:text-2xl leading-relaxed font-serif">
                      {service.pov[language]}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Combined: What We Do & How (approach + offerings absorbed) */}
              {(service.domains && service.domains.length > 0) || (service.offerings && service.offerings.length > 0) ? (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  data-testid="section-approach"
                >
                  <h2 className="text-2xl font-bold text-primary mb-2 font-serif flex items-center gap-3">
                    <span className="w-8 h-1 bg-secondary inline-block" />
                    {t.approachTitle}
                  </h2>
                  {service.approachIntro && (
                    <p className="text-muted-foreground mb-8 leading-relaxed max-w-3xl">
                      {service.approachIntro[language]}
                    </p>
                  )}
                  {service.domains && service.domains.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-5">
                    {service.domains.map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-background border border-border p-6 hover:border-secondary/50 transition-colors relative overflow-hidden"
                        data-testid={`domain-card-${i}`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary" />
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-secondary/10 text-secondary flex items-center justify-center">
                            {d.icon}
                          </div>
                          <h3 className="text-lg font-bold text-primary font-serif">
                            {d.title[language]}
                          </h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                          {d.promise[language]}
                        </p>
                        <ul className={`${d.bulletColumns === 2 ? "sm:grid sm:grid-cols-2 sm:gap-x-4" : ""} space-y-2`}>
                          {d.bullets.map((b, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="w-1.5 h-1.5 bg-secondary mt-2 shrink-0" />
                              <span className="leading-relaxed">{b[language]}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {service.offerings!.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.07 }}
                          className="flex items-start gap-3 bg-muted/40 border border-border p-4 hover:border-secondary/50 transition-colors group"
                        >
                          <CheckCircle2 size={20} className="text-secondary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <span className="text-foreground font-medium">{item[language]}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : null}

              {/* The Darnozom Method — 4 numbered steps */}
              {service.method && service.method.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  data-testid="section-method"
                >
                  <h2 className="text-2xl font-bold text-primary mb-2 font-serif flex items-center gap-3">
                    <span className="w-8 h-1 bg-secondary inline-block" />
                    {service.methodTitle ? service.methodTitle[language] : ""}
                  </h2>
                  {service.methodIntro && (
                    <p className="text-muted-foreground mb-8 leading-relaxed max-w-3xl">
                      {service.methodIntro[language]}
                    </p>
                  )}
                  <div className="grid md:grid-cols-4 gap-5">
                    {service.method.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-muted/30 border border-border p-6 relative"
                        data-testid={`method-step-${i}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary text-secondary font-black text-sm flex items-center justify-center mb-4" dir="ltr">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <h3 className="text-base font-bold text-primary font-serif mb-2">
                          {step.title[language]}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {step.description[language]}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Closing CTA paragraph */}
              {service.closingCta && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-primary text-primary-foreground p-8 border-t-2 border-secondary"
                  data-testid="section-closing-cta"
                >
                  <p className="text-lg md:text-xl font-serif leading-relaxed">
                    {service.closingCta[language]}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Value Proposition */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-primary text-primary-foreground p-8 border-r-4 border-secondary"
              >
                <h3 className="text-xl font-bold text-secondary mb-4 font-serif">{t.valueTitle}</h3>
                <p className="text-primary-foreground/90 leading-relaxed text-lg">
                  {service.value[language]}
                </p>
              </motion.div>

              {/* Related Case Studies — up to 3 */}
              {relatedCaseStudies.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 }}
                  className="bg-background border border-secondary/40 p-6 relative overflow-hidden"
                  data-testid="related-cases-block"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary" />
                  <div className="text-secondary text-[10px] font-bold tracking-[0.25em] uppercase mb-4">
                    {t.relatedCaseTitle}
                  </div>
                  <ul className="space-y-5">
                    {relatedCaseStudies.map((cs) => (
                      <li
                        key={cs.id}
                        className="border-b border-border last:border-b-0 pb-5 last:pb-0"
                        data-testid={`related-case-${cs.id}`}
                      >
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 bg-secondary/10 text-secondary border border-secondary/30">
                            {cs.tags.industry[language]}
                          </span>
                          <span className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 bg-muted text-muted-foreground border border-border">
                            {cs.tags.geography[language]}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-primary mb-2 leading-tight font-serif">
                          {cs.title[language]}
                        </h4>
                        <p className="text-muted-foreground text-xs leading-relaxed mb-3 line-clamp-2">
                          {cs.tagline[language]}
                        </p>
                        <Link
                          href={`/case-studies/${cs.id}`}
                          className="inline-flex items-center gap-2 text-secondary font-bold text-xs border-b border-secondary pb-0.5 hover:gap-3 transition-all"
                          data-testid={`related-case-cta-${cs.id}`}
                        >
                          {t.relatedCaseCta}
                          <ArrowLeft size={12} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-secondary/10 border border-secondary/30 p-8"
                  >
                    <h3 className="text-xl font-bold text-primary mb-3 font-serif">{t.contactTitle}</h3>
                    <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                      {t.contactDesc}
                    </p>
                    <div className="space-y-3 mb-6">
                      <a href="https://wa.me/201022044240" target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Phone size={16} className="text-secondary" />
                        <span dir="ltr">+20 102 204 4240</span>
                      </a>
                      <a href="mailto:info@darnozom.com"
                        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Mail size={16} className="text-secondary" />
                        <span dir="ltr">info@darnozom.com</span>
                      </a>
                    </div>
                    <div className="space-y-2">
                      {slug === "consulting" && (
                        <Button className="w-full rounded-none font-bold bg-secondary text-primary hover:bg-secondary/90" asChild>
                          <Link href="/services/consulting/book">
                            <Calendar size={15} className="me-2" />
                            {language === "ar" ? "احجز استشارة عبر Google Meet" : "Book a Consultation via Google Meet"}
                          </Link>
                        </Button>
                      )}
                      <Button className="w-full rounded-none font-bold" asChild>
                        <Link
                          href={`/service-registration?service=${slug}`}
                        >
                          <FileText size={15} className="me-2" />
                          {t.requestService}
                        </Link>
                      </Button>
                      <Button variant="outline" className="w-full rounded-none font-bold" asChild>
                        <a href="https://wa.me/201022044240" target="_blank" rel="noreferrer">
                          {t.contactWhatsapp}
                        </a>
                      </Button>
                    </div>
                  </motion.div>

              {/* Other Services */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="border border-border p-6"
              >
                <h3 className="text-lg font-bold text-primary mb-4 font-serif">{t.otherServices}</h3>
                <div className="space-y-2">
                  {serviceOrder.filter(s => s !== slug).map((s) => (
                    <Link key={s} href={`/services/${s}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:font-medium transition-all group py-1">
                      <ChevronLeft size={14} className="text-secondary group-hover:translate-x-[-2px] transition-transform" />
                      {services[s].title[language]}
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>


      {/* Prev / Next */}
      <section className="py-12 border-t border-border bg-[#F4ECD7]">
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between gap-4">
          {nextSlug ? (
            <Link href={`/services/${nextSlug}`}
              className="flex items-center gap-2 text-primary hover:text-secondary transition-colors font-semibold group">
              <ArrowLeft size={18} className="group-hover:translate-x-[-4px] transition-transform" />
              <span>{services[nextSlug].title[language]}</span>
            </Link>
          ) : <div />}

          <Link href="/#services"
            className="text-sm text-muted-foreground hover:text-primary transition-colors border border-border px-4 py-2 hover:border-primary">
            {t.allServices}
          </Link>

          {prevSlug ? (
            <Link href={`/services/${prevSlug}`}
              className="flex items-center gap-2 text-primary hover:text-secondary transition-colors font-semibold group">
              <span>{services[prevSlug].title[language]}</span>
              <ChevronLeft size={18} className="group-hover:translate-x-[4px] transition-transform" />
            </Link>
          ) : <div />}
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
