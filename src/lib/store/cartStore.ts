"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: string;
  code?: string;
  slug?: string;
};

type CheckoutMode = "cart" | "buy-now";

type State = {
  items: CartItem[];
  checkoutMode: CheckoutMode;
  overrideItems: CartItem[] | null;
};
type Actions = {
  addItem: (it: CartItem) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  setCheckoutMode: (m: CheckoutMode) => void;
  setOverrideItems: (arr: CartItem[] | null) => void;
  clearCart: () => void;
  totalQty: () => number;
  subtotal: () => number;
};
export type CartStore = State & Actions;

const initial: State = { items: [], checkoutMode: "cart", overrideItems: null };

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initial,

      addItem: (it) => {
        const items = get().items;
        const idx = items.findIndex((x) => x.id === it.id);
        let next: CartItem[];
        if (idx >= 0)
          next = items.map((x, i) =>
            i === idx ? { ...x, qty: x.qty + it.qty } : x,
          );
        else next = [...items, it];
        if (next === items) return;
        set({ items: next });
      },

      updateQty: (id, qty) => {
        const items = get().items;
        const next = items.map((x) => (x.id === id ? { ...x, qty } : x));
        if (next === items) return;
        set({ items: next });
      },

      removeItem: (id) => {
        const items = get().items;
        const next = items.filter((x) => x.id !== id);
        if (next === items) return;
        set({ items: next });
      },

      setCheckoutMode: (m) => {
        if (get().checkoutMode === m) return;
        set({ checkoutMode: m });
      },

      setOverrideItems: (arr) => {
        const prev = get().overrideItems;
        const sameLen = (prev?.length ?? 0) === (arr?.length ?? 0);
        const same =
          sameLen &&
          (prev ?? []).every((p, i) => {
            const q = (arr ?? [])[i];
            return q && q.id === p.id && q.qty === p.qty;
          });
        if (same) return;
        set({ overrideItems: arr });
      },

      clearCart: () => {
        if (get().items.length === 0) return;
        set({ items: [] });
      },

      totalQty: () => get().items.reduce((n, x) => n + x.qty, 0),
      subtotal: () => get().items.reduce((n, x) => n + x.price * x.qty, 0),
    }),
    {
      name: "cart-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        items: s.items,
        checkoutMode: s.checkoutMode,
        overrideItems: s.overrideItems,
      }),
      // Nada de onRehydrateStorage
    },
  ),
);

// SELECTORES PRIMITIVOS (no crean objetos por render)
export const selectItems = (s: CartStore) => s.items;
export const selectMode = (s: CartStore) => s.checkoutMode;
export const selectOverride = (s: CartStore) => s.overrideItems;
export const selectBadgeQty = (s: CartStore) =>
  s.items.reduce((n, x) => n + x.qty, 0);
// Acciones agrupadas; se consumen vía desestructuración, no se ponen en deps de efectos
export const selectOps = (s: CartStore) => ({
  addItem: s.addItem,
  updateQty: s.updateQty,
  removeItem: s.removeItem,
  setCheckoutMode: s.setCheckoutMode,
  setOverrideItems: s.setOverrideItems,
  clearCart: s.clearCart,
});
