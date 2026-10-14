import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { ExploreCard } from "@/components/explore-card";

const DOMAINS = [
  {
    href: "/unit/sharia",
    ar: {
      title: "الشريعة",
      desc: "تأصيل ومراجعة المسائل ذات الصلة بعمل المؤسسة، وتطوير الحوكمة والتوافق الشرعي والإجراءات.",
    },
    en: {
      title: "Sharia",
      desc: "Grounding and reviewing matters relevant to the organization's work, and developing governance, Sharia compliance and procedures.",
    },
  },
  {
    href: "/unit/policy",
    ar: {
      title: "السياسات والإدارة العامة",
      desc: "تحليل القضايا الشأن العام وتصميم السياسات وتنفيذها، وتطوير إدارة المؤسسات والخدمات العامة والموارد والبرامج، ودراسة البدائل والقيمة العامة.",
    },
    en: {
      title: "Public Policy and Administration",
      desc: "Analyzing public affairs issues, designing and implementing policies, and developing public institution management, public services, resources and programmes, and studying alternatives and public value.",
    },
  },
  {
    href: "/unit/leadership",
    ar: {
      title: "القيادة والإدارة والحوكمة",
      desc: "تطوير القيادة والاستراتيجية وبناء المؤسسات، وتحسين الهياكل والحوكمة والمساءلة والعمليات وإدارة الأداء والتغيير، بما يدعم التنفيذ والتطوير المؤسسي.",
    },
    en: {
      title: "Leadership, Management and Governance",
      desc: "Developing leadership, strategy and institution-building, and improving structures, governance, accountability, processes, performance management and change — supporting institutional execution and development.",
    },
  },
];

export default function ServicesConsulting() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "الاستشارات" : "Consulting"}
        title={isAr ? "الاستشارات" : "Consulting"}
        subtitle={isAr
          ? "استشارات في الشريعة والسياسات والإدارة العامة والقيادة والإدارة والحوكمة، تدعم الفرار وتطوير السياسات والمؤسسات."
          : "Consulting in Sharia, public policy and public administration, leadership, management and governance — supporting decision-making and institutional development."}
      />

      {/* Consulting Domains */}
      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-10">
            {isAr ? "محالات الاستشارات" : "Consulting Areas"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {DOMAINS.map((d) => (
              <ExploreCard
                key={d.href}
                href={d.href}
                title={isAr ? d.ar.title : d.en.title}
                desc={isAr ? d.ar.desc : d.en.desc}
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
              ? "تشخيص استشارية، بدائل وتوصيات، سياسات وأدلة عمل، وخطة تطوير بحسب الاتفاق."
              : "Diagnostic memo, alternatives and recommendations, policies and operational guides, and a development plan per agreement."}
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mb-10">
            {isAr
              ? "الجهات العامة والشركات والمؤسسات ذات الدور الاستراتيجي في التنمية والخدمات."
              : "Public entities, companies and institutions with a strategic role in development and services."}
          </p>
          <Link
            href="/service-registration?service=consulting"
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
