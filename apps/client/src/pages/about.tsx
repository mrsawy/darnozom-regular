import { useEffect } from "react";
import { Link } from "wouter";
import SiteNav from "@/components/site-nav";
import { useLanguage } from "@/lib/language-context";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/content/page-hero";

const APPROACH_STEPS = [
  {
    ar: "نفهم الاحتياجات ونحدد الفجوات",
    en: "Understand Needs & Identify Gaps",
    descAr: "نتعرّف إلى أهداف الجهة وتحدياتها، ونستمع إلى أصحاب المصلحة، ونحدد الفجوات في السياسات والأداء والقدرات؛ لنتفق على الأولويات والنتائج المطلوبة.",
    descEn: "We identify organizational goals and challenges, listen to stakeholders, and identify gaps in policy, performance, and capacity to align on priorities and desired outcomes.",
  },
  {
    ar: "نؤصّل ونحلل",
    en: "Ground & Analyze",
    descAr: "ندرس الأصول الشرعية ذات الصلة، ونحلل الواقع والبيانات وأسباب الفجوات، ونستفيد من مناهج العلوم السياسية والإدارية والخبرات والتجارب المقارنة؛ لبناء فهم متكامل تستند إليه الحلول.",
    descEn: "We study relevant Sharia foundations, analyze data and underlying causes of gaps, and draw on political and administrative sciences as well as comparative benchmarks to build a holistic foundation for solutions.",
  },
  {
    ar: "نصمم الحلول والبرامج",
    en: "Design Solutions & Programs",
    descAr: "نطوّر دراسات وتوصيات وسياسات وبرامج تدريب وأدوات عملية تستجيب للاحتياجات، وتراعي الموارد المتاحة والسياق المؤسسي ومتطلبات التنفيذ.",
    descEn: "We develop studies, policy recommendations, training programs, and practical tools tailored to needs, taking into account available resources, institutional context, and execution requirements.",
  },
  {
    ar: "ندعم التنفيذ ونقيّم الأثر",
    en: "Support Execution & Assess Impact",
    descAr: "نساند وضع خطط التنفيذ وتحديد المسؤوليات ومؤشرات المتابعة، ونقيّم النتائج والأثر، ونستفيد مما نتعلمه في تطوير الحلول وتحسين الأداء.",
    descEn: "We assist in formulating implementation plans, defining responsibilities and KPIs, evaluate outcomes and impact, and leverage insights for continuous performance improvement.",
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
          "دار نظم مؤسسة متخصصة في البحوث والاستشارات والتدريب وبناء القدرات في مجالات السياسات العامة والإدارة والقيادة والحوكمة. تضم نخبة من الباحثين والخبراء المتخصصين، وتجمع بين المرجعية الإسلامية والعلوم السياسية والإدارية والخبرة التطبيقية المعاصرة. وتعمل مع الحكومات والمؤسسات العامة والشركات ذات الدور الاستراتيجي والمنظمات غير الربحية على إنتاج المعرفة وصياغة الحلول الداعمة لصنع القرار، وتطوير السياسات وتأهيل القيادات وبناء مؤسسات فاعلة؛ بما يعزز كفاءة الأداء، ويحسّن الخدمات، ويسهم في التنمية وتحقيق المصالح العامة.",
          "DarNozom is an institution specialized in research, consulting, training, and capacity building in public policy, management, leadership, and governance. It brings together an elite group of researchers and specialized experts, combining an Islamic frame of reference with political and administrative sciences and contemporary applied expertise. It collaborates with governments, public entities, strategically vital companies, and non-profit organizations to generate knowledge, formulate decision-support solutions, develop policies, qualify leaders, and build effective institutions—thereby enhancing performance efficiency, improving public services, and contributing to development and the public interest."
        )}
      />

      {/* Vision */}
      <section id="vision" className="bg-white py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-page">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("رؤيتنا", "Our Vision")}</h2>
          <p className="max-w-[850px] text-ink-muted leading-relaxed">
            {t(
              "أن تكون دار نظم مؤسسة مرجعية وشريكًا موثوقًا في تطوير السياسات وبناء قيادات ومؤسسات فاعلة، من خلال التكامل بين المرجعية الإسلامية والعلوم السياسية والإدارية والخبرة المعاصرة.",
              "For DarNozom to be a benchmark institution and a trusted partner in developing policies and building effective leaders and institutions, through the integration of an Islamic frame of reference, political and administrative sciences, and contemporary expertise."
            )}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-page">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("رسالتنا", "Our Mission")}</h2>
          <p className="max-w-[850px] text-ink-muted leading-relaxed">
            {t(
              "ننتج معرفة تدعم القرار، ونطوّر سياسات وحلولًا تستجيب للاحتياجات والتحديات، ونؤهّل القيادات ونبني القدرات، ونساند تأسيس المؤسسات وتطوير إدارتها وحوكمتها. ونربط التأصيل الشرعي بالبحث العلمي والخبرة التطبيقية؛ لتحويل المعرفة إلى ممارسات قابلة للتنفيذ ونتائج قابلة للتقييم، بما يرتقي بالأداء والخدمات، ويسهم في التنمية وتحقيق المصالح العامة.",
              "We produce decision-support knowledge, develop policies and solutions responsive to needs and challenges, train leaders, and build institutional capacities. We assist in establishing organizations and developing their management and governance systems, linking Islamic grounding with scientific research and applied expertise to translate knowledge into actionable practices and measurable outcomes—elevating performance and services, and advancing development and the public interest."
            )}
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section id="method" className="bg-white py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-page">
          <h2 className="text-[26px] font-bold text-ink mb-7">{t("منهجنا", "Our Approach")}</h2>
          <p className="max-w-[850px] text-ink-muted leading-relaxed mb-7">
            {t(
              "ننطلق من فهم الاحتياجات وتحديد الفجوات بين الواقع والنتائج المستهدفة، ونجمع بين التأصيل الشرعي والتحليل العلمي والخبرة العملية؛ لتطوير حلول تستند إلى الأدلة، وتناسب السياق والإمكانات، مع دعم تنفيذها وتقييم أثرها وتحسينها.",
              "We start by understanding needs and identifying gaps between current reality and targeted outcomes, combining Islamic grounding, scientific analysis, and practical experience to develop evidence-based solutions tailored to context and resources, while supporting execution, evaluating impact, and driving continuous improvement."
            )}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-[30px]">
            {APPROACH_STEPS.map((s, i) => (
              <article key={s.en} className="bg-white border border-line border-t-[3px] border-t-gold rounded-lg p-[22px]">
                <span className="block text-[11px] text-gold mb-5" dir="ltr">0{i + 1}</span>
                <h3 className="font-bold text-ink mb-2">{isArabic ? s.ar : s.en}</h3>
                <p className="text-[13px] text-ink-muted leading-relaxed">{isArabic ? s.descAr : s.descEn}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section id="values" className="bg-mist py-[70px] scroll-mt-24">
        <div className="mx-auto max-w-[1200px] px-page">
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
        <div className="mx-auto max-w-[1200px] px-page">
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
