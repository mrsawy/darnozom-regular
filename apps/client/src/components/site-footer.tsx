import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { BRAND, CONTACT } from "@/lib/site-constants";

type Tone = "dark" | "light";
const col = (ar: string, en: string, links: [string, string, string][]) => ({ ar, en, links });

const COLUMNS = [
  col("المعرفة والتعلم", "Knowledge and Learning", [
    ["المعرفة والبحوث", "Knowledge and Research", "/services/research"],
    ["الأكاديمية", "Academy", "/academy"],
    ["المكتبة والإصدارات", "Library and Publications", "/publications"],
    ["إصدارات دار نظم", "DarNozom Publications", "/publications?tab=all"],
    ["المرصد", "Observatory", "/observatory"],
  ]),
  col("الخدمات والحلول", "Services and Solutions", [
    ["خدماتنا", "Services", "/services"],
    ["الاستشارات", "Consulting", "/services/consulting"],
    ["التدريب وبناء القدرات", "Training and Capacity Building", "/academy/for-organizations"],
    ["نظم بلاتفورم", "Nozom Platform", "/services/digital-transformation"],
    ["الأخبار والفعاليات", "News and Events", "/news-events"],
  ]),
];

export function SiteFooter({ tone = "dark" }: { tone?: Tone }) {
  const { isArabic } = useLanguage();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const dark = tone === "dark";
  const surface = dark ? "bg-navy-deep text-white" : "bg-ivory text-navy border-t border-line";
  const muted = dark ? "text-white/75" : "text-ink-muted";
  const hover = dark ? "hover:text-white" : "hover:text-navy";
  const linkCls = `inline-flex items-center min-h-11 ${muted} ${hover}`;
  const arrow = isArabic ? "←" : "→";

  return (
    <footer className={surface}>
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6 pt-12 pb-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-xl font-bold mb-3"><Link href="/">{t(BRAND.nameAr, BRAND.nameEn)}</Link></h2>
            <p className={`text-sm ${muted}`}>{t(BRAND.taglineAr, BRAND.taglineEn)}</p>
            <p className="mt-3 font-semibold">{t(BRAND.sloganAr, BRAND.sloganEn)}</p>
            <p className={`mt-2 text-sm ${dark ? "text-gold-light" : "text-gold"}`}>{t(BRAND.refLineAr, BRAND.refLineEn)}</p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.ar} aria-label={t(c.ar, c.en)}>
              <h2 className="text-lg font-bold mb-3">{t(c.ar, c.en)}</h2>
              <ul>
                {c.links.map(([ar, en, href]) => (
                  <li key={href}><Link href={href} className={linkCls}>{t(ar, en)} <span aria-hidden className="ms-1.5">{arrow}</span></Link></li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="text-lg font-bold mb-3">{t("تواصل معنا", "Contact Us")}</h2>
            <ul>
              <li><a href={`mailto:${CONTACT.email}`} dir="ltr" className={linkCls}>{CONTACT.email}</a></li>
              <li><a href={CONTACT.phoneHref} dir="ltr" className={linkCls}>{CONTACT.phone}</a></li>
              <li><a href="/#newsletter" className={linkCls}>{t("اشترك في النشرة", "Subscribe to the newsletter")} <span aria-hidden className="ms-1.5">{arrow}</span></a></li>
              <li><Link href="/service-registration" className={linkCls}>{t("أرسل طلبك", "Send your request")} <span aria-hidden className="ms-1.5">{arrow}</span></Link></li>
            </ul>
          </div>
        </div>
        <div className={`mt-10 pt-5 border-t ${dark ? "border-white/15" : "border-line"} flex flex-col sm:flex-row gap-3 justify-between text-sm ${muted}`}>
          <p>© {new Date().getFullYear()} {t("دار نظم. جميع الحقوق محفوظة.", "DarNozom. All rights reserved.")}</p>
          <ul className="flex flex-wrap gap-x-5">
            <li><Link href="/privacy" className={linkCls}>{t("الخصوصية", "Privacy")}</Link></li>
            <li><Link href="/terms" className={linkCls}>{t("الشروط", "Terms")}</Link></li>
            <li><Link href="/return-policy" className={linkCls}>{t("الإرجاع", "Returns")}</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
