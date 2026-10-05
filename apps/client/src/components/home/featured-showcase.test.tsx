import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
vi.mock("@/lib/darnozom-books", () => ({ useStoreBook: () => ({ data: null }) }));
import { FeaturedShowcase } from "./featured-showcase";

const card = (id: number, title: string) => ({
  id, sourceKind: "custom", medusaProductId: null, contentType: null, contentKind: null, badgeAr: "برنامج", badgeEn: "",
  titleAr: title, titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "/seed/x.webp", ctaLabelAr: "اكتشف", ctaLabelEn: "", href: `/x/${id}`,
});
const cards = [card(1, "الأول"), card(2, "الثاني"), card(3, "الثالث"), card(4, "الرابع")] as any;
const mainTitle = () => screen.getByTestId("featured-main-title").textContent;

describe("FeaturedShowcase", () => {
  it("shows the first card large and moves with arrows and dots", () => {
    render(<FeaturedShowcase cards={cards} />);
    expect(mainTitle()).toBe("الأول");
    fireEvent.click(screen.getByRole("button", { name: "العنصر التالي" }));
    expect(mainTitle()).toBe("الثاني");
    fireEvent.click(screen.getByRole("button", { name: "العنصر السابق" }));
    fireEvent.click(screen.getByRole("button", { name: "العنصر السابق" }));
    expect(mainTitle()).toBe("الرابع");
    fireEvent.click(screen.getByRole("button", { name: "عرض العنصر 3" }));
    expect(mainTitle()).toBe("الثالث");
  });
  it("selects a side card and marks it current", () => {
    render(<FeaturedShowcase cards={cards} />);
    const side = screen.getByRole("button", { name: /الثاني/ });
    fireEvent.click(side);
    expect(mainTitle()).toBe("الثاني");
    expect(side.getAttribute("aria-current")).toBe("true");
  });
  it("supports arrow keys and announces the title politely", () => {
    render(<FeaturedShowcase cards={cards} />);
    fireEvent.keyDown(screen.getByRole("region", { name: "مختارات دار نظم" }), { key: "ArrowLeft" });
    expect(mainTitle()).toBe("الثاني");
    expect(screen.getByTestId("featured-live").getAttribute("aria-live")).toBe("polite");
  });
  it("opens external card links in a new tab instead of client-side routing", () => {
    const ext = [{ ...card(1, "خارجي"), href: "https://partner.example/page" }, card(2, "داخلي")] as any;
    render(<FeaturedShowcase cards={ext} />);
    const cta = screen.getAllByRole("link").find((a) => a.getAttribute("href") === "https://partner.example/page")!;
    expect(cta).toBeTruthy();
    expect(cta.getAttribute("href")).toBe("https://partner.example/page");
    expect(cta.getAttribute("target")).toBe("_blank");
    expect(cta.getAttribute("rel")).toContain("noopener");
  });
});
