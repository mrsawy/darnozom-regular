import { Link, useRoute, Redirect } from "wouter";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/content/page-hero";
import { NewsletterBlock } from "@/components/content/newsletter-block";
import { ACADEMY_TRACKS } from "@/lib/academy-tracks";

export default function AcademyTrack() {
  const { isArabic } = useLanguage();
  const [, params] = useRoute<{ id: string }>("/track/:id");
  const track = ACADEMY_TRACKS.find((u) => u.id === params?.id);

  if (!track) return <Redirect to="/academy" />;

  const t = (ar: string, en: string) => (isArabic ? ar : en);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHero
        title={t("مسار ", "Track: ") + (isArabic ? track.name.ar : track.name.en)}
        subtitle={isArabic ? track.desc.ar : track.desc.en}
      />

      {/* Learning Themes */}
      <section className="bg-white py-[70px]">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("محاور التعلم", "Learning Themes")}</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {track.topics.map((topic) => (
              <Link
                key={topic.en}
                href="/academy/courses"
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

      {/* Track Programmes */}
      <section className="py-[70px]">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("برامج المسار", "Track Programmes")}</h2>
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
            <Link href="/academy/for-organizations" className="inline-flex items-center rounded-[6px] bg-navy px-6 py-3 font-bold text-white hover:bg-navy/90">
              {t("سجّل اهتمامك", "Register your interest")}
            </Link>
          </div>
        </div>
      </section>

      <NewsletterBlock />

      <SiteFooter />
    </div>
  );
}
