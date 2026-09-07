import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  isArabic: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  toggleLanguage: () => {},
  isArabic: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
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
