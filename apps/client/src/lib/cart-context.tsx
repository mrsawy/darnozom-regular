import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { HttpTypes } from "@medusajs/types";
import { getMedusaClient, getMedusaCustomerToken } from "./medusa-client";

const CART_ID_STORAGE_KEY = "medusa_cart_id";

interface CartContextValue {
  cart: HttpTypes.StoreCart | null;
  isLoading: boolean;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useCallback(() => {
    const token = getMedusaCustomerToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const sdk = getMedusaClient();
    const existingCartId = localStorage.getItem(CART_ID_STORAGE_KEY);

    (async () => {
      try {
        if (existingCartId) {
          const { cart: existing } = await sdk.store.cart.retrieve(existingCartId, {}, authHeaders());
          setCart(existing);
        } else {
          const { cart: created } = await sdk.store.cart.create(
            { region_id: undefined, currency_code: "egp" },
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

  const addItem = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      const { cart: updated } = await sdk.store.cart.createLineItem(
        cart.id,
        { variant_id: variantId, quantity },
        {},
        authHeaders(),
      );
      setCart(updated);
    },
    [cart, authHeaders],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      await sdk.store.cart.deleteLineItem(cart.id, lineItemId, authHeaders());
      const { cart: refreshed } = await sdk.store.cart.retrieve(cart.id, {}, authHeaders());
      setCart(refreshed);
    },
    [cart, authHeaders],
  );

  const updateQuantity = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return;
      const sdk = getMedusaClient();
      const { cart: updated } = await sdk.store.cart.updateLineItem(
        cart.id,
        lineItemId,
        { quantity },
        {},
        authHeaders(),
      );
      setCart(updated);
    },
    [cart, authHeaders],
  );

  return (
    <CartContext.Provider value={{ cart, isLoading, addItem, removeItem, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
