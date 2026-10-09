import { useEffect } from "react";
import { Link } from "wouter";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/content/page-hero";

const APPROACH_STEPS = [
  {
    ar: "نفهم السؤال",
    en: "Understand the question",
    descAr: "نحدد الاحتياج والسياق والأهداف والنتائج المطلوبة.",
    descEn: "Define the need, context, objectives and desired results.",
  },
  {
    ar: "نؤصّل وندرس الواقع",
    en: "Establish foundations and study reality",
    descAr: "ندرس الأصول الشرعية ذات الصلة، ونحلل الواقع والبيانات، ونستفيد من المعرفة والخبرة المعاصرة.",
    descEn: "Study relevant Sharia foundations, analyse conditions and data, and draw on contemporary knowledge and expertise.",
  },
  {
    ar: "نصمم الحلول والمخرجات",
    en: "Design solutions and outputs",
    descAr: "نطوّر دراسات وتوصيات وبرامج وأدوات تناسب الاحتياج والسياق، وتراعي إمكانات التطبيق.",
    descEn: "Develop studies, recommendations, programmes and tools suited to the need and context, taking implementation capacity into account.",
  },
  {
    ar: "ندعم التطبيق والتقييم",
    en: "Support implementation and evaluation",
    descAr: "نحدد خطوات التنفيذ ومؤشرات المتابعة وتقييم الأثر، وندعم التحسين المستمر.",
    descEn: "Define implementation steps and indicators for monitoring and impact assessment, and support continuous improvement.",
  },
];

const VALUES = [
  { ar: "الالتزام بالمرجعية الإسلامية", en: "Commitment to Islamic Foundations" },
  { ar: "الأمانة العلمية", en: "Scholarly Integrity" },
  { ar: "الانضباط المنهجي", en: "Methodological Rigor" },
  { ar: "المصلحة العامة", en: "Public Interest" },
  { ar: "التكامل", en: "Integration" },
  { ar: "الجودة", en: "Quality" },
];

const STRUCTURE = [
  { ar: "مركز دار نظم للبحوث والدراسات", en: "DarNozom Research and Studies Center", href: "/center" },
  { ar: "أكاديمية دار نظم", en: "DarNozom Academy", href: "/academy" },
  { ar: "الاستشارات", en: "Consulting", href: "/services/consulting" },
  { ar: "نظم بلاتفورم", en: "Nozom Platform", href: "/services/digital-transformation" },
];

export default function About() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <SiteNav mode="page" />

      <PageHero
        title={t("من نحن", "Who We Are")}
        subtitle={t(
          "دار نظم مؤسسة للبحوث والاستشارات وبناء القدرات في مجالات السياسات والقيادة والإدارة والحوكمة، تجمع بين المرجعية الإسلامية والمعرفة والخبرة المعاصرة، وتسهم في تطوير الشأن العام وبناء مؤسسات فاعلة، من خلال دعم الجهات العامة والشركات والمؤسسات ذات الدور الاستراتيجي في التنمية وتقديم الخدمات وصنع السياسات العامة.",
          "DarNozom is an institution for research, consulting and capacity building in policy, leadership, management and governance. It brings together Islamic foundations and contemporary knowledge and expertise to advance public affairs and build effective institutions, supporting public bodies, companies and institutions with a strategic role in development, service delivery and public policymaking."
        )}
      />

      {/* Vision */}
      <section id="vision" className="bg-white py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("رؤيتنا", "Our Vision")}</h2>
          <p className="max-w-[700px] text-ink-muted">
            {t(
              "أن تكون دار نظم مؤسسة مرجعية في تطوير الشأن العام وبناء قيادات ومؤسسات فاعلة، من خلال التكامل بين المرجعية الإسلامية والمعرفة والخبرة المعاصرة.",
              "To become a reference institution for advancing public affairs and developing effective leaders and institutions through the integration of Islamic foundations with contemporary knowledge and expertise."
            )}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("رسالتنا", "Our Mission")}</h2>
          <p className="max-w-[700px] text-ink-muted">
            {t(
              "ننتج المعرفة ونطوّر السياسات، ونؤهّل القيادات ونبني القدرات، وندعم تأسيس المؤسسات وتطوير نظم إدارتها وحوكمتها؛ للارتقاء بجودة القرار والأداء وتحقيق المصالح العامة، بالتعاون مع الجهات العامة والشركات والمؤسسات ذات الدور الاستراتيجي في التنمية وتقديم الخدمات، وبمنهج يجمع بين التأصيل الشرعي والبحث العلمي والخبرة التطبيقية.",
              "We produce knowledge and develop policies, prepare leaders and build capacity, and support the establishment of institutions and the development of their management and governance systems. We work to improve decisions and performance and serve the public interest, in cooperation with public bodies, companies and institutions with a strategic role in development and service delivery, through an approach that combines Sharia grounding, scientific research and practical expertise."
            )}
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section id="method" className="bg-white py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("منهجنا", "Our Approach")}</h2>
          <p className="max-w-[700px] text-ink-muted mb-7">
            {t(
              "نبدأ بفهم السؤال والاحتياج، ونجمع بين التأصيل الشرعي ودراسة الواقع والمعرفة والخبرة المعاصرة؛ لنطوّر حلولًا ومخرجات عملية، وندعم تطبيقها وتقييم أثرها.",
              "We begin by understanding the question and the need, bringing together Sharia grounding, analysis of real conditions and contemporary knowledge and expertise to develop practical solutions and outputs, support implementation and assess their impact."
            )}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-[30px]">
            {APPROACH_STEPS.map((s, i) => (
              <article key={s.en} className="bg-white border border-line border-t-[3px] border-t-gold rounded-lg p-[22px]">
                <span className="block text-[11px] text-gold mb-5" dir="ltr">0{i + 1}</span>
                <h3 className="font-bold text-ink mb-2">{isArabic ? s.ar : s.en}</h3>
                <p className="text-[13px] text-ink-muted">{isArabic ? s.descAr : s.descEn}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="bg-mist py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("قيمنا", "Our Values")}</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0 m-0">
            {VALUES.map((v) => (
              <li key={v.en} className="bg-white border border-line rounded-lg p-6 text-navy text-[17px]">
                {isArabic ? v.ar : v.en}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Institutional Structure */}
      <section id="structure" className="bg-white py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
          <div className="flex items-end justify-between gap-6 mb-7">
            <div>
              <h2 className="text-[26px] font-bold text-ink mb-2">{t("هيكل المؤسسة", "Institutional Structure")}</h2>
              <p className="max-w-[700px] text-ink-muted">
                {t("أذرع متكاملة في مؤسسة واحدة", "Complementary functions within one institution")}
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STRUCTURE.map((item) => (
              <Link
                key={item.en}
                href={item.href}
                className="group flex flex-col bg-white border border-line rounded-[10px] p-[26px] transition-transform hover:-translate-y-0.5"
              >
                <h3 className="font-bold text-ink mb-2">{isArabic ? item.ar : item.en}</h3>
                <p className="text-ink-muted text-sm leading-[2]">
                  {t("منهج وهوية مشتركة ومخرجات متخصصة.", "A shared approach and identity, with specialized outputs.")}
                </p>
                <span className="self-start mt-5 text-[13px] text-navy border-b border-gold pb-0.5">
                  {t("اكتشف المزيد", "Explore more")} <span aria-hidden="true">{isArabic ? "←" : "→"}</span>
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
