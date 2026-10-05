import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
import { NewsletterBlock } from "./newsletter-block";

describe("NewsletterBlock", () => {
  it("requires consent and never claims a subscription", () => {
    render(<NewsletterBlock />);
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: "اشترك في النشرة" }));
    expect(screen.getByText("يرجى الموافقة على استلام الرسائل")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "اشترك في النشرة" }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "النشرة البريدية قيد الإطلاق" }));
  });
});
