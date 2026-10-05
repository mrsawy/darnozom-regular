import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { ContentItem } from "@/lib/cms-types";
import { PUBLICATION_KINDS } from "@/lib/cms-labels";
import { mergePublications, useDarNozomBooks } from "@/lib/darnozom-books";
import { CategoryBadge } from "@/components/content/category-badge";
import { SectionHeader } from "@/components/content/section-header";

export function PublicationsRow({ items }: { items: ContentItem[] }) {
  const { language: lang, isArabic } = useLanguage();
  const books = useDarNozomBooks(4);
  const cards = mergePublications(items, books.data ?? [], 4);
  if (cards.length === 0) return null;
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const Arrow = isArabic ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-[1200px] px-5 lg:px-6 mt-14">
      <SectionHeader title={t("الإصدارات", "Publications")} subtitle={t("كتب وتقارير ودوريات في السياسات والإدارة والحوكمة", "Books, reports and periodicals on policy, administration and governance")} href="/publications" linkLabel={t("المكتبة ومتجر الكتب", "Library and book store")} />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <article key={c.key} className="flex bg-white border border-line rounded-[4px] overflow-hidden">
            <div className="flex-1 p-4 flex flex-col gap-2">
              <CategoryBadge>{PUBLICATION_KINDS[c.kind][lang]}</CategoryBadge>
              <h3 className="font-bold text-navy">{lang === "en" && c.titleEn ? c.titleEn : c.titleAr}</h3>
              <Link href={c.href} className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-navy min-h-11">
                {t("تفاصيل الإصدار", "Publication details")} <Arrow className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            {c.imageUrl && <img src={c.imageUrl} alt="" loading="lazy" className="w-24 object-cover" />}
          </article>
        ))}
      </div>
    </section>
  );
}
