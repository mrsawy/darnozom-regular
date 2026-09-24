import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StoreBooks from "./store-books";
import * as listStoreBooksMod from "../lib/list-store-books";

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    cart: null,
    isLoading: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  }),
}));

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
  it("filters by Medusa variant format (paper / digital)", async () => {
    vi.spyOn(listStoreBooksMod, "listStoreBooks").mockResolvedValue([
      sampleBook as any,
      paperOnly as any,
    ]);
    vi.spyOn(listStoreBooksMod, "listStoreBookCategories").mockResolvedValue([
      { id: "pcat_mgmt", name: "Management", handle: "management" },
      { id: "pcat_shariah", name: "Shariah", handle: "shariah", nameAr: "الشريعة" },
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
    expect(screen.getByText("Fiqh Basics")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Online" }));
    await waitFor(() => {
      expect(screen.getByText("Digital Transformation Management")).not.toBeNull();
      expect(screen.queryByText("Fiqh Basics")).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Hardcopy" }));
    await waitFor(() => {
      expect(screen.getByText("Digital Transformation Management")).not.toBeNull();
      expect(screen.getByText("Fiqh Basics")).not.toBeNull();
    });
  });

  it("passes Medusa category_id when a category chip is selected", async () => {
    const listSpy = vi
      .spyOn(listStoreBooksMod, "listStoreBooks")
      .mockResolvedValue([sampleBook as any]);
    vi.spyOn(listStoreBooksMod, "listStoreBookCategories").mockResolvedValue([
      { id: "pcat_mgmt", name: "Management", handle: "management" },
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
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: "pcat_mgmt" }),
      ),
    );
  });

  it("has no language filter", async () => {
    vi.spyOn(listStoreBooksMod, "listStoreBooks").mockResolvedValue([]);
    vi.spyOn(listStoreBooksMod, "listStoreBookCategories").mockResolvedValue([]);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <StoreBooks />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Books")).not.toBeNull());
    expect(screen.queryByText("Language")).toBeNull();
    expect(screen.queryByText("Arabic")).toBeNull();
  });
});
