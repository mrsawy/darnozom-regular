import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { HttpTypes } from "@medusajs/types";
import type { ClientHeaders } from "@medusajs/js-sdk";
import { getMedusaClient, getMedusaCustomerToken, getStoreRegionId } from "./medusa-client";
import { variantKind } from "./book-variants";

const CART_ID_STORAGE_KEY = "medusa_cart_id";

// Expansion fields so variant/product metadata is populated on line items.
// Medusa 2.x: `+items.variant` does NOT expand the relation — only flat
// fields like variant_title come back, so format stays null and EditionBadge
// never renders on cart/checkout. Star syntax (`*items.variant`) does expand
// and includes metadata.kind + options (needed for hand-created Admin
// products that lack metadata.kind). product.metadata carries legacyBookId
// for hybrid Express order submission.
const CART_RETRIEVE_FIELDS =
  "*items,*items.variant,*items.variant.options,*items.product,*items.product.metadata";

/**
 * A normalised cart line item for consumption by cart.tsx and checkout.tsx.
 * Derived from the Medusa StoreCart line items with extra fields extracted
 * from variant/product metadata.
 */
export interface CartItem {
  /** Medusa line item ID — used for remove / update quantity calls. */
  lineItemId: string;
  /** Product or line-item title. */
  title: string;
  /** Quantity ordered. */
  quantity: number;
  /** Per-unit price in major currency units (EGP, not piasters). */
  unitPrice: number;
  /** Line total (unitPrice × quantity). */
  total: number;
  /** Product thumbnail URL (may be null). */
  thumbnail: string | null;
  /** Medusa product ID (UUID). */
  productId: string | null;
  /** Medusa variant ID (UUID). */
  variantId: string | null;
  /** Legacy numeric book ID from product.metadata — used for Express order submission. */
  legacyProductId: number | null;
  /** "paper" | "digital" — from variant.metadata.kind. */
  format: string | null;
  /** Product type — always "book" for the current store. */
  type: string;
}

interface CartContextValue {
  /** The raw Medusa StoreCart object. */
  cart: HttpTypes.StoreCart | null;
  /** Whether the cart is currently loading. */
  isLoading: boolean;

  // ── Computed helpers ──────────────────────────────────────────────────
  /** Normalised line items for display. */
  items: CartItem[];
  /** Total number of items (sum of quantities). */
  count: number;
  /** Cart total in major currency units. */
  total: number;
  /** Cart subtotal in major currency units. */
  subtotal: number;
  /** Uppercased currency code (e.g. "EGP"). */
  currency: string;
  /** True if any line item has a non-digital variant. */
  hasPaperItems: boolean;
  /** True if any line item has a digital variant. */
  hasDigitalItems: boolean;

