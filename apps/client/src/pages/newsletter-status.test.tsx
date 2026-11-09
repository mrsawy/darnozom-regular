import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
vi.mock("@/components/site-nav", () => ({ default: () => null }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => null }));
import NewsletterStatusPage from "./newsletter-status";

describe("NewsletterStatusPage", () => {
  it.each([
    ["confirmed", "تم تأكيد اشتراكك"],
    ["unsubscribed", "تم إلغاء اشتراكك"],
    ["whatever", "الرابط غير صالح"],
  ])("%s", (state, title) => {
    render(<NewsletterStatusPage state={state} />);
    expect(screen.getByRole("heading").textContent).toBe(title);
  });
});
