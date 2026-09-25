import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryFilter from "./category-filter";

const tree = [
  { id: "s1", name: "Islamic Sciences", nameAr: "العلوم الإسلامية", children: [{ id: "c1", name: "Hadith", nameAr: "الحديث", children: [] }] },
  { id: "s2", name: "Public Policies", nameAr: "السياسات العامة", children: [] },
];

describe("CategoryFilter", () => {
  it("shows sections in the shopper's language and opens the selected section's subcategories", () => {
    const onSelect = vi.fn();
    render(<CategoryFilter tree={tree} selectedId="c1" onSelect={onSelect} isArabic allLabel="الكل" />);
    expect(screen.getByText("العلوم الإسلامية")).toBeTruthy();
    expect(screen.getByText("الحديث").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("السياسات العامة"));
    expect(onSelect).toHaveBeenCalledWith("s2");
    fireEvent.click(screen.getByText("الكل"));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("hides subcategories of sections that aren't selected", () => {
    render(<CategoryFilter tree={tree} selectedId="s2" onSelect={() => {}} isArabic={false} allLabel="All" />);
    expect(screen.queryByText("Hadith")).toBeNull();
  });
});