  // ── Mutators ──────────────────────────────────────────────────────────
  addItem: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  /** Clears the cart (removes ID from localStorage, resets state). */
  clear: () => void;
  /** Re-fetches the cart from Medusa (e.g. after navigation back to cart). */
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────

function getLegacyBookId(
  item: HttpTypes.StoreCartLineItem,
): number | null {
  const meta = (item as any).product?.metadata as
    | Record<string, unknown>
    | undefined;
  const raw = meta?.legacyBookId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapLineItems(cart: HttpTypes.StoreCart | null): CartItem[] {
  if (!cart?.items) return [];
  return cart.items.map((li) => {
    // Prefer the expanded variant; fall back to variant_title when the
    // relation wasn't expanded (e.g. stale fields or a createLineItem
    // response that skipped retrieveExpanded).
    const variant =
      li.variant ??
      (typeof (li as { variant_title?: string }).variant_title === "string"
        ? ({ title: (li as { variant_title: string }).variant_title } as HttpTypes.StoreProductVariant)
        : null);
    const kind = variantKind(variant);
    return {
      lineItemId: li.id,
      title: li.title || li.product_title || "",
      quantity: li.quantity,
      unitPrice: li.unit_price ?? 0,
      total: (li.unit_price ?? 0) * li.quantity,
      thumbnail: li.thumbnail || null,
      productId: li.product_id || null,
      variantId: li.variant_id || null,
      legacyProductId: getLegacyBookId(li),
      format: kind,
      type: "book",
    };
  });
}

// ── Provider ──────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback((): ClientHeaders => {
    const token = getMedusaCustomerToken();
    const headers: ClientHeaders = {};
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    return headers;
  }, []);

  // Retrieve or create cart on mount.
  useEffect(() => {
    const sdk = getMedusaClient();
    const existingCartId = localStorage.getItem(CART_ID_STORAGE_KEY);

    (async () => {
      try {
        if (existingCartId) {
          const { cart: existing } = await sdk.store.cart.retrieve(
            existingCartId,
            { fields: CART_RETRIEVE_FIELDS },
            authHeaders(),
          );
          setCart(existing);
        } else {
          const regionId = await getStoreRegionId();
          const { cart: created } = await sdk.store.cart.create(
            { region_id: regionId, currency_code: "egp" },
            {},
            authHeaders(),
          );
          localStorage.setItem(CART_ID_STORAGE_KEY, created.id);
          setCart(created);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [authHeaders]);

  const refreshCart = useCallback(async () => {
    const cartId = localStorage.getItem(CART_ID_STORAGE_KEY);
    if (!cartId) return;
    const sdk = getMedusaClient();
    const { cart: refreshed } = await sdk.store.cart.retrieve(
      cartId,
      { fields: CART_RETRIEVE_FIELDS },
      authHeaders(),
    );
    setCart(refreshed);
  }, [authHeaders]);

  // createLineItem / updateLineItem responses omit expanded
  // variant.options + variant.metadata by default. Without a follow-up
  // retrieve with CART_RETRIEVE_FIELDS, mapLineItems gets format: null and
  // checkout rejects with "Book items must specify a format".
  const retrieveExpanded = useCallback(
    async (cartId: string) => {
      const sdk = getMedusaClient();
      const { cart: refreshed } = await sdk.store.cart.retrieve(
        cartId,
        { fields: CART_RETRIEVE_FIELDS },
        authHeaders(),
      );
      setCart(refreshed);
    },
    [authHeaders],
  );

  const addItem = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.createLineItem(
        cart.id,
        { variant_id: variantId, quantity },
        {},
        authHeaders(),
      );
      await retrieveExpanded(cart.id);
    },
    [cart, authHeaders, retrieveExpanded],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.deleteLineItem(cart.id, lineItemId, {}, authHeaders());
      await retrieveExpanded(cart.id);
    },
    [cart, authHeaders, retrieveExpanded],
  );

  const updateQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity },
        {},
        authHeaders(),
      );
      await retrieveExpanded(cart.id);
    },
    [cart, authHeaders, retrieveExpanded],
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(CART_ID_STORAGE_KEY);
    } catch {
      // localStorage unavailable — non-fatal.
    }
    setCart(null);
  }, []);

  // ── Computed values ─────────────────────────────────────────────────

  const items = useMemo(() => mapLineItems(cart), [cart]);

  const count = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const total = useMemo(() => cart?.total ?? 0, [cart]);

  const subtotal = useMemo(() => cart?.subtotal ?? 0, [cart]);

  const currency = useMemo(
    () => (cart?.currency_code ?? "egp").toUpperCase(),
    [cart],
  );

  const hasPaperItems = useMemo(
    () => items.some((i) => i.format !== "digital"),
    [items],
  );

  const hasDigitalItems = useMemo(
    () => items.some((i) => i.format === "digital"),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
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
        updateQuantity,
        clear,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

/**
 * Same shape as useCart(), but bound to one explicit Medusa cart id instead
 * of the shopper's persisted cart — never reads or writes
 * CART_ID_STORAGE_KEY, so it's invisible to the nav cart badge, /cart, and
 * useCart() elsewhere. Backs the "Buy now" checkout flow: checkout can
 * render/submit against this cart exactly like the normal one, without
 * pulling in whatever else is sitting in the shopper's real cart.
 * Pass `null` to get an inert, always-empty instance (e.g. when a page isn't
 * in buy-now mode but still needs to call the hook unconditionally).
 */
export function useStandaloneCart(cartId: string | null): CartContextValue {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null);
  const [isLoading, setIsLoading] = useState(!!cartId);

  const authHeaders = useCallback((): ClientHeaders => {
    const token = getMedusaCustomerToken();
    const headers: ClientHeaders = {};
    if (token) headers.authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const refreshCart = useCallback(async () => {
    if (!cartId) {
      setCart(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const sdk = getMedusaClient();
      const { cart: fetched } = await sdk.store.cart.retrieve(
        cartId,
        { fields: CART_RETRIEVE_FIELDS },
        authHeaders(),
      );
      setCart(fetched);
    } finally {
      setIsLoading(false);
    }
  }, [cartId, authHeaders]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cartId) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.createLineItem(cartId, { variant_id: variantId, quantity }, {}, authHeaders());
      await refreshCart();
    },
    [cartId, authHeaders, refreshCart],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cartId) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.deleteLineItem(cartId, lineItemId, {}, authHeaders());
      await refreshCart();
    },
    [cartId, authHeaders, refreshCart],
  );

  const updateQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cartId) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.updateLineItem(cartId, lineItemId, { quantity }, {}, authHeaders());
      await refreshCart();
    },
    [cartId, authHeaders, refreshCart],
  );

  // A buy-now cart is scratch state that was never persisted to
  // localStorage — nothing to clear beyond forgetting it locally.
  const clear = useCallback(() => setCart(null), []);

  const items = useMemo(() => mapLineItems(cart), [cart]);
  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const total = useMemo(() => cart?.total ?? 0, [cart]);
  const subtotal = useMemo(() => cart?.subtotal ?? 0, [cart]);
  const currency = useMemo(() => (cart?.currency_code ?? "egp").toUpperCase(), [cart]);
  const hasPaperItems = useMemo(() => items.some((i) => i.format !== "digital"), [items]);
  const hasDigitalItems = useMemo(() => items.some((i) => i.format === "digital"), [items]);

  return {
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
    updateQuantity,
    clear,
    refreshCart,
  };
}

/**
 * Creates a fresh, standalone Medusa cart containing only the given variant.
 * Backs "Buy now": the returned cart id is passed to checkout via
 * `?buyNowCart=`, which loads it through useStandaloneCart instead of the
 * shopper's persisted cart — so completing (or abandoning) it never touches
 * whatever else the shopper already had in their real cart.
 */
export async function createBuyNowCart(variantId: string, quantity = 1): Promise<string> {
  const sdk = getMedusaClient();
  const regionId = await getStoreRegionId();
  const token = getMedusaCustomerToken();
  const headers: ClientHeaders = token ? { authorization: `Bearer ${token}` } : {};
  const { cart } = await sdk.store.cart.create(
    { region_id: regionId, currency_code: "egp" },
    {},
    headers,
  );
  await sdk.store.cart.createLineItem(cart.id, { variant_id: variantId, quantity }, {}, headers);
  return cart.id;
}
