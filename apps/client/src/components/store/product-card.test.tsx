import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/language-context", () => ({ useLanguage: () => ({ isArabic: false }) }));
vi.mock("@/lib/cart-context", () => ({ useCart: () => ({ addItem: vi.fn() }) }));

import ProductCard from "./product-card";

const base = { id: "p1", type: "book" as const, title: "A Book", price: "50", currency: "EGP" };

describe("ProductCard editions", () => {
  it("shows both editions when a book has paper and digital", () => {
    render(<ProductCard item={{ ...base, paperAvailable: true, digitalAvailable: true } as any} />);
    expect(screen.getByTestId("card-edition-paper").textContent).toContain("Paper");
    expect(screen.getByTestId("card-edition-digital").textContent).toContain("Digital");
  });

  it("shows only the edition the card's Add to cart button buys", () => {
    render(
      <ProductCard
        item={{ ...base, paperAvailable: false, digitalAvailable: true, variantId: "v_d" } as any}
      />,
    );
    expect(screen.getByTestId("card-edition-digital")).toBeTruthy();
    expect(screen.queryByTestId("card-edition-paper")).toBeNull();
  });

  it("shows no edition chips for non-book items", () => {
    render(<ProductCard item={{ ...base, type: "course" } as any} />);
    expect(screen.queryByTestId("card-edition-paper")).toBeNull();
    expect(screen.queryByTestId("card-edition-digital")).toBeNull();
  });
});
