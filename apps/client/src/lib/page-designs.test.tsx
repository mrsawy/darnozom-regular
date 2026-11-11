import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
vi.mock("@/lib/darnozom-books", () => ({ useStoreBook: () => ({ data: null }) }));
vi.mock("wouter", () => ({ Link: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
import { mergeDesigns, HOME_HERO_DESIGNS, ABOUT_DESIGNS } from "./page-designs";
import { FeaturedShowcase } from "@/components/home/featured-showcase";
import { AboutDesignBody } from "@/components/about/about-variants";
import { DEFAULT_ABOUT } from "./about-content";

const card = (id: number, title: string) => ({
  id, sourceKind: "custom", medusaProductId: null, contentType: null, contentKind: null, badgeAr: "", badgeEn: "",
  titleAr: title, titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "/x.webp", ctaLabelAr: "اكتشف", ctaLabelEn: "", href: `/x/${id}`,
}) as any;

describe("page designs", () => {
  it("falls back to classic for missing or unknown values", () => {
    expect(mergeDesigns(null)).toEqual({ homeHero: "classic", about: "classic" });
    expect(mergeDesigns({ homeHero: "nope", about: "immersive" })).toEqual({ homeHero: "classic", about: "immersive" });
  });
  it.each(HOME_HERO_DESIGNS)("hero design %s renders and navigates", (design) => {
    render(<FeaturedShowcase design={design} cards={[card(1, "الأول"), card(2, "الثاني")]} />);
    expect(screen.getAllByText("الأول").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /^(الثاني|2 \/ 2|العنصر التالي)$/ })[0]);
    expect(screen.getAllByText("الثاني").length).toBeGreaterThan(0);
  });
  it.each(ABOUT_DESIGNS)("about design %s renders every section", (design) => {
    render(<AboutDesignBody design={design} c={DEFAULT_ABOUT} isArabic t={(ar) => ar} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(DEFAULT_ABOUT.titleAr);
    for (const id of ["vision", "mission", "method", "values", "structure"]) expect(document.getElementById(id)).toBeTruthy();
  });
});
