import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Microscope, BookOpen, GraduationCap, Users, Cpu } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const SERVICES = [
  {
    slug: "research",
    href: "/center",
    icon: Microscope,
    ar: {
      title: "البحوث والدراسات",
      desc: "بحوث ودراسات وأوراق سياسات وملفات رصد وتحليل تدعم فهم قضايا الشأن العام.",
    },
    en: {
      title: "Research and Studies",
      desc: "Research, studies, policy papers and monitoring and analysis that support an understanding of public affairs.",
    },
  },
  {
    slug: "publishing",
    href: "/library",
    icon: BookOpen,
    ar: {
      title: "النشر والمعرفة",
      desc: "كتب ومقالات وتقارير وأبحاث ودراسات ودوريات تجمع إنتاج دار نظم والمراجع ذات الصلة بمجالاتها.",
    },
    en: {
      title: "Publishing and Knowledge",
      desc: "Books, articles, reports, research, studies and periodicals bringing together DarNozom outputs and relevant references.",
    },
  },
  {
    slug: "training",
    href: "/academy",
    icon: GraduationCap,
    ar: {
      title: "التدريب وبناء القدرات",
      desc: "دورات وورش عمل وبرامج لتطوير القيادات والمؤسسات، مع إمكان تصميم تدريب لاحتياجات المؤسسات.",
    },
    en: {
      title: "Training and Capacity Building",
      desc: "Courses, workshops and programmes for leaders and institutions, including training tailored to organizational needs.",
    },
  },
  {
    slug: "consulting",
    href: "/services/consulting",
    icon: Users,
    ar: {
      title: "الاستشارات",
      desc: "استشارات في الشريعة والسياسات والإدارة العامة والقيادة والإدارة والحوكمة لفهم التحديات ودراسة البدائل وتطوير السياسات والنظم والعمليات.",
    },
    en: {
      title: "Consulting",
      desc: "Consulting in Sharia, public policy and public administration, leadership, management and governance to understand challenges, assess alternatives and develop policies, systems and processes.",
    },
  },
  {
    slug: "digital",
    href: "/services/digital",
    icon: Cpu,
    ar: {
      title: "البرمجيات والتحول الرقمي",
      desc: "منتجات رقمية وبرمجيات وخدمات تحول رقمي تربط العمليات والبيانات بالقرار وتحسن التنفيذ والمتابعة.",
    },
    en: {
      title: "Software and Digital Transformation",
      desc: "Digital products, software and transformation services connecting processes and data with decisions and improving implementation and monitoring.",
    },
  },
];

export default function Services() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {/* Page Hero */}
      <section className="rerelative pt-12 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(210_40%_96%)] via-[hsl(210_40%_94%)] to-[hsl(210_38%_88%)]idden bg-gradient-to-br from-[hsl(210_40%_96%)] via-[hsl(210_40%_94%)] to-[hsl(210_38%_88%)]">
        <div className="max-w-[1250px] mx-auto px-page relative z-10">
          <div className="flex items-center gap-3 mb-7">
            <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
              {isAr ? "خدماتنا" : "Our Services"}
            </span>
            <div className="h-px w-10 bg-primary/40" />
          </div>
          <h1
            className="font-bold text-foreground leading-[1.12] text-[38px]! mb-6 text-md"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
            }}
          >
            {isAr
              ? "خدمات تدعم المعرفة والقرار والأداء"
              : "Services Supporting Knowledge, Decisions and Performance"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {isAr
              ? "اختر الخدمة الأقرب إلى احتياجك في البحث وبناء القدرات والاستشارات والحلول الرقمية."
              : "Find the service that fits your research, capacity building, consulting or digital needs."}
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24 bg-white border-b border-border ">
        <div className="max-w-[1250px] mx-auto px-page">
          <div className="grid md:grid-cols-2 gap-6">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={s.href}
                  className="group flex flex-col border border-border p-8 h-full hover:border-secondary/60 hover:bg-secondary/5 transition-all"
                  data-testid={`service-card-${s.slug}`}
                >
                  <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-secondary transition-colors">
                    {isAr ? s.ar.title : s.en.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">
                    {isAr ? s.ar.desc : s.en.desc}
                  </p>
                  <span className="inline-flex items-center gap-2 group-hover:text-secondary text-sm font-bold">
                    {isAr ? "اكتشف المزيد" : "Explore more"}
                    <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-24 bg-background">
        <div className="max-w-[1250px] mx-auto px-page">
          <div className="max-w-2xl mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              {isAr ? "لم تجد الخدمة المناسبة؟" : "Need a different service?"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {isAr
                ? "صف لنا احتياجك لنحدد معًا المخرج الأقرب إلى هدفك."
                : "Describe your needs so we can identify the output best suited to your goals."}
            </p>
          </div>
          <Link
            href="/service-registration"
            className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            {isAr ? "أرسل طلبك" : "Send your request"}
            <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
