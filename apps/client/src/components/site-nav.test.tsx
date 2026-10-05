import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true, toggleLanguage: vi.fn() }) }));
vi.mock("@/components/nav/account-controls", () => ({ AuthSlot: () => null, MobileAuthSlot: () => null, CartButton: () => null }));
vi.mock("@/components/search-section", () => ({ default: () => <div>search</div> }));

import SiteNav from "./site-nav";

function renderAt(path: string) {
  const { hook, searchHook } = memoryLocation({ path });
  return render(
    <Router hook={hook} searchHook={searchHook}>
      <SiteNav mode="page" />
    </Router>,
  );
}

describe("SiteNav", () => {
  it("renders the seven top-level links", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "القائمة الرئيسية" });
    for (const label of ["عن دار نظم", "خدماتنا", "المعرفة والبحوث", "الأكاديمية", "المكتبة والإصدارات", "الأخبار والفعاليات", "تواصل معنا"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeTruthy();
    }
  });

  it("opens a dropdown from its chevron and closes it with Escape, returning focus", () => {
    renderAt("/");
    const toggle = screen.getByRole("button", { name: "فتح قائمة المعرفة والبحوث" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(panel.textContent).toContain("المرصد");
    expect(panel.textContent).toContain("مركز البحوث والدراسات");
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("marks the active section", () => {
    renderAt("/observatory");
    const link = screen.getAllByRole("link", { name: "المعرفة والبحوث" })[0];
    expect(link.getAttribute("aria-current")).toBe("page");
  });
});
