import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Briefcase, Lightbulb, Users, TrendingUp, Globe, Eye, Compass, ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import SuccessPartners from "@/components/success-partners";
import { OdooPartnerBadge } from "@/components/odoo-partner-badge";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const VALUES = [
  { icon: BookOpen, ar: "المرجعية الشرعية", en: "Sharia Authority" },
  { icon: Briefcase, ar: "الاحترافية الإدارية", en: "Managerial Professionalism" },
  { icon: Lightbulb, ar: "الابتكار والتميز", en: "Innovation & Excellence" },
  { icon: Users, ar: "التعاون والتكامل", en: "Collaboration & Integration" },
  { icon: TrendingUp, ar: "الواقعية والأثر", en: "Impact" },
  { icon: Globe, ar: "الاستدامة", en: "Sustainability" },
];

const TEAM = [
  { ar: "مستشارون شرعيون", en: "Sharia Consultants", count: "12+" },
  { ar: "مستشارون إداريون", en: "Management Consultants", count: "18+" },
  { ar: "مهندسو تحول رقمي", en: "Digital Transformation Engineers", count: "9+" },
  { ar: "محللو بيانات وأبحاث", en: "Data & Research Analysts", count: "6+" },
];

export default function About() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      {/* Hero */}
      <section className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-br from-[hsl(150_40%_95%)] via-[hsl(150_44%_92%)] to-[hsl(152_46%_86%)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-7">
              <span className="text-primary text-xs font-bold tracking-[0.25em] uppercase">
                {isAr ? "من نحن" : "About Us"}
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
              {isAr ? "دار نظم" : "DarNozom"}
            </h1>
            <p className="text-primary text-lg md:text-xl font-medium mb-6 leading-relaxed italic"
               style={{
                 fontFamily: isAr
                   ? "'IBM Plex Sans Arabic', sans-serif"
                   : "Georgia, 'Times New Roman', 'Noto Serif', serif",
               }}>
              {isAr
                ? "حيث يلتقي التميز الإداري بالقيم الإسلامية."
                : "Where Managerial Excellence Meets Islamic Values."}
            </p>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              {isAr
                ? "مؤسسة علمية رائدة متخصصة في إنتاج وتطوير النظم الإسلامية والإدارية، تجمع بين المرجعية الشرعية والاحتراف الإداري لتقديم حلول متكاملة للمؤسسات في القطاعين العام والخاص."
                : "A leading scientific institution specialized in producing and developing Islamic and administrative systems, combining Sharia authority with administrative professionalism to deliver integrated solutions for public and private sector institutions."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Overview */}
      <section id="overview" className="py-24 bg-background scroll-mt-24 overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: isAr ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 lg:order-1"
            >
              <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
                {isAr ? "نبذة" : "Overview"}
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                {isAr
                  ? "شريكك الاستراتيجي لتطوير النظم الإسلامية والإدارية"
                  : "Your Strategic Partner for Developing Islamic & Management Systems"}
              </h2>
              <div className="space-y-6 text-muted-foreground text-lg leading-loose">
                <p>
                  {isAr
                    ? "دار نظم مؤسسة علمية متخصصة في تقديم حلول متكاملة في النظم الإسلامية والإدارة الحديثة والتحول المؤسسي. نعمل على تمكين الأفراد وتطوير المؤسسات ودعم الحكومات."
                    : "DarNozom is a specialized scientific institution providing integrated solutions in Islamic systems, modern management, and institutional transformation — empowering individuals, developing organizations, and supporting governments."}
                </p>
                <p>
                  {isAr
                    ? "من خلال منهج يجمع بين المرجعية الشرعية والاحتراف الإداري — نحقق التوازن الحقيقي بين القيم والأداء."
                    : "Through a methodology that combines Sharia authority with managerial excellence — we achieve the true balance between values and performance."}
                </p>
              </div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: isAr ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="order-1 lg:order-2 relative"
            >
              <div className="absolute -inset-3 bg-secondary/10 -z-10 hidden lg:block" />
              <img
                src={`${import.meta.env.BASE_URL}about-overview.png`}
                alt={isAr ? "شريكك الاستراتيجي" : "Your Strategic Partner"}
                loading="lazy"
                className="w-full h-auto aspect-[4/3] object-cover shadow-xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section id="vision" className="py-24 dark bg-[#0F3D2E] text-white scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-10">
          <div className="border border-secondary/20 p-10 bg-primary/40">
            <Eye className="text-secondary mb-6" size={40} />
            <h3 className="text-3xl font-bold mb-4">{isAr ? "رؤيتنا" : "Our Vision"}</h3>
            <p className="text-white/70 leading-loose">
              {isAr
                ? "أن تكون دار نظم المرجعية العالمية الرائدة في تصميم وتطوير النظم الإسلامية والإدارية المتكاملة."
                : "For DarNozom to be the leading global authority in designing and developing integrated Islamic and management systems."}
            </p>
          </div>
          <div className="border border-secondary/20 p-10 bg-primary/40">
            <Compass className="text-secondary mb-6" size={40} />
            <h3 className="text-3xl font-bold mb-4">{isAr ? "رسالتنا" : "Our Mission"}</h3>
            <p className="text-white/70 leading-loose">
              {isAr
                ? "حلول استشارية وتعليمية وتطبيقية متكاملة — تجمع النظم الشرعية بالإدارة الحديثة لتطوير الأفراد وتمكين المؤسسات."
                : "Integrated consulting, educational, and applied solutions — combining Islamic systems with modern management to develop individuals and empower institutions."}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="py-24 bg-background scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
            {isAr ? "قيمنا" : "Values"}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-12">
            {isAr ? "ما يحرّك عملنا" : "What Drives Our Work"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div key={v.en} className="border border-border p-8 hover:border-secondary/40 transition-colors">
                <v.icon className="text-secondary mb-5" size={32} />
                <h4 className="font-bold text-lg">{isAr ? v.ar : v.en}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-24 dark bg-[#0F3D2E] text-white scroll-mt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
            {isAr ? "فريقنا" : "Our Team"}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-12">
            {isAr ? "خبرات متكاملة تحت سقف واحد" : "Integrated Expertise Under One Roof"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM.map((t) => (
              <div key={t.en} className="border border-secondary/20 p-8 bg-primary/40">
                <div className="text-white/80 text-lg font-semibold leading-relaxed">{isAr ? t.ar : t.en}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies — simple link card to dedicated page */}
      <section id="case-studies" className="py-24 bg-background scroll-mt-24 border-t border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <Link
            href="/case-studies"
            data-testid="about-link-case-studies"
            className="group block relative overflow-hidden border border-border hover:border-secondary/60 transition-colors p-10 md:p-14"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="grid md:grid-cols-[1fr_auto] items-center gap-8">
              <div>
                <div className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-3">
                  {isAr ? "نماذج الأعمال" : "Case Studies"}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight mb-3">
                  {isAr ? "نماذج من أثرنا" : "Examples of our impact"}
                </h2>
                <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
                  {isAr
                    ? "مشاريع مختارة عبر قطاعات وأسواق متعددة — تجمع بين الكفاءة الإدارية والامتثال الشرعي."
                    : "Selected engagements across multiple sectors and markets — combining managerial efficiency with Sharia compliance."}
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

      <section className="bg-[#F4ECD7] border-y border-border py-16" data-testid="about-credentials">
        <div className="container mx-auto px-6 md:px-12 max-w-5xl">
          <div className="text-center mb-8">
            <div className="text-secondary text-[11px] font-bold tracking-[0.25em] uppercase mb-3">
              {isAr ? "اعتمادات وشراكات" : "Certifications & Partnerships"}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3">
              {isAr ? "موثوقون من قِبَل المنصات العالمية" : "Trusted by Global Platforms"}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {isAr
                ? "نعمل ضمن منظومة شركاء معتمدين عالميًا لضمان أعلى معايير الجودة في تنفيذ مشاريع التحول الرقمي."
                : "We operate within a network of globally certified partners to ensure the highest quality standards in our digital transformation engagements."}
            </p>
          </div>
          <OdooPartnerBadge />
        </div>
      </section>

      <SuccessPartners />

      <SiteFooter />
    </div>
  );
}
