import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BookProfilePanel, { bookTextDir } from "./book-profile-panel";

const profile = {
  authors: ["وهبة الزحيلي"], editors: [], translators: ["John Doe"], publisher: "دار الفكر",
  isbn: "9780306406157", publication_year: 2020, edition_number: 3, pages: 540, volumes: 2,
  language: "ar" as const, keywords: ["أصول", "اجتهاد"], target_audience: "طلاب الدراسات العليا",
  table_of_contents: "المقدمة\nالباب الأول",
};
const categories = [
  { id: "c1", name: "Fiqh", name_ar: "الفقه وأصوله", handle: "fiqh-usul", parent: { id: "s1", name: "Islamic Law", name_ar: "الشريعة والفكر الإسلامي", handle: "islamic-law-thought" } },
];

describe("BookProfilePanel", () => {
  it("shows every filled field and hides empty ones", () => {
    render(<BookProfilePanel profile={profile} categories={categories} isArabic />);
    expect(screen.getByText("وهبة الزحيلي")).toBeTruthy();
    expect(screen.getByText("John Doe")).toBeTruthy();
    expect(screen.getByText("دار الفكر")).toBeTruthy();
    expect(screen.getByText("978-0-306-40615-7")).toBeTruthy();
    expect(screen.getByText("540")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("الشريعة والفكر الإسلامي › الفقه وأصوله")).toBeTruthy();
    expect(screen.getByText("اجتهاد")).toBeTruthy();
    expect(screen.queryByText("المحرر")).toBeNull(); // no editors
    expect(screen.getByText("الباب الأول", { exact: false })).toBeTruthy();
  });

  it("links a section to the filtered book list", () => {
    render(<BookProfilePanel profile={profile} categories={categories} isArabic />);
    expect(screen.getByText("الشريعة والفكر الإسلامي › الفقه وأصوله").closest("a")?.getAttribute("href")).toBe("/services/store/books?category=c1");
  });
});

describe("bookTextDir", () => {
  it("sets text direction from the book's language", () => {
    expect(bookTextDir("en")).toEqual({ dir: "ltr", lang: "en" });
    expect(bookTextDir("ar")).toEqual({ dir: "rtl", lang: "ar" });
    expect(bookTextDir("both")).toEqual({ dir: "auto", lang: undefined });
  });
});
