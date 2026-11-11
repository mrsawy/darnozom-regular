import { useEffect } from "react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { useAboutContent, usePageDesigns } from "@/lib/cms-api";
import { DEFAULT_ABOUT } from "@/lib/about-content";
import { AboutDesignBody } from "@/components/about/about-variants";

export default function About() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const c = useAboutContent().data ?? DEFAULT_ABOUT;
  const design = usePageDesigns().data?.about ?? "classic";

  useEffect(() => {
    document.title = isArabic ? "من نحن — دار نظم" : "About — DarNozom";
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [isArabic]);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />
      <AboutDesignBody design={design} c={c} isArabic={isArabic} t={t} />
      <SiteFooter />
    </div>
  );
}
