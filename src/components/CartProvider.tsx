/* eslint-disable react-refresh/only-export-components */
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, CartState } from "@/lib/cart/types";
import { loadCart, saveCart } from "@/lib/cart/storage";

type Ctx = {
  state: CartState;
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | undefined>(undefined);

export default function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CartState>({ items: [] });

  useEffect(() => {
    setState(loadCart());
  }, []);

  useEffect(() => {
    saveCart(state);
  }, [state]);

  const api: Ctx = useMemo(
    () => ({
      state,
      add: (it) =>
        setState((s) => {
          const qty = Math.max(1, it.qty ?? 1);
          const idx = s.items.findIndex((x) => x.id === it.id);
          if (idx >= 0) {
            const copy = [...s.items];
            copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
            return { items: copy };
          }
          return { items: [...s.items, { ...it, qty }] };
        }),
      remove: (id) =>
        setState((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      setQty: (id, qty) =>
        setState((s) => ({
          items: s.items.map((x) =>
            x.id === id ? { ...x, qty: Math.max(1, qty) } : x,
          ),
        })),
      clear: () => setState({ items: [] }),
    }),
    [state],
  );

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}
