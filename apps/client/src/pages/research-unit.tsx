import { Link, useRoute, Redirect } from "wouter";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/content/page-hero";
import { NewsletterBlock } from "@/components/content/newsletter-block";
import { RESEARCH_UNITS } from "@/lib/research-units";

export default function ResearchUnit() {
  const { isArabic } = useLanguage();
  const [, params] = useRoute<{ id: string }>("/unit/:id");
  const unit = RESEARCH_UNITS.find((u) => u.id === params?.id);

  if (!unit) return <Redirect to="/services/research" />;

  const t = (ar: string, en: string) => (isArabic ? ar : en);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHero title={isArabic ? unit.name.ar : unit.name.en} subtitle={isArabic ? unit.desc.ar : unit.desc.en} />

      {/* Unit Themes */}
      <section className="bg-white py-[70px]">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("محاور الوحدة", "Unit Themes")}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {unit.topics.map((topic) => (
              <Link
                key={topic.en}
                href="/publications"
                className="group flex flex-col bg-white border border-line rounded-[10px] p-[26px] transition-transform hover:-translate-y-0.5"
              >
                <h3 className="font-bold text-ink mb-2">{isArabic ? topic.ar : topic.en}</h3>
                <p className="text-ink-muted text-sm leading-[2]">{t("معرفة وتطبيق في هذا المجال.", "Knowledge and practice in this field.")}</p>
                <span className="self-start mt-5 text-[13px] text-navy border-b border-gold pb-0.5">
                  {t("اكتشف المزيد", "Explore more")} <span aria-hidden="true">{isArabic ? "←" : "→"}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Related Content */}
      <section className="py-[70px]">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("المواد المرتبطة", "Related Content")}</h2>
          <div className="p-[35px] bg-white border border-dashed border-line rounded-[10px] text-center text-ink-muted">
            <strong className="block text-[19px] text-ink mb-[9px]">{t("تصفح المخرجات المعتمدة", "Explore Approved Outputs")}</strong>
            <p>
              {t(
                "قالب عرض؛ تُستبدل بياناته بالمحتوى المنشور المعتمد.",
                "Display template; populated with approved published content."
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3.5 mt-7">
            <Link href="/publications" className="inline-flex items-center rounded-[6px] bg-navy px-6 py-3 font-bold text-white hover:bg-navy/90">
              {t("تصفح المواد", "Browse content")}
            </Link>
          </div>
        </div>
      </section>

      <NewsletterBlock />

      <SiteFooter />
    </div>
  );
}
