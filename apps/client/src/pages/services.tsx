import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, BookOpen, Cpu, Users, Microscope, FileText, GraduationCap, ShoppingBag } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const HIGHLIGHTS = [
  {
    href: "/academy",
    icon: GraduationCap,
    ar: { title: "أكاديمية دار نظم", desc: "برامج تدريبية متخصصة ودبلومات مهنية في النظم الإسلامية والإدارية والقيادية — لتطوير الكوادر وتمكين المؤسسات." , cta: "زيارة الأكاديمية" },
    en: { title: "Darnozom Academy", desc: "Specialized training programs and professional diplomas in Islamic, management and leadership systems — to develop talent and empower organizations.", cta: "Visit Academy" },
  },
  {
    href: "/services/store/books",
    icon: ShoppingBag,
    ar: { title: "متجر الكتب", desc: "كتب متخصصة، دورات تدريبية، وتطبيقات رقمية جاهزة من إصدارات دار نظم — في مكان واحد متكامل.", cta: "زيارة المتجر" },
    en: { title: "Book Store", desc: "Specialized books, training courses, and ready digital apps from Darnozom — all in one integrated marketplace.", cta: "Visit Store" },
  },
];

const SERVICES = [
  {
    slug: "islamic-systems",
    icon: BookOpen,
    ar: { title: "أنظمة الحوكمة والامتثال الشرعي", desc: "تطوير الأنظمة واللوائح المتوافقة مع أحكام الشريعة الإسلامية، من الحوكمة الشرعية إلى المعاملات المالية الإسلامية." },
    en: { title: "Shariah Governance & Compliance Systems", desc: "Developing systems and regulations compliant with Islamic Sharia — from Sharia governance to Islamic financial transactions." },
  },
  {
    slug: "management-systems",
    icon: Briefcase,
    ar: { title: "الإدارة", desc: "تصميم وبناء أنظمة الإدارة المتكاملة، الهياكل التنظيمية، إدارة الأداء، والسياسات والإجراءات." },
    en: { title: "Management", desc: "Designing and building integrated management systems, organizational structures, performance management, and policies & procedures." },
  },
  {
    slug: "digital-transformation",
    icon: Cpu,
    ar: { title: "التحول الرقمي", desc: "قيادة رحلة التحول الرقمي للمؤسسات، من الاستراتيجية الرقمية إلى تطبيقات الذكاء الاصطناعي." },
    en: { title: "Digital Transformation", desc: "Leading institutional digital transformation — from digital strategy to AI applications." },
  },
  {
    slug: "consulting",
    icon: Users,
    ar: { title: "الاستشارات", desc: "استشارات استراتيجية وتشغيلية متخصصة لقطاعات الأوقاف والإفتاء والجمعيات الخيرية والشركات." },
    en: { title: "Consulting", desc: "Specialized strategic and operational consulting for endowments, fatwa centers, charities, and corporates." },
  },
  {
    slug: "research",
    icon: Microscope,
    ar: { title: "البحث والتطوير", desc: "إجراء الدراسات والأبحاث المتخصصة، وتطوير النماذج والمعايير العلمية في النظم الإسلامية والإدارية." },
    en: { title: "Research & Development", desc: "Conducting specialized studies and research, developing scientific models and standards in Islamic and management systems." },
  },
  {
    slug: "publishing",
    icon: FileText,
    ar: { title: "النشر", desc: "نشر الكتب والأبحاث المتخصصة، وإصدار المعايير والأدلة المرجعية في النظم الإسلامية والإدارية." },
    en: { title: "Publishing", desc: "Publishing specialized books, research, standards and reference guides in Islamic and management systems." },
  },
];

export default function Services() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
          <div className="flex items-center gap-3 mb-7">
            <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
              {isAr ? "خدماتنا" : "Our Services"}
            </span>
            <div className="h-px w-10 bg-primary/40" />
          </div>
          <h1 
            className="font-medium text-foreground leading-[1.12] mb-6"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontFamily: isAr
                ? "'IBM Plex Sans Arabic', sans-serif"
                : "Georgia, 'Times New Roman', 'Noto Serif', serif",
            }}
          >
            {isAr ? "حلول استشارية متكاملة" : "Integrated Consulting Solutions"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {isAr
              ? "نقدم منظومة متكاملة من الخدمات الاستشارية تجمع بين الأصالة الشرعية والاحتراف الإداري والتقنية الحديثة."
              : "We deliver an integrated suite of consulting services combining Sharia authenticity, administrative professionalism, and modern technology."}
          </p>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/services/${s.slug}`}
                  className="group block border border-border p-8 h-full hover:border-secondary/60 hover:bg-secondary/5 transition-all"
                  data-testid={`service-card-${s.slug}`}
                >
                  <s.icon className="text-secondary mb-5" size={36} />
                  <h3 className="text-xl font-bold mb-3 group-hover:text-secondary transition-colors">
                    {isAr ? s.ar.title : s.en.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {isAr ? s.ar.desc : s.en.desc}
                  </p>
                  <span className="inline-flex items-center gap-2 text-secondary text-sm font-bold">
                    {isAr ? "استكشف الخدمة" : "Explore Service"}
                    <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies — simple link card to dedicated page */}
      <section className="py-20 bg-background border-t border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <Link
            href="/case-studies"
            data-testid="services-link-case-studies"
            className="group block relative overflow-hidden border border-border hover:border-secondary/60 transition-colors p-10 md:p-14"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="grid md:grid-cols-[1fr_auto] items-center gap-8">
              <div>
                <div className="text-secondary text-xs font-bold tracking-[0.3em] uppercase mb-3">
                  {isAr ? "نماذج الأعمال" : "Case Studies"}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight mb-3">
                  {isAr ? "اطّلع على نماذج من أثرنا الفعلي" : "Explore examples of our real-world impact"}
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
                  {isAr
                    ? "مشاريع موثّقة عبر النظم الإسلامية والإدارية والتحول الرقمي — في أكثر من قطاع وسوق."
                    : "Documented engagements across Islamic systems, management systems, and digital transformation — across multiple sectors and markets."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-secondary font-bold border-b-2 border-secondary pb-1 group-hover:gap-3 transition-all w-fit">
                {isAr ? "عرض نماذج الأعمال" : "View case studies"}
                <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Highlight: Academy + Online Store — placed after main services grid */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-6">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.href}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  href={h.href}
                  className="group block bg-background border border-secondary/30 hover:border-secondary p-8 h-full transition-all relative overflow-hidden"
                  data-testid={`highlight-${h.href.replace(/\W+/g, "-")}`}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary opacity-60 group-hover:opacity-100" />
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 bg-primary text-secondary flex items-center justify-center shrink-0">
                      <h.icon size={26} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-secondary transition-colors">
                        {isAr ? h.ar.title : h.en.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed mb-5">
                        {isAr ? h.ar.desc : h.en.desc}
                      </p>
                      <span className="inline-flex items-center gap-2 text-secondary text-sm font-bold">
                        {isAr ? h.ar.cta : h.en.cta}
                        <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F4ECD7] text-primary text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {isAr ? "لديك مشروع محدد؟" : "Have a specific project?"}
          </h2>
          <p className="text-primary/70 mb-8">
            {isAr ? "أرسل طلب الخدمة وسيتواصل معك فريقنا خلال 48 ساعة." : "Submit a service request and our team will reach out within 48 hours."}
          </p>
          <Link
            href="/service-registration"
            className="inline-block px-8 py-4 bg-secondary text-primary font-bold hover:bg-secondary/90 transition-colors"
          >
            {isAr ? "اطلب خدمة الآن" : "Request a Service"}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
