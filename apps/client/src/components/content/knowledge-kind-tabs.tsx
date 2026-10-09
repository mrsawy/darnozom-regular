import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { DARNOZOM_PUBLISHER } from "@/lib/site-constants";

// Mirrors the prototype's `publicationKinds` tab set and order exactly (files/source/app.full.js).
const KINDS = [
  { id: "books", labelAr: "كتب", labelEn: "Books", href: `/services/store/books?publisher=${encodeURIComponent(DARNOZOM_PUBLISHER)}` },
  { id: "articles", labelAr: "مقالات", labelEn: "Articles", href: "/articles" },
  { id: "studies", labelAr: "دراسات", labelEn: "Studies", href: "/studies" },
  { id: "research", labelAr: "أبحاث علمية", labelEn: "Research Papers", href: "/publications?tab=research" },
  { id: "periodicals", labelAr: "دوريات", labelEn: "Periodicals", href: "/publications?tab=periodical" },
  { id: "observatory", labelAr: "المرصد", labelEn: "Observatory", href: "/observatory" },
] as const;

const tabCls = (active: boolean) =>
  `rounded-full border px-[17px] py-2 text-xs transition-colors ${
    active ? "bg-navy text-white border-navy" : "border-line text-ink-muted bg-transparent hover:text-navy"
  }`;

export function KnowledgeKindTabs({ active }: { active: (typeof KINDS)[number]["id"] | "all" }) {
  const { isArabic } = useLanguage();

  return (
    <div role="tablist" aria-label={isArabic ? "أنواع الإصدارات" : "Publication types"} className="flex flex-wrap gap-2 my-[25px]">
      <Link href="/publications" role="tab" aria-selected={active === "all"} className={tabCls(active === "all")}>
        {isArabic ? "الكل" : "All"}
      </Link>
      {KINDS.map((k) => (
        <Link key={k.id} href={k.href} role="tab" aria-selected={active === k.id} className={tabCls(active === k.id)} data-testid={`knowledge-kind-${k.id}`}>
          {isArabic ? k.labelAr : k.labelEn}
        </Link>
      ))}
    </div>
  );
}
