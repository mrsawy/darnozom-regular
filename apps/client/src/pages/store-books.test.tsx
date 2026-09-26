import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StoreBooks from "./store-books";
import * as bookCatalog from "../lib/book-catalog";

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    cart: null,
    isLoading: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleBook = {
  id: "prod_1",
  title: "Digital Transformation Management",
  thumbnail: "https://x/cover.jpg",
  metadata: {
    isFeatured: true,
    author: "Ahmed Yosef",
  },
  categories: [{ id: "pcat_mgmt", name: "Management", handle: "management" }],
  variants: [
    {
      id: "variant_paper",
      metadata: { kind: "paper" },
      calculated_price: { calculated_amount: 5000 },
      manage_inventory: false,
      allow_backorder: true,
    },
    {
      id: "variant_digital",
      metadata: { kind: "digital" },
      calculated_price: { calculated_amount: 3000 },
      manage_inventory: false,
      allow_backorder: true,
    },
  ],
};

const paperOnly = {
  id: "prod_2",
  title: "Fiqh Basics",
  metadata: { author: "Omar" },
  categories: [{ id: "pcat_shariah", name: "Shariah", handle: "shariah" }],
  variants: [
    {
      id: "variant_paper_2",
      metadata: { kind: "paper" },
      calculated_price: { calculated_amount: 2000 },
      manage_inventory: false,
      allow_backorder: true,
    },
  ],
};

describe("StoreBooks page", () => {
  it("lists books from the store search API", async () => {
    vi.spyOn(bookCatalog, "searchStoreBooks").mockResolvedValue({
      products: [sampleBook, paperOnly] as any,
      total: 2,
      facets: { authors: [{ value: "Omar", count: 1 }], publishers: [], languages: [] },
    });
    vi.spyOn(bookCatalog, "listBookCategoryTree").mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <StoreBooks />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Digital Transformation Management")).not.toBeNull(),
    );
    expect(screen.getByText("Fiqh Basics")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Hardcopy" })).toBeNull();
  });

  it("passes category_id when a section is selected", async () => {
    const searchSpy = vi.spyOn(bookCatalog, "searchStoreBooks").mockResolvedValue({
      products: [sampleBook as any],
      total: 1,
      facets: { authors: [], publishers: [], languages: [] },
    });
    vi.spyOn(bookCatalog, "listBookCategoryTree").mockResolvedValue([
      { id: "pcat_mgmt", name: "Management", nameAr: null, children: [] },
    ]);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <StoreBooks />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Digital Transformation Management")).not.toBeNull(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Management" }));
    await waitFor(() =>
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category_id: "pcat_mgmt" }),
      ),
    );
  });

  it("shows a language facet filter", async () => {
    vi.spyOn(bookCatalog, "searchStoreBooks").mockResolvedValue({
      products: [],
      total: 0,
      facets: { authors: [], publishers: [], languages: [{ value: "ar", count: 1 }] },
    });
    vi.spyOn(bookCatalog, "listBookCategoryTree").mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <StoreBooks />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Books")).not.toBeNull());
    expect(screen.getByText("Book language")).not.toBeNull();
  });
});
