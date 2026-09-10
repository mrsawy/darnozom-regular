import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const COPY = {
  ar: {
    title: "404 — الصفحة غير موجودة",
    desc: "يبدو أن الصفحة التي تبحث عنها غير متاحة أو تمّ نقلها.",
  },
  en: {
    title: "404 Page Not Found",
    desc: "The page you're looking for could not be found or has been moved.",
  },
};

export default function NotFound() {
  const { language, isArabic } = useLanguage();
  const t = COPY[language];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50" dir={isArabic ? "rtl" : "ltr"}>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">{t.desc}</p>
        </CardContent>
      </Card>
    </div>
  );
}
