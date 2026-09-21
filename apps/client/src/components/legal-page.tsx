import { Link } from "wouter";
import SiteNav from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useLanguage } from "@/lib/language-context";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalPageProps = {
  titleAr: string;
  titleEn: string;
  updatedAr: string;
  updatedEn: string;
  sectionsAr: LegalSection[];
  sectionsEn: LegalSection[];
};

export function LegalPage({
  titleAr,
  titleEn,
  updatedAr,
  updatedEn,
  sectionsAr,
  sectionsEn,
}: LegalPageProps) {
  const { language, isArabic } = useLanguage();
  const title = isArabic ? titleAr : titleEn;
  const updated = isArabic ? updatedAr : updatedEn;
  const sections = isArabic ? sectionsAr : sectionsEn;

  return (
    <div className="min-h-screen bg-background text-foreground" dir={language === "ar" ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 md:px-12 max-w-3xl">
          <p className="text-xs tracking-[0.2em] uppercase text-secondary font-bold mb-4">
            {isArabic ? "قانوني" : "Legal"}
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-primary mb-3">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">{updated}</p>
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-bold text-foreground mb-3">{section.heading}</h2>
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)} className="text-muted-foreground leading-relaxed mb-3">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
          <p className="mt-12 text-sm text-muted-foreground">
            {isArabic ? "للاستفسارات: " : "Questions: "}
            <a href="mailto:info@darnozom.com" className="text-secondary hover:underline">
              info@darnozom.com
            </a>
            {" · "}
            <Link href="/" className="text-secondary hover:underline">
              {isArabic ? "العودة للرئيسية" : "Back to home"}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
