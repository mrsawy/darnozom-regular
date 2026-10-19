import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";

const CARDS = [
  {
    href: "/services/store/books",
    ar: { title: "المتجر", desc: "تصفّح كتب دار نظم وأصدراتها المتاحة للشراء." },
    en: { title: "Store", desc: "Browse DarNozom books and publications available for purchase." },
  },
  {
    href: "/publications",
    ar: { title: "إصدارات دار نظم", desc: "الإنتاج البحثي والمعرفي لدار نظم من مقالات ودراسات وأبحاث ودوريات." },
    en: { title: "DarNozom Publications", desc: "DarNozom's research and knowledge output: articles, studies, research, and periodicals." },
  },
];

export default function PublishingPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "النشر والمعرفة" : "Publishing and Knowledge"}
        title={<><span className="block text-base font-semibold text-muted-foreground mb-2">{isAr ? "النشر والمعرفة" : "Publishing and Knowledge"}</span>{isAr ? "المتجر والإصدارات" : "Store and Publications"}</>}
        subtitle={isAr
          ? "منصة دار نظم للنشر والإصدارات المعرفية والبحثية."
          : "DarNozom's platform for publishing and knowledge output."}
      />

      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-12">
            {isAr ? "المتجر والإصدارات" : "Store and Publications"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
            {CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group border border-border p-8 flex flex-col gap-4 hover:border-primary transition-colors"
              >
                <h3 className="text-xl font-black text-primary group-hover:text-primary/80 transition-colors">
                  {isAr ? card.ar.title : card.en.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                  {isAr ? card.ar.desc : card.en.desc}
                </p>
                <span className="inline-flex items-center gap-2 text-secondary text-sm font-bold">
                  {isAr ? "استعرض" : "Explore"}
                  <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
