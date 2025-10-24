"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Tipos
export type CartItem = {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  variantId?: string;
  qty: number;
  selected: boolean;
};

type CartState = {
  cartItems: CartItem[];
};

type CartActions = {
  addToCart: (item: Omit<CartItem, 'selected'>) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  setCartQty: (id: string, variantId: string | undefined, qty: number) => void;
  clearCart: () => void;
  toggleSelect: (id: string, variantId?: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
};

export type CartStore = CartState & CartActions;

const initial: CartState = {
  cartItems: [],
};

// Helper para generar key única
const getKey = (id: string, variantId?: string) =>
  `${id}:${variantId || "default"}`;

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
      function _safeSet(partial: Partial<CartState>) {
        if (process.env.NODE_ENV === "development" && _setting) return;
        if (process.env.NODE_ENV === "development") _setting = true;
        try {
          set(partial);
        } finally {
          if (process.env.NODE_ENV === "development") _setting = false;
        }
      }

      return {
        ...initial,

        // Acciones de carrito
        addToCart: (item) => {
          _tripwire("addToCart", item);
          const cartItems = get().cartItems;
          const key = getKey(item.id, item.variantId);
          const existingIndex = cartItems.findIndex(
            (x) => getKey(x.id, x.variantId) === key,
          );

          let next: CartItem[];
          if (existingIndex >= 0) {
            next = cartItems.map((x, i) =>
              i === existingIndex ? { ...x, qty: x.qty + item.qty } : x,
            );
          } else {
            next = [...cartItems, { ...item, selected: true }];
          }

          if (next === cartItems) return;
          _safeSet({ cartItems: next });
        },

        removeFromCart: (id, variantId) => {
          _tripwire("removeFromCart", { id, variantId });
          const cartItems = get().cartItems;
          const key = getKey(id, variantId);
          const next = cartItems.filter(
            (x) => getKey(x.id, x.variantId) !== key,
          );
          if (next === cartItems) return;
          _safeSet({ cartItems: next });
        },

        setCartQty: (id, variantId, qty) => {
          _tripwire("setCartQty", { id, variantId, qty });
          const cartItems = get().cartItems;
          const key = getKey(id, variantId);
          const next = cartItems.map((x) =>
            getKey(x.id, x.variantId) === key ? { ...x, qty } : x,
          );
          if (next === cartItems) return;
          _safeSet({ cartItems: next });
        },

        clearCart: () => {
          _tripwire("clearCart");
          if (get().cartItems.length === 0) return;
          _safeSet({ cartItems: [] });
        },

        toggleSelect: (id, variantId) => {
          _tripwire("toggleSelect", { id, variantId });
          const cartItems = get().cartItems;
          const key = getKey(id, variantId);
          const idx = cartItems.findIndex((x) => getKey(x.id, x.variantId) === key);
          if (idx === -1) return;
          
          const it = cartItems[idx];
          const next = { ...it, selected: !it.selected };
          if (next.selected === it.selected) return;
          
          const copy = cartItems.slice();
          copy[idx] = next;
          _safeSet({ cartItems: copy });
        },

        selectAll: () => {
          _tripwire("selectAll");
          const cartItems = get().cartItems;
          let changed = false;
          const copy = cartItems.map((i) => {
            if (i.selected) return i;
            changed = true;
            return { ...i, selected: true };
          });
          if (!changed) return;
          _safeSet({ cartItems: copy });
        },

        deselectAll: () => {
          _tripwire("deselectAll");
          const cartItems = get().cartItems;
          let changed = false;
          const copy = cartItems.map((i) => {
            if (!i.selected) return i;
            changed = true;
            return { ...i, selected: false };
          });
          if (!changed) return;
          _safeSet({ cartItems: copy });
        },
      };
    },
    {
      name: "cart-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cartItems: s.cartItems,
      }),
      // Nada de onRehydrateStorage
    },
  ),
);

// Selectores primitivos exportables
export const selectCartItems = (s: CartStore) => s.cartItems;
export const selectCartCount = (s: CartStore) =>
  s.cartItems.reduce((sum, item) => sum + item.qty, 0);
export const selectSelectedItems = (s: CartStore) => 
  s.cartItems.filter(item => item.selected);
export const selectSelectedCount = (s: CartStore) =>
  s.cartItems.reduce((sum, item) => sum + (item.selected ? item.qty : 0), 0);
export const selectSelectedTotal = (s: CartStore) =>
  s.cartItems.reduce((sum, item) => sum + (item.selected ? item.price * item.qty : 0), 0);
