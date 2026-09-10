import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "darnozom-cart-v1";

export type CartItemType = "book" | "course" | "app";
export type CartItemFormat = "paper" | "digital";

export interface CartItem {
  type: CartItemType;
  productId: number;
  /** Edition format. Required for books, omitted for courses/apps. */
  format?: CartItemFormat | null;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  quantity: number;
}

export type AddItemResult =
  | { ok: true }
  | { ok: false; reason: "currency_mismatch"; existing: string; attempted: string };

interface CartContextValue {
  items: CartItem[];
  count: number;
  /** Sum of line items (no shipping). */
  subtotal: number;
  /** Alias retained for backward compatibility. */
  total: number;
  currency: string;
  /** True when at least one paper book is in the cart (= shipping is required). */
  hasPaperItems: boolean;
  /** True when at least one digital book is in the cart (= PayPal required). */
  hasDigitalItems: boolean;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => AddItemResult;
  removeItem: (type: CartItemType, productId: number, format?: CartItemFormat | null) => void;
  setQuantity: (
    type: CartItemType,
    productId: number,
    qty: number,
    format?: CartItemFormat | null,
  ) => void;
  clear: () => void;
  has: (type: CartItemType, productId: number, format?: CartItemFormat | null) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: { type: CartItemType; productId: number; format?: CartItemFormat | null }, b: { type: CartItemType; productId: number; format?: CartItemFormat | null }) {
  return a.type === b.type && a.productId === b.productId && (a.format ?? null) === (b.format ?? null);
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (it: unknown): it is CartItem =>
          !!it &&
          typeof it === "object" &&
          ["book", "course", "app"].includes((it as CartItem).type) &&
          typeof (it as CartItem).productId === "number" &&
          typeof (it as CartItem).quantity === "number",
      )
      .map((it) => ({
        ...it,
        format: it.format === "paper" || it.format === "digital" ? it.format : null,
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStorage());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // Sync between tabs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, qty: number = 1): AddItemResult => {
      const incoming = (item.currency || "EGP").toUpperCase();
      const normalized: Omit<CartItem, "quantity"> = {
        ...item,
        format: item.format === "paper" || item.format === "digital" ? item.format : null,
      };
      let outcome: AddItemResult = { ok: true };
      setItems((prev) => {
        const existingCurrency = prev.length
          ? (prev[0].currency || "EGP").toUpperCase()
          : "";
        if (existingCurrency && existingCurrency !== incoming) {
          outcome = {
            ok: false,
            reason: "currency_mismatch",
            existing: existingCurrency,
            attempted: incoming,
          };
          return prev;
        }
        const idx = prev.findIndex((p) => sameLine(p, normalized));
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = {
            ...next[idx],
            quantity: Math.min(99, next[idx].quantity + qty),
          };
          return next;
        }
        return [
          ...prev,
          {
            ...normalized,
            currency: incoming,
            quantity: Math.max(1, Math.min(99, qty)),
          },
        ];
      });
      return outcome;
    },
    [],
  );

  const removeItem = useCallback(
    (type: CartItemType, productId: number, format: CartItemFormat | null = null) => {
      setItems((prev) => prev.filter((p) => !sameLine(p, { type, productId, format })));
    },
    [],
  );

  const setQuantity = useCallback(
    (type: CartItemType, productId: number, qty: number, format: CartItemFormat | null = null) => {
      setItems((prev) => {
        const next = prev.slice();
        const idx = next.findIndex((p) => sameLine(p, { type, productId, format }));
        if (idx < 0) return prev;
        const clamped = Math.max(1, Math.min(99, Math.floor(qty) || 1));
        next[idx] = { ...next[idx], quantity: clamped };
        return next;
      });
    },
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback(
    (type: CartItemType, productId: number, format: CartItemFormat | null = null) =>
      items.some((p) => sameLine(p, { type, productId, format })),
    [items],
  );

  const { count, subtotal, currency, hasPaperItems, hasDigitalItems } = useMemo(() => {
    let c = 0;
    let t = 0;
    let cur = "EGP";
    let paper = false;
    let digital = false;
    for (const it of items) {
      c += it.quantity;
      t += it.price * it.quantity;
      if (it.currency) cur = it.currency;
      if (it.type === "book" && it.format === "paper") paper = true;
      if (it.type === "book" && it.format === "digital") digital = true;
    }
    return { count: c, subtotal: t, currency: cur, hasPaperItems: paper, hasDigitalItems: digital };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      total: subtotal,
      currency,
      hasPaperItems,
      hasDigitalItems,
      addItem,
      removeItem,
      setQuantity,
      clear,
      has,
    }),
    [items, count, subtotal, currency, hasPaperItems, hasDigitalItems, addItem, removeItem, setQuantity, clear, has],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within <CartProvider>");
  }
  return ctx;
}
