import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart } from "./cart-context";
import * as medusaClient from "./medusa-client";

function TestConsumer() {
  const { cart, addItem, isLoading } = useCart();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="item-count">{cart?.items?.length ?? 0}</span>
      <button onClick={() => addItem("variant_1", 1)}>Add</button>
    </div>
  );
}

describe("CartProvider / useCart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a cart on mount and exposes it via useCart", async () => {
    const fakeCart = { id: "cart_1", items: [] };
    const sdk = {
      store: {
        cart: {
          create: vi.fn().mockResolvedValue({ cart: fakeCart }),
          retrieve: vi.fn().mockResolvedValue({ cart: fakeCart }),
          createLineItem: vi.fn().mockResolvedValue({ cart: { ...fakeCart, items: [{ id: "li_1" }] } }),
        },
      },
    };
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(sdk.store.cart.create).toHaveBeenCalled();

    await userEvent.click(screen.getByText("Add"));
    await waitFor(() => expect(screen.getByTestId("item-count").textContent).toBe("1"));
  });
});
