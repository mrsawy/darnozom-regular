import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ language: "ar", isArabic: true }) }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
import { NewsletterBlock } from "./newsletter-block";

const fill = () => {
  fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), { target: { value: "a@b.co" } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "اشترك في النشرة" }));

afterEach(() => {
  vi.unstubAllGlobals();
  toast.mockClear();
});

describe("NewsletterBlock", () => {
  it("requires consent and does not call the API without it", () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    render(<NewsletterBlock />);
    fill();
    submit();
    expect(screen.getByText("يرجى الموافقة على استلام الرسائل")).toBeTruthy();
    expect(f).not.toHaveBeenCalled();
  });

  it("posts the email and tells the user to check their inbox", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", f);
    render(<NewsletterBlock />);
    fill();
    fireEvent.click(screen.getByRole("checkbox"));
    submit();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "تحقق من بريدك الإلكتروني" })));
    expect(f).toHaveBeenCalledWith("/api/newsletter/subscribe", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ email: "a@b.co", consent: true, locale: "ar" });
  });

  it("shows an error and no success toast when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<NewsletterBlock />);
    fill();
    fireEvent.click(screen.getByRole("checkbox"));
    submit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("تعذّر الاشتراك"));
    expect(toast).not.toHaveBeenCalled();
  });
});
