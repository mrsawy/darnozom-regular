import { useParams, Link } from "wouter";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import NotFound from "@/pages/not-found";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";

interface ServiceData {
  slug: string;
  name: { ar: string; en: string };
  desc: { ar: string; en: string };
  audience: { ar: string; en: string };
  outputs: { ar: string; en: string };
  exploreTo: string;
  request: string;
}

const SERVICES: Record<string, ServiceData> = {
  research: {
    slug: "research",
    name: { ar: "البحوث والدراسات", en: "Research and Studies" },
    desc: {
      ar: "بحوث ودراسات وأوراق سياسات وملفات رصد وتحليل تدعم فهم قضايا الشأن العام.",
      en: "Research, studies, policy papers and monitoring and analysis that support an understanding of public affairs.",
    },
    audience: {
      ar: "الجهات العامة والشركات والمؤسسات والباحثون وصنّاع القرار.",
      en: "Public bodies, companies, institutions, researchers and decision-makers.",
    },
    outputs: {
      ar: "تقرير بحثي، دراسة تطبيقية، ورقة سياسات، مراجعة أدبيات، ملف رصد وتحليل.",
      en: "A research report, applied study, policy paper, literature review, or monitoring and analysis brief.",
    },
    exploreTo: "/center",
    request: "research",
  },
  publishing: {
    slug: "publishing",
    name: { ar: "النشر والمعرفة", en: "Publishing and Knowledge" },
    desc: {
      ar: "كتب ومقالات وتقارير وأبحاث ودراسات ودوريات تجمع إنتاج دار نظم والمراجع ذات الصلة بمجالاتها.",
      en: "Books, articles, reports, research, studies and periodicals bringing together DarNozom outputs and relevant references.",
    },
    audience: {
      ar: "الباحثون والمؤلفون والمؤسسات والمهنيون.",
      en: "Researchers, authors, institutions and professionals.",
    },
    outputs: {
      ar: "محتوى معرفي وكتب ورقية ورقمية، وخدمات تحرير وترجمة ونشر عند إتاحتها.",
      en: "Knowledge resources, print and digital books, and editing, translation and publishing services when available.",
    },
    exploreTo: "/publications",
    request: "research",
  },
  training: {
    slug: "training",
    name: { ar: "التدريب وبناء القدرات", en: "Training and Capacity Building" },
    desc: {
      ar: "دورات وورش عمل وبرامج لتطوير القيادات والمؤسسات، مع إمكان تصميم تدريب لاحتياجات المؤسسات.",
      en: "Courses, workshops and programmes for leaders and institutions, including training tailored to organizational needs.",
    },
    audience: {
      ar: "القيادات والممارسون والمؤسسات العامة والشركات والجهات ذات الدور الاستراتيجي.",
      en: "Leaders, practitioners, public institutions, companies and organizations with a strategic role.",
    },
    outputs: {
      ar: "دورة علمية، ورشة تطبيقية، برنامج مؤسسي، ومواد تدريبية.",
      en: "A course, practical workshop, institutional programme and training materials.",
    },
    exploreTo: "/academy",
    request: "training",
  },
  consulting: {
    slug: "consulting",
    name: { ar: "الاستشارات", en: "Consulting" },
    desc: {
      ar: "استشارات في الشريعة والسياسات والإدارة العامة والقيادة والإدارة والحوكمة لفهم التحديات ودراسة البدائل وتطوير السياسات والنظم والعمليات.",
      en: "Consulting in Sharia, public policy and public administration, leadership, management and governance to understand challenges, assess alternatives and develop policies, systems and processes.",
    },
    audience: {
      ar: "الجهات العامة والشركات والمؤسسات ذات الدور الاستراتيجي في التنمية والخدمات.",
      en: "Public bodies, companies and institutions with a strategic role in development and services.",
    },
    outputs: {
      ar: "تشخيص، مذكرة استشارية، بدائل وتوصيات، سياسات وأدلة عمل، وخطة تطوير بحسب الاتفاق.",
      en: "A diagnostic assessment, advisory memorandum, alternatives and recommendations, policies and operational guides, or a development plan as agreed.",
    },
    exploreTo: "/services/consulting",
    request: "consulting",
  },
  "digital-transformation": {
    slug: "digital-transformation",
    name: { ar: "البرمجيات والتحول الرقمي", en: "Software and Digital Transformation" },
    desc: {
      ar: "منتجات رقمية وبرمجيات وخدمات تحول رقمي تربط العمليات والبيانات بالقرار وتحسن التنفيذ والمتابعة.",
      en: "Digital products, software and transformation services connecting processes and data with decisions and improving implementation and monitoring.",
    },
    audience: {
      ar: "المؤسسات والشركات التي تحتاج إلى تطوير العمليات وإدارة المعرفة والأداء.",
      en: "Institutions and companies seeking better processes, knowledge management and performance.",
    },
    outputs: {
      ar: "أدوات وتطبيقات وأنظمة، وتكاملات، وخرائط عمليات، وخطط تنفيذ وتمكين.",
      en: "Tools, applications, systems and integrations, process maps, implementation plans and team enablement.",
    },
    exploreTo: "/academy/digital-transformation",
    request: "digital-transformation",
  },
};

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const isAr = language === "ar";

  const service = slug ? SERVICES[slug] : null;
  if (!service) return <NotFound />;

  const cooperationText = {
    ar: "نحدد الاحتياج والنطاق والمخرج والجدول مع الجهة صاحبة الطلب. تتحدد الإتاحة والتكلفة بحسب الخدمة والاتفاق.",
    en: "We agree on the need, scope, output and schedule with the requester. Availability and cost depend on the service and agreement.",
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        parents={[{ label: isAr ? "الخدمات" : "Services", href: "/services" }]}
        current={isAr ? service.name.ar : service.name.en}
        title={isAr ? service.name.ar : service.name.en}
        subtitle={isAr ? service.desc.ar : service.desc.en}
      />

      {/* Who Is This Service For? */}
      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            {isAr ? "لمن نقدم الخدمة؟" : "Who Is This Service For?"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {isAr ? service.audience.ar : service.audience.en}
          </p>
        </div>
      </section>

      {/* Expected Outputs */}
      <section className="py-24 bg-background border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            {isAr ? "المخرجات المتوقعة" : "Expected Outputs"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {isAr ? service.outputs.ar : service.outputs.en}
          </p>
        </div>
      </section>

      {/* How Does Cooperation Begin? */}
      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            {isAr ? "كيف يبدأ التعاون؟" : "How Does Cooperation Begin?"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-10">
            {isAr ? cooperationText.ar : cooperationText.en}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/service-registration?service=${service.request}`}
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              {isAr ? "ناقش احتياجك" : "Discuss your needs"}
              <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
            </Link>
            <Link
              href={service.exploreTo}
              className="inline-flex items-center gap-3 border border-primary text-primary px-7 py-4 font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {isAr ? "استكشف المجال" : "Explore the field"}
              <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
