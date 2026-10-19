import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { ACADEMY_TRACKS } from "@/lib/academy-tracks";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHeroGradient } from "@/components/page-hero-gradient";
import { ExploreCard } from "@/components/explore-card";

export default function Academy() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHeroGradient
        current={isAr ? "التدريب وبناء القدرات" : "Training and Capacity Building"}
        title={<><span className="block text-base font-semibold text-muted-foreground mb-2">{isAr ? "التدريب وبناء القدرات" : "Training and Capacity Building"}</span>{isAr ? "أكاديمية دار نظم" : "DarNozom Academy"}</>}
        subtitle={isAr
          ? "مسارات علمية ومهنية تربط الفهم بالتطبيق وتدعم بناء الكفاءات وتطوير المؤسسات."
          : "Scholarly and professional tracks connecting understanding with practice, building capacity and developing institutions."}
      />

      {/* Learning Tracks */}
      <section className="py-24 bg-white border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <div className="mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3">
              {isAr ? "المسارات التعليمية" : "Learning Tracks"}
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              {isAr
                ? "المسارات الثلاثة مطابقة للوحدات البحثية."
                : "The three tracks correspond to the research units."}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ACADEMY_TRACKS.map((track, i) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <ExploreCard
                  href={`/track/${track.id}`}
                  title={isAr ? track.name.ar : track.name.en}
                  desc={isAr ? track.desc.ar : track.desc.en}
                  bgWhite
                  testId={`academy-track-${track.id}`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Programmes & Institutional Training */}
      <section className="py-24 bg-background border-b border-border">
        <div className="max-w-[1250px] mx-auto px-page">
          <div className="max-w-2xl mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              {isAr ? "البرامج والتدريب المؤسسي" : "Programmes and Institutional Training"}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {isAr
                ? "شرح ومناقشة ودراسة حالات وتمارين تطبيقية بحسب موضوع البرنامج ومستوى المشاركين."
                : "Teaching, discussion, case studies and practical exercises suited to the programme and participants."}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/academy/diplomas"
              data-testid="browse-all-diplomas"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              {isAr ? "معاينة تفاصيل البرنامج" : "Preview a programme"}
              <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
            </Link>
            <Link
              href="/service-registration?service=training"
              className="inline-flex items-center gap-3 border border-primary text-primary px-7 py-4 font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {isAr ? "اطلب تدريبًا لمؤسستك" : "Request institutional training"}
              <ArrowRight size={16} className={isAr ? "rotate-180" : ""} />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
