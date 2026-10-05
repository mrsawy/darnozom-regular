import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("renders the four columns in the brief's order", () => {
    render(<SiteFooter />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["دار نظم", "المعرفة والتعلم", "الخدمات والحلول", "تواصل معنا"]);
    expect(screen.getByText("في ضوء مقاصد الشريعة")).toBeTruthy();
    expect(screen.getByText("info@darnozom.com")).toBeTruthy();
  });
  it("switches surface for the light tone", () => {
    const { container, rerender } = render(<SiteFooter />);
    expect(container.querySelector("footer")!.className).toContain("bg-navy-deep");
    rerender(<SiteFooter tone="light" />);
    expect(container.querySelector("footer")!.className).toContain("bg-ivory");
  });
});
