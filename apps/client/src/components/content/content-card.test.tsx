import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
import { ContentCard } from "./content-card";

const base = {
  id: 1, slug: "s", status: "published", titleAr: "عنوان", titleEn: "", summaryAr: "ملخص", summaryEn: "",
  bodyAr: "", bodyEn: "", coverImageUrl: "/seed/x.webp", area: "sharia_policy", authorAr: "دار نظم", authorEn: "",
  isExternal: false, externalUrl: "", publishedAt: "2026-10-01T00:00:00Z", details: {}, createdAt: "", updatedAt: "",
} as const;

describe("ContentCard", () => {
  it("shows badge, title, CTA verb and links to the detail page", () => {
    render(<ContentCard item={{ ...base, type: "article" } as any} />);
    expect(screen.getByText("مقال")).toBeTruthy();
    const link = screen.getByRole("link", { name: /اقرأ المقال/ });
    expect(link.getAttribute("href")).toBe("/articles/s");
  });
  it("labels external references", () => {
    render(<ContentCard item={{ ...base, type: "observatory", isExternal: true, details: { kind: "daily_brief" } } as any} />);
    expect(screen.getByText("مرجع من جهة أخرى")).toBeTruthy();
  });
  it("shows an event's kind and 'date to be announced' when it has no start time", () => {
    render(<ContentCard item={{ ...base, type: "event", details: { kind: "seminar" } } as any} />);
    expect(screen.getByText("ندوات")).toBeTruthy();
    expect(screen.getByText("الموعد يُعلن لاحقًا")).toBeTruthy();
  });
});
