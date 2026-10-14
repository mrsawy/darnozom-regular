import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface ExploreCardProps {
  href: string;
  title: string;
  desc: string;
  bgWhite?: boolean;
  testId?: string;
}

export function ExploreCard({ href, title, desc, bgWhite, testId }: ExploreCardProps) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <Link
      href={href}
      data-testid={testId}
      className={`group flex flex-col border border-border p-8 h-full hover:border-secondary/60 transition-colors${bgWhite ? " bg-white" : ""}`}
    >
      <h3 className="font-bold text-lg text-primary mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed flex-1">{desc}</p>
      <span className="inline-flex items-center gap-2 mt-6 text-sm text-secondary font-bold">
        {isAr ? "اكتشف المزيد" : "Explore more"}
        <ArrowRight size={14} className={isAr ? "rotate-180" : ""} />
      </span>
    </Link>
  );
}
