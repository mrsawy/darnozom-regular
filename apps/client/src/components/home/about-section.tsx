import { Link } from "wouter";
import { ArrowLeft, BookOpen, Laptop, MessageSquare, Users } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { BRAND } from "@/lib/site-constants";

const SERVICES = [
  { icon: BookOpen, ar: "البحوث والدراسات", en: "Research and Studies", href: "/services/research" },
  { icon: Users, ar: "التدريب وبناء القدرات", en: "Training and Capacity Building", href: "/academy" },
  { icon: MessageSquare, ar: "الاستشارات", en: "Consulting", href: "/services/consulting" },
  { icon: Laptop, ar: "نظم بلاتفورم", en: "Nozom Platform", href: "/services/digital-transformation" },
];

export function AboutSection() {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  return (
    <section className="mt-8 bg-[#FFFFFF] py-8">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-lg font-bold text-navy">{t("عن دار نظم", "About DarNozom")}</h2>
          <p className="mt-2 text-2xl lg:text-[28px] font-bold text-navy leading-snug">{t(BRAND.sloganAr, BRAND.sloganEn)}</p>
          <p className="mt-2 text-gold font-semibold">{t(BRAND.refLineAr, BRAND.refLineEn)}</p>
          <p className="mt-4 text-ink-muted">
            {t(
              "دار نظم مؤسسة للبحوث والاستشارات وبناء القدرات في مجالات السياسات والقيادة والإدارة والحوكمة، تجمع بين المرجعية الإسلامية والمعرفة والخبرة المعاصرة، وتسهم في تطوير الشأن العام وبناء مؤسسات فاعلة.",
              "DarNozom is an institution for research, consulting and capacity building in policy, leadership, management and governance. It combines an Islamic frame of reference with contemporary knowledge and expertise, contributing to public affairs and to building effective institutions.",
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/about" className="min-h-12 px-6 inline-flex items-center rounded-[4px] bg-navy text-white font-semibold hover:bg-navy-deep">{t("تعرّف على دار نظم", "Discover DarNozom")}</Link>
            <Link href="/services" className="min-h-12 px-6 inline-flex items-center gap-2 rounded-[4px] border border-navy text-navy font-semibold hover:bg-mist">
              {t("خدماتنا", "Our services")}
              <ArrowLeft className={`w-4 h-4 transition-transform ${isArabic ? "" : "rotate-180"}`} aria-hidden />
            </Link>
          </div>
        </div>
        <img src="/seed/about.webp" alt="" className="w-full aspect-[2.2/1] object-cover rounded-[4px]" />
      </div>
      <div className="mt-10  border-y border-line bg-[#F8F6F1]">
        <ul className="mx-auto max-w-[1200px] px-5 lg:px-6 grid grid-cols-2 lg:grid-cols-4 ">
          {SERVICES.map(({ icon: Icon, ar, en, href }, i) => (
            <li key={href} className={`py-5 ${i > 0 ? "lg:border-s lg:border-gold/60" : ""}`}>
              <Link href={href} className="flex items-center justify-center gap-3 min-h-11 text-navy font-semibold hover:text-gold">
                <Icon className="w-6 h-6" strokeWidth={1.5} aria-hidden /> {t(ar, en)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
