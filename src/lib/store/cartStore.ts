"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getWithTTL,
  setWithTTL,
  removeWithTTL,
  KEYS,
} from "@/lib/utils/persist";

// Tipos
export type CartItem = {
  id: string;
  title: string;
  price: number;
  image_url?: string;
  variantId?: string;
  qty: number;
  selected: boolean;
};

type CartState = {
  cartItems: CartItem[];
  hydrated: boolean;
};

type CartActions = {
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  setCartQty: (id: string, variantId: string | undefined, qty: number) => void;
  clearCart: () => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export type CartStore = CartState & CartActions;

const initial: CartState = {
  cartItems: [],
  hydrated: false,
};

// Helper para generar key única
const getKey = (id: string, variantId?: string) =>
  `${id}:${variantId || "default"}`;

// Debounce helper para persistencia
let persistTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 250;

function persistCart(state: CartState) {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    setWithTTL(KEYS.CART, state.cartItems);
  }, DEBOUNCE_MS);
}

// Rehidratar desde localStorage al inicializar
function rehydrateCart(): CartState {
  if (typeof window === "undefined") return initial;
  const stored = getWithTTL<CartItem[]>(KEYS.CART);
  return stored ? { cartItems: stored } : initial;
}

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
      _safeSet({ cartItems: next, hydrated: true });
      persistCart({ cartItems: next, hydrated: true });
    },

    removeFromCart: (id, variantId) => {
      _tripwire("removeFromCart", { id, variantId });
      const cartItems = get().cartItems;
      const key = getKey(id, variantId);
      const next = cartItems.filter((x) => getKey(x.id, x.variantId) !== key);
      if (next === cartItems) return;
      _safeSet({ cartItems: next, hydrated: true });
      persistCart({ cartItems: next, hydrated: true });
    },

    setCartQty: (id, variantId, qty) => {
      _tripwire("setCartQty", { id, variantId, qty });
      const cartItems = get().cartItems;
      const key = getKey(id, variantId);
      const next = cartItems.map((x) =>
        getKey(x.id, x.variantId) === key ? { ...x, qty } : x,
      );
      if (next === cartItems) return;
      _safeSet({ cartItems: next, hydrated: true });
      persistCart({ cartItems: next, hydrated: true });
    },

    clearCart: () => {
      _tripwire("clearCart");
      if (get().cartItems.length === 0) return;
      _safeSet({ cartItems: [], hydrated: true });
      removeWithTTL(KEYS.CART);
    },

    toggleSelect: (id) => {
      _tripwire("toggleSelect", { id });
      set((s) => {
        const idx = s.cartItems.findIndex((i) => i.id === id);
        if (idx < 0) return s;
        const it = s.cartItems[idx];
        const nextSelected = !it.selected;
        if (nextSelected === it.selected) return s; // idempotencia
        const copy = s.cartItems.slice();
        copy[idx] = { ...it, selected: nextSelected };
        persistCart({ cartItems: copy, hydrated: true });
        return { ...s, cartItems: copy, hydrated: true };
      });
    },

    selectAll: () => {
      _tripwire("selectAll");
      set((s) => {
        let changed = false;
        const copy = s.cartItems.map((i) => {
          if (i.selected) return i;
          changed = true;
          return { ...i, selected: true };
        });
        if (changed) persistCart({ cartItems: copy, hydrated: true });
        return changed ? { ...s, cartItems: copy, hydrated: true } : s;
      });
    },

    deselectAll: () => {
      _tripwire("deselectAll");
      set((s) => {
        let changed = false;
        const copy = s.cartItems.map((i) => {
          if (!i.selected) return i;
          changed = true;
          return { ...i, selected: false };
        });
        const next = changed ? { ...s, cartItems: copy, hydrated: true } : s;
        if (changed) persistCart({ cartItems: copy, hydrated: true });
        return next;
      });
    },

        setHydrated: (hydrated) => {
          set({ hydrated });
        },
      };
    },
    {
      name: "ddn_cart",
      partialize: (state) => ({ cartItems: state.cartItems }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
        }
      },
    },
  ),
);

// Selectores primitivos exportables
export const selectCartItems = (s: CartStore) => s.cartItems;
export const selectCartCount = (s: CartStore) =>
  s.cartItems.reduce((sum, item) => sum + item.qty, 0);
export const selectSelectedItems = (s: CartStore) =>
  s.cartItems.filter((i) => i.selected);
export const selectSelectedCount = (s: CartStore) =>
  s.cartItems.filter((i) => i.selected).length;
export const selectSelectedTotal = (s: CartStore) =>
  s.cartItems.reduce(
    (sum, item) => sum + (item.selected ? item.price * item.qty : 0),
    0,
  );
export const selectHydrated = (s: CartStore) => s.hydrated;
export const selectCount = (s: CartStore) => s.cartItems.length;
