import { useLanguage } from "@/lib/language-context";
import { OdooPartnerBadge } from "@/components/odoo-partner-badge";

const COPY = {
  ar: {
    tagline: "لإنتاج وتطوير النظم الإسلامية والإدارية",
    servicesHeading: "خدماتنا",
    services: ["أنظمة الحوكمة والامتثال الشرعي", "الإدارة", "التحول الرقمي", "الاستشارات"],
    contactHeading: "تواصل",
    address: "الشيخ زايد، الجيزة، مصر",
    privacy: "سياسة الخصوصية",
    terms: "الشروط والأحكام",
    rights: "جميع الحقوق محفوظة",
    facebookAria: "فيسبوك",
    twitterAria: "تويتر / X",
    instagramAria: "إنستغرام",
    linkedinAria: "لينكدإن",
    whatsappAria: "واتساب",
  },
  en: {
    tagline: "Producing and developing Islamic and management systems",
    servicesHeading: "Services",
    services: ["Shariah Governance & Compliance Systems", "Management", "Digital Transformation", "Consulting"],
    contactHeading: "Contact",
    address: "Sheikh Zayed, Giza, Egypt",
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
    rights: "All rights reserved",
    facebookAria: "Facebook",
    twitterAria: "Twitter / X",
    instagramAria: "Instagram",
    linkedinAria: "LinkedIn",
    whatsappAria: "WhatsApp",
  },
} as const;

export function SiteFooter() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];

  return (
    <footer className="bg-primary py-6 border-t border-secondary/20">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-5">
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}darnozom-n-logo.png`}
                alt="دار نظم - Darnozom Consulting"
                className="h-12 w-auto"
              />
              <div>
                <div className="text-secondary text-base font-bold tracking-[0.2em] uppercase">
                  {isArabic ? "دار نظم" : "Darnozom"}
                </div>
                <div className="text-white/50 text-[10px] tracking-wider">
                  {isArabic ? "الشريعة والإدارة والتحول الرقمي" : "Shariah, Management & Digital Transformation"}
                </div>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">{t.tagline}</p>
            <div className="flex items-center gap-4 mt-1">
              <a href="https://www.facebook.com/profile.php?id=61590763370275" target="_blank" rel="noreferrer" aria-label={t.facebookAria} className="text-white/40 hover:text-secondary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="https://x.com/darnozom?s=11" target="_blank" rel="noreferrer" aria-label={t.twitterAria} className="text-white/40 hover:text-secondary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.256 5.626L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/darnozom/" target="_blank" rel="noreferrer" aria-label={t.instagramAria} className="text-white/40 hover:text-secondary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/darnozom/" target="_blank" rel="noreferrer" aria-label={t.linkedinAria} className="text-white/40 hover:text-secondary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="https://wa.me/201022044240" target="_blank" rel="noreferrer" aria-label={t.whatsappAria} className="text-white/40 hover:text-secondary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-5">{t.servicesHeading}</h4>
            <ul className="space-y-3">
              {t.services.map((s) => (
                <li key={s}>
                  <span className="text-white/50 text-sm hover:text-secondary transition-colors cursor-pointer">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-secondary text-xs font-bold tracking-[0.2em] uppercase mb-5">{t.contactHeading}</h4>
            <ul className="space-y-3 text-sm text-white/50">
              <li>
                <a href="mailto:info@darnozom.com" className="hover:text-secondary transition-colors">info@darnozom.com</a>
              </li>
              <li>
                <a href="https://wa.me/201022044240" target="_blank" rel="noreferrer" className="hover:text-secondary transition-colors" dir="ltr">+20 102 204 4240</a>
              </li>
              <li className="text-white/30 leading-relaxed">{t.address}</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/40 text-[11px] font-bold tracking-[0.25em] uppercase">
            {isArabic ? "اعتمادات وشراكات" : "Credentials & Partnerships"}
          </div>
          <OdooPartnerBadge variant="compact" />
        </div>

        <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} {isArabic ? "دار نظم — جميع الحقوق محفوظة" : `DarNozom — ${t.rights}`}
          </p>
          <div className="flex gap-6 text-primary-foreground/40 text-xs">
            <a href="/privacy" className="hover:text-secondary transition-colors">{t.privacy}</a>
            <a href="/terms" className="hover:text-secondary transition-colors">{t.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
