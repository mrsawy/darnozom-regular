import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { ExploreCard } from "@/components/explore-card";

const SOLUTIONS = [
  {
    href: "/contact",
    ar: {
      title: "منصات رقمية",
      desc: "أدوات وقوالب وموارد رقمية تساعد على تنظيم المعرفة والعمل وإتخاذ القرار.",
    },
    en: {
      title: "Digital Platforms",
      desc: "Tools, templates and digital resources that support organizing knowledge, work and decision-making.",
    },
  },
  {
    href: "/contact",
    ar: {
      title: "برمجيات",
      desc: "تطوير وتنفيذ برمجيات تدعم العمليات وإدارة الموارد والمعرفة والأداء وفق احتياجات المؤسسة.",
    },
    en: {
      title: "Software",
      desc: "Developing and implementing software that supports operations, resource management, knowledge and performance according to organizational needs.",
    },
  },
  {
    href: "/contact",
    ar: {
      title: "خدمات التحول الرقمي",
      desc: "تشخيص العمليات والاحتياجات الرقمية، وتصميم خطة التحول، وتنفيذ الحلول والتكاملات وتمكين الفريق.",
    },
    en: {
      title: "Digital Transformation Services",
      desc: "Diagnosing processes and digital needs, designing a transformation plan, and implementing solutions, integrations and team enablement.",
    },
  },
];

export default function ServicesDigital() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "نظم بلاتفورم" : "Nozom Platform"}
        title={isAr ? "نظم بلاتفورم" : "Nozom Platform"}
        subtitle={isAr
          ? "حلول رقمية تربط المعرفة والعمليات والبيانات وتحسين التنفيذ والمتابعة."
          : "Digital solutions connecting knowledge, processes and data to improve execution and monitoring."}
      />

      {/* Digital Solutions */}
      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-10">
            {isAr ? "حلول رقمية لتطوير العمل" : "Digital Solutions for Work Development"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {SOLUTIONS.map((s) => (
              <ExploreCard
                key={isAr ? s.ar.title : s.en.title}
                href={s.href}
                title={isAr ? s.ar.title : s.en.title}
                desc={isAr ? s.ar.desc : s.en.desc}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Outputs and cooperation */}
      <section className="py-24 bg-[#F5F0E8] border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            {isAr ? "المخرجات وطريقة التعاون" : "Outputs and Cooperation"}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-2">
            {isAr
              ? "أدوات وتطبيقات وأنظمة، وتكاملات، وخرائط عمليات، وخطط تنفيذ وتمكين."
              : "Tools, applications and systems, integrations, process maps, and implementation and enablement plans."}
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-10">
            {isAr
              ? "المؤسسات والشركات التي تحتاج إلى تطوير العمليات وإدارة المعرفة والأداء."
              : "Institutions and companies seeking better processes, knowledge management and performance."}
          </p>
          <Link
            href="/service-registration?service=digital-transformation"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            {isAr ? "ناقش احتياجك" : "Discuss your needs"}
            <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
