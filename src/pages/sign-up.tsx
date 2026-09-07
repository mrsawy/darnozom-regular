import { SignUp } from "@clerk/react";
import { useLanguage } from "@/lib/language-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const COPY = {
  ar: {
    title: "إنشاء حساب",
    subtitle: "أنشئ حسابك للوصول إلى لوحة التحكم.",
  },
  en: {
    title: "Create your account",
    subtitle: "Set up your account to access the dashboard.",
  },
} as const;

export default function SignUpPage() {
  const { language } = useLanguage();
  const t = COPY[language];
  const isAr = language === "ar";
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0F3D2E] px-4 py-12"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className={`mb-8 max-w-md ${isAr ? "text-right" : "text-left"}`}>
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
          {t.title}
        </h1>
        <p className="text-white/60 text-sm md:text-base leading-relaxed">
          {t.subtitle}
        </p>
      </div>
      <div dir="ltr">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          fallbackRedirectUrl={`${basePath}/account`}
        />
      </div>
    </div>
  );
}
