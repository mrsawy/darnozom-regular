import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StoreBooks from "./store-books";
import * as medusaClient from "../lib/medusa-client";

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    cart: null,
    isLoading: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
  }),
}));

describe("StoreBooks page", () => {
  it("renders books fetched from the Medusa Store API", async () => {
    const sdk = {
      store: {
        product: {
          list: vi.fn().mockResolvedValue({
            products: [
              {
                id: "prod_1",
                title: "Digital Transformation Management",
                thumbnail: "https://x/cover.jpg",
                metadata: { isFeatured: true, category: "management", language: "en" },
                variants: [
                  { id: "variant_paper", metadata: { kind: "paper" }, calculated_price: { calculated_amount: 5000 } },
                  { id: "variant_digital", metadata: { kind: "digital" }, calculated_price: { calculated_amount: 3000 } },
                ],
              },
            ],
            count: 1,
          }),
        },
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <StoreBooks />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Digital Transformation Management")).not.toBeNull());
    expect(sdk.store.product.list).toHaveBeenCalled();
  });
});
