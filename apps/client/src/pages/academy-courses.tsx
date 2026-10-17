import { Link } from "wouter";
import { ChevronLeft, BookOpen, ArrowRight } from "lucide-react";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";

const TRACKS = [
  {
    id: "sharia",
    href: "/track/sharia",
    ar: "السياسة الشرعية والفكر الإسلامي",
    en: "Sharia Policy and Islamic Thought",
  },
  {
    id: "policy",
    href: "/track/policy",
    ar: "السياسات والإدارة العامة",
    en: "Public Policy and Public Administration",
  },
  {
    id: "leadership",
    href: "/track/leadership",
    ar: "القيادة والإدارة والحوكمة",
    en: "Leadership, Management and Governance",
  },
];

export default function AcademyCoursesPage() {
  const { language, isArabic } = useLanguage();
  const dir = isArabic ? "rtl" : "ltr";
  const isAr = language === "ar";

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <SiteNav />

      {/* Hero */}
      <section className="bg-primary text-primary-foreground border-b border-primary">
        <div className="container mx-auto px-6 md:px-12 pt-32 pb-20">
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-8" aria-label="breadcrumb">
            <Link href="/" className="hover:text-secondary">{isAr ? "الرئيسية" : "Home"}</Link>
            <ChevronLeft className={`w-3 h-3 ${isAr ? "" : "rotate-180"}`} />
            <Link href="/academy" className="hover:text-secondary">{isAr ? "الأكاديمية" : "Academy"}</Link>
            <ChevronLeft className={`w-3 h-3 ${isAr ? "" : "rotate-180"}`} />
            <span className="text-secondary">{isAr ? "البرامج والدورات" : "Programs and Courses"}</span>
          </nav>

          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-5 h-5 text-secondary" />
            <span className="text-secondary text-xs font-bold tracking-[0.2em] uppercase">
              {isAr ? "البرامج والدورات" : "Programs and Courses"}
            </span>
          </div>

          <h1 className="font-black leading-[1.05] mb-6 max-w-4xl" style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)" }}>
            {isAr ? "برامج ودورات أكاديمية دار نظم" : "DarNozom Academy Programs and Courses"}
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-3xl">
            {isAr
              ? "سيتم الإعلان عن البرامج والدورات قريبًا ضمن المسارات التعليمية أدناه. تابعنا لمعرفة المزيد."
              : "Programs and courses will be announced soon under the learning tracks below. Stay tuned for updates."}
          </p>
        </div>
      </section>

      {/* Tracks */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6 md:px-12">
          <h2 className="text-2xl font-bold text-primary mb-10">
            {isAr ? "المسارات التعليمية" : "Learning Tracks"}
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {TRACKS.map((track) => (
              <div
                key={track.id}
                className="border border-border p-8 flex flex-col gap-6"
              >
                <h3 className="font-black text-primary text-lg leading-snug">
                  {isAr ? track.ar : track.en}
                </h3>
                <p className="text-muted-foreground text-sm flex-1">
                  {isAr
                    ? "سيتم الإعلان عن الدورات المتاحة ضمن هذا المسار قريبًا."
                    : "Courses available under this track will be announced soon."}
                </p>
                <Link
                  href={track.href}
                  className="inline-flex items-center gap-2 text-secondary text-sm font-bold hover:underline"
                >
                  {isAr ? "تصفّح المسار" : "View track"}
                  <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-[#EAF0F6] text-primary">
        <div className="container mx-auto px-6 md:px-12 max-w-4xl text-center">
          <h2 className="font-black mb-4 leading-tight" style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}>
            {isAr ? "تريد التسجيل أو الاستفسار؟" : "Want to register or enquire?"}
          </h2>
          <p className="text-primary/70 text-lg leading-relaxed mb-10">
            {isAr
              ? "احجز جلسة استشارية لاختيار المسار الأنسب لك، أو تواصل معنا مباشرة."
              : "Book a consultation to choose the right track, or contact us directly."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact?type=training"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-primary font-bold tracking-widest uppercase text-xs hover:bg-secondary/90 transition-colors"
            >
              {isAr ? "احجز جلسة استشارية" : "Book a Consultation"}
            </Link>
            <Link
              href="/academy"
              className="inline-flex items-center gap-2 px-6 py-3 border border-primary/30 text-primary font-bold tracking-widest uppercase text-xs hover:border-secondary hover:text-secondary transition-colors"
            >
              {isAr ? "العودة إلى الأكاديمية" : "Back to Academy"}
              <ArrowRight className={`w-3 h-3 ${isAr ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
