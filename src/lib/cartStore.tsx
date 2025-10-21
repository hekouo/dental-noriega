/* eslint-disable react-refresh/only-export-components */
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

export type CartItem = {
  sku: string;
  name: string;
  price?: number;
  qty: number;
};

type CartStore = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
};

const CartContext = createContext<CartStore | null>(null);

const STORAGE_KEY = "ddn_cart_v1";

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function loadFromStorage(): CartItem[] {
  if (!hasStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("cartStore: failed to read localStorage", e);
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("cartStore: failed to write localStorage", e);
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.sku === item.sku);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + item.qty };
        return copy;
      }
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((sku: string) => {
    setItems((prev) => prev.filter((x) => x.sku !== sku));
  }, []);

  const updateQty = useCallback((sku: string, qty: number) => {
    setItems((prev) =>
      prev.map((x) =>
        x.sku === sku ? { ...x, qty: Math.max(1, qty | 0) } : x,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotalValue = useMemo(
    () => items.reduce((sum, it) => sum + (it.price || 0) * it.qty, 0),
    [items],
  );

  const api = useMemo<CartStore>(
    () => ({
      items,
      add,
      remove,
      updateQty,
      clear,
      subtotal: () => subtotalValue,
    }),
    [items, add, remove, updateQty, clear, subtotalValue],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
};

export function useCart(): CartStore {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
