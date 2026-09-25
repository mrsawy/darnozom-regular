import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart } from "./cart-context";
import * as medusaClient from "./medusa-client";

// A minimal Medusa-shaped cart with two line items (one paper, one digital).
const paperLineItem = {
  id: "li_paper",
  title: "Test Book (Paper)",
  quantity: 2,
  unit_price: 100,
  thumbnail: "https://example.com/thumb.jpg",
  variant_id: "variant_paper",
  product_id: "prod_1",
  product_title: "Test Book",
  variant: { metadata: { kind: "paper" } },
  product: { metadata: { legacyBookId: 42 } },
};

const digitalLineItem = {
  id: "li_digital",
  title: "Test Book (Digital)",
  quantity: 1,
  unit_price: 50,
  thumbnail: null,
  variant_id: "variant_digital",
  product_id: "prod_1",
  product_title: "Test Book",
  variant: { metadata: { kind: "digital" } },
  product: { metadata: { legacyBookId: 42 } },
};

const fakeCartEmpty = {
  id: "cart_1",
  items: [],
  total: 0,
  subtotal: 0,
  currency_code: "egp",
};

const fakeCartWithItems = {
  id: "cart_1",
  items: [paperLineItem, digitalLineItem],
  total: 250,
  subtotal: 250,
  currency_code: "egp",
};

function TestConsumer() {
  const {
    cart,
    isLoading,
    items,
    count,
    total,
    subtotal,
    currency,
    hasPaperItems,
    hasDigitalItems,
    addItem,
    removeItem,
    clear,
  } = useCart();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="raw-item-count">{cart?.items?.length ?? 0}</span>
      <span data-testid="items-count">{items.length}</span>
      <span data-testid="count">{count}</span>
      <span data-testid="total">{total}</span>
      <span data-testid="subtotal">{subtotal}</span>
      <span data-testid="currency">{currency}</span>
      <span data-testid="has-paper">{String(hasPaperItems)}</span>
      <span data-testid="has-digital">{String(hasDigitalItems)}</span>
      {items.map((it) => (
        <div key={it.lineItemId} data-testid={`item-${it.lineItemId}`}>
          <span data-testid={`${it.lineItemId}-format`}>{it.format}</span>
          <span data-testid={`${it.lineItemId}-legacy`}>{it.legacyProductId}</span>
          <span data-testid={`${it.lineItemId}-unit`}>{it.unitPrice}</span>
          <span data-testid={`${it.lineItemId}-type`}>{it.type}</span>
        </div>
      ))}
      <button onClick={() => addItem("variant_1", 1)}>Add</button>
      <button onClick={() => removeItem("li_paper")}>Remove</button>
      <button onClick={() => clear()}>Clear</button>
    </div>
  );
}

function makeSdk(
  createResult: any = { cart: fakeCartEmpty },
  retrieveResult: any = { cart: fakeCartWithItems },
) {
  return {
    store: {
      region: {
        list: vi.fn().mockResolvedValue({
          regions: [{ id: "reg_eg", currency_code: "egp" }],
        }),
      },
      cart: {
        create: vi.fn().mockResolvedValue(createResult),
        retrieve: vi.fn().mockResolvedValue(retrieveResult),
        createLineItem: vi.fn().mockResolvedValue({ cart: fakeCartWithItems }),
        deleteLineItem: vi.fn().mockResolvedValue({}),
        updateLineItem: vi.fn().mockResolvedValue({ cart: fakeCartWithItems }),
      },
    },
  };
}

