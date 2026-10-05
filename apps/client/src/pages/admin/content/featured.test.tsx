import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/pages/admin/_image-upload", () => ({ ImageUploadField: ({ onChange }: any) => <button type="button" onClick={() => onChange("/seed/hero.webp")}>رفع صورة</button> }));
vi.mock("@/lib/book-catalog", () => ({ searchStoreBooks: vi.fn(async () => ({ products: [], total: 0 })) }));

import AdminFeatured from "./featured";

const slide = (id: number, title: string) => ({
  id, position: id, isActive: true, sourceKind: "custom", contentItemId: null, medusaProductId: null,
  badgeAr: "", badgeEn: "", titleAr: title, titleEn: "", summaryAr: "", summaryEn: "", imageUrl: "/x.webp",
  ctaLabelAr: "", ctaLabelEn: "", href: "/academy", linkedTitleAr: null, linkedStatus: null,
});

afterEach(() => vi.unstubAllGlobals());

describe("AdminFeatured", () => {
  it("lists slides and moves one down with the keyboard-accessible button", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/cms/featured" && !init?.method) return new Response(JSON.stringify([slide(1, "أ"), slide(2, "ب")]));
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminFeatured />);
    await screen.findByText("أ");
    fireEvent.click(screen.getAllByRole("button", { name: "تحريك لأسفل" })[0]);
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === "/api/admin/cms/featured/order");
      expect(JSON.parse(String(call![1]!.body))).toEqual({ ids: [2, 1] });
    });
  });

  it("creates a custom card", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/admin/cms/featured" && init?.method === "POST") return new Response(JSON.stringify(slide(9, "جديد")), { status: 201 });
      return new Response(JSON.stringify([]));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminFeatured />);
    fireEvent.click(await screen.findByRole("button", { name: "إضافة بطاقة" }));
    fireEvent.click(screen.getByRole("tab", { name: "بطاقة مخصصة" }));
    fireEvent.change(screen.getByLabelText("العنوان (عربي)"), { target: { value: "جديد" } });
    fireEvent.change(screen.getByLabelText("الرابط"), { target: { value: "/academy" } });
    fireEvent.click(screen.getByText("رفع صورة"));
    fireEvent.click(screen.getByRole("button", { name: "حفظ البطاقة" }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u, i]) => u === "/api/admin/cms/featured" && i?.method === "POST");
      expect(JSON.parse(String(call![1]!.body))).toMatchObject({ sourceKind: "custom", titleAr: "جديد", href: "/academy", imageUrl: "/seed/hero.webp" });
    });
  });
});
