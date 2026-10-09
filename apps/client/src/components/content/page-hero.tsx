import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";

export function PageHero({ title, subtitle }: { title: string; subtitle: string }) {
  const { isArabic } = useLanguage();
  return (
    <section className="bg-mist border-b border-line py-10 md:py-[45px]">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-6">
        <div className="text-[11px] text-ink-muted mb-6">
          <Link href="/" className="hover:text-navy">{isArabic ? "الرئيسية" : "Home"}</Link> / {title}
        </div>
        <h1 className="text-[38px] font-bold text-ink leading-tight mb-4">{title}</h1>
        <p className="max-w-[850px] text-ink-muted">{subtitle}</p>
      </div>
    </section>
  );
}
