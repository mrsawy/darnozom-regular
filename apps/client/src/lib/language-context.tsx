import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  isArabic: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ar",
  toggleLanguage: () => {},
  isArabic: true,
});

const STORAGE_KEY = "darnozom_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") return stored;
    } catch {}
    return "ar";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {}

    const dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = language;

    const path = window.location.pathname.replace(/\/$/, "");
    const ownsOwnTitle = path.endsWith("/account") || path === "/account";
    if (!ownsOwnTitle) {
      document.title =
        language === "ar"
          ? "دار نظم - لإنتاج وتطوير أنظمة الحوكمة والامتثال الشرعي والإدارية"
          : "DarNozom - Sharia Governance, Compliance & Management Systems";
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "ar" ? "en" : "ar"));
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, isArabic: language === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
