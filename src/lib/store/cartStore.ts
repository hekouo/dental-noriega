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
    (set, get) => {
      // Tripwire de desarrollo (solo en dev)
      let _lastTick = 0;
      let _opsThisTick = 0;
      function _tripwire(op: string, payload?: unknown) {
        if (process.env.NODE_ENV === "development") {
          const now = Date.now();
          if (now - _lastTick > 250) {
            _lastTick = now;
            _opsThisTick = 0;
          }
          _opsThisTick++;
          if (_opsThisTick > 8) {
            // demasiadas mutaciones en <250ms
            // eslint-disable-next-line no-console
            console.groupCollapsed(
              `[TRIPWIRE] Mutaciones excesivas: ${_opsThisTick} en <250ms`,
            );
            // eslint-disable-next-line no-console
            console.trace(`Acción: ${op}`, payload);
            // eslint-disable-next-line no-console
            console.groupEnd();
          }
        }
      }

      // Hotfix anti-reentrada (solo en dev)
      let _setting = false;
      function _safeSet(partial: Partial<State>) {
        if (process.env.NODE_ENV === "development" && _setting) return; // evita reentrada inmediata
        if (process.env.NODE_ENV === "development") _setting = true;
        try {
          set(partial);
        } finally {
          if (process.env.NODE_ENV === "development") _setting = false;
        }
      }

      return {
        ...initial,

        addItem: (it) => {
          _tripwire("addItem", it);
          const items = get().items;
          const idx = items.findIndex((x) => x.id === it.id);
          let next: CartItem[];
          if (idx >= 0)
            next = items.map((x, i) =>
              i === idx ? { ...x, qty: x.qty + it.qty } : x,
            );
          else next = [...items, it];
          if (next === items) return;
          _safeSet({ items: next });
        },

        updateQty: (id, qty) => {
          _tripwire("updateQty", { id, qty });
          const items = get().items;
          const next = items.map((x) => (x.id === id ? { ...x, qty } : x));
          if (next === items) return;
          _safeSet({ items: next });
        },

        removeItem: (id) => {
          _tripwire("removeItem", { id });
          const items = get().items;
          const next = items.filter((x) => x.id !== id);
          if (next === items) return;
          _safeSet({ items: next });
        },

        setCheckoutMode: (m) => {
          _tripwire("setCheckoutMode", m);
          if (get().checkoutMode === m) return;
          _safeSet({ checkoutMode: m });
        },

        setOverrideItems: (arr) => {
          _tripwire("setOverrideItems", arr);
          const prev = get().overrideItems;
          const sameLen = (prev?.length ?? 0) === (arr?.length ?? 0);
          const same =
            sameLen &&
            (prev ?? []).every((p, i) => {
              const q = (arr ?? [])[i];
              return q && q.id === p.id && q.qty === p.qty;
            });
          if (same) return;
          _safeSet({ overrideItems: arr });
        },

        clearCart: () => {
          _tripwire("clearCart");
          if (get().items.length === 0) return;
          _safeSet({ items: [] });
        },

        totalQty: () => get().items.reduce((n, x) => n + x.qty, 0),
        subtotal: () => get().items.reduce((n, x) => n + x.price * x.qty, 0),
      };
    },
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