describe("CartProvider / useCart", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(medusaClient, "getStoreRegionId").mockResolvedValue("reg_eg");
  });

  it("creates a cart on mount when no cart ID is stored", async () => {
    const sdk = makeSdk();
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(sdk.store.cart.create).toHaveBeenCalled();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("retrieves existing cart when ID is in localStorage", async () => {
    localStorage.setItem("medusa_cart_id", "cart_1");
    const sdk = makeSdk();
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    // Medusa 2.x: `+items.variant` does NOT expand the relation — format stays
    // null and EditionBadge never renders on cart/checkout. Star syntax does.
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith(
      "cart_1",
      expect.objectContaining({
        fields: expect.stringMatching(/\*items\.variant/),
      }),
      expect.any(Object),
    );
  });

  // Regression: cart retrieve without *items.variant returns only
  // variant_title on the line item (no nested variant). mapLineItems must
  // still resolve paper/digital or the badge stays blank.
  it("detects format from variant_title when the nested variant relation is missing", async () => {
    localStorage.setItem("medusa_cart_id", "cart_1");
    const titleOnlyLine = {
      id: "li_title_only",
      title: "DDDD FG",
      quantity: 1,
      unit_price: 66,
      thumbnail: null,
      variant_id: "variant_digital",
      product_id: "prod_1",
      product_title: "DDDD FG",
      variant_title: "Digital",
      // No nested variant — the shape Medusa returns with +items.variant
      product: { metadata: {} },
    };
    const sdk = makeSdk(
      { cart: fakeCartEmpty },
      { cart: { ...fakeCartWithItems, items: [titleOnlyLine] } },
    );
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("li_title_only-format").textContent).toBe("digital");
    expect(screen.getByTestId("has-digital").textContent).toBe("true");
  });

  it("exposes computed properties (items, count, total, currency, hasPaperItems, hasDigitalItems)", async () => {
    localStorage.setItem("medusa_cart_id", "cart_1");
    const sdk = makeSdk();
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    // items
    expect(screen.getByTestId("items-count").textContent).toBe("2");
    expect(screen.getByTestId("raw-item-count").textContent).toBe("2");

    // count = sum of quantities (2 + 1 = 3)
    expect(screen.getByTestId("count").textContent).toBe("3");

    // total/subtotal from cart-level
    expect(screen.getByTestId("total").textContent).toBe("250");
    expect(screen.getByTestId("subtotal").textContent).toBe("250");

    // currency uppercased
    expect(screen.getByTestId("currency").textContent).toBe("EGP");

    // format detection
    expect(screen.getByTestId("has-paper").textContent).toBe("true");
    expect(screen.getByTestId("has-digital").textContent).toBe("true");

    // Individual item mapping
    expect(screen.getByTestId("li_paper-format").textContent).toBe("paper");
    expect(screen.getByTestId("li_digital-format").textContent).toBe("digital");
    expect(screen.getByTestId("li_paper-legacy").textContent).toBe("42");
    expect(screen.getByTestId("li_paper-unit").textContent).toBe("100");
    expect(screen.getByTestId("li_paper-type").textContent).toBe("book");
  });

  it("addItem calls createLineItem then re-retrieves with expand fields", async () => {
    const sdk = makeSdk();
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    await userEvent.click(screen.getByText("Add"));

    await waitFor(() => expect(screen.getByTestId("items-count").textContent).toBe("2"));
    expect(sdk.store.cart.createLineItem).toHaveBeenCalled();
    // Must re-retrieve after createLineItem so format/options are expanded —
    // otherwise checkout gets format: null.
    expect(sdk.store.cart.retrieve).toHaveBeenCalled();
  });

  it("clear() removes cart ID from localStorage and resets state", async () => {
    localStorage.setItem("medusa_cart_id", "cart_1");
    const sdk = makeSdk();
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("count").textContent).toBe("3");

    await act(async () => {
      screen.getByText("Clear").click();
    });

    expect(localStorage.getItem("medusa_cart_id")).toBeNull();
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  // Regression: checkout rejected an order with "Book items must specify a
  // format (paper or digital)" for a product created by hand in Medusa
  // Admin — its variant has no metadata.kind (only migrate-books.ts sets
  // that), just an option value ("ورقي"). mapLineItems must fall back to
  // the same option-value matching book-variants.ts already does for the
  // product pages, or `format` silently stays null all the way to checkout.
  it("detects format from the variant's option value when metadata.kind is absent (hand-created Admin product)", async () => {
    localStorage.setItem("medusa_cart_id", "cart_1");
    const handCreatedLineItem = {
      id: "li_hand_created",
      title: "كتاب الرحيق المختوم",
      quantity: 1,
      unit_price: 600,
      thumbnail: null,
      variant_id: "variant_hand_created",
      product_id: "prod_hand_created",
      product_title: "كتاب الرحيق المختوم",
      variant: { metadata: {}, options: [{ value: "ورقي" }], title: "ورقي" },
      product: { metadata: {} },
    };
    const sdk = makeSdk(
      { cart: fakeCartEmpty },
      { cart: { ...fakeCartWithItems, items: [handCreatedLineItem] } },
    );
    vi.spyOn(medusaClient, "getMedusaClient").mockReturnValue(sdk as any);

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("li_hand_created-format").textContent).toBe("paper");
    expect(screen.getByTestId("has-paper").textContent).toBe("true");
  });
});
