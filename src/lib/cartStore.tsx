// src/lib/cartStore.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { sku: string; name: string; price?: number; qty: number };

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

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  const api = useMemo<CartStore>(() => ({
    items,
    add: (item) => {
      setItems((prev) => {
        const i = prev.findIndex((x) => x.sku === item.sku);
        if (i >= 0) {
          const copy = [...prev];
          copy[i] = { ...copy[i], qty: copy[i].qty + item.qty };
          return copy;
        }
        return [...prev, item];
      });
    },
    remove: (sku) => setItems((prev) => prev.filter((x) => x.sku !== sku)),
    updateQty: (sku, qty) =>
      setItems((prev) => prev.map((x) => (x.sku === sku ? { ...x, qty: Math.max(1, qty | 0) } : x))),
    clear: () => setItems([]),
    subtotal: () => items.reduce((sum, it) => sum + (it.price || 0) * it.qty, 0),
  }), [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
};

export function useCart(): CartStore {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}


