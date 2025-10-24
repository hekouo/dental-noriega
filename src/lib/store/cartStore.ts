"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// 1.1 Tipos
export type CartItem = {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  variantId?: string;
  qty: number;
};

export type CheckoutItem = CartItem & {
  selected: boolean;
};

type CartState = {
  // Carrito: libre para llenar/vaciar sin afectar checkout
  cartItems: CartItem[];

  // Checkout: conserva sus propios ítems seleccionados
  checkoutItems: CheckoutItem[];
};

type CartActions = {
  // Acciones de carrito
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  setCartQty: (id: string, variantId: string | undefined, qty: number) => void;
  clearCart: () => void;

  // Acciones de checkout
  upsertCheckoutFromCart: (item: CartItem | CartItem[]) => void;
  toggleCheckoutSelect: (key: string) => void;
  setCheckoutQty: (key: string, qty: number) => void;
  removeFromCheckout: (key: string) => void;
  clearUnselected: () => void;
  clearCheckout: () => void;
  selectAllCheckout: () => void;
  deselectAllCheckout: () => void;
};

export type CartStore = CartState & CartActions;

const initial: CartState = {
  cartItems: [],
  checkoutItems: [],
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
            next = [...cartItems, item];
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

        // Acciones de checkout
        upsertCheckoutFromCart: (item) => {
          _tripwire("upsertCheckoutFromCart", item);
          const items = Array.isArray(item) ? item : [item];
          const checkoutItems = get().checkoutItems;

          const next = [...checkoutItems];

          items.forEach((newItem) => {
            const key = getKey(newItem.id, newItem.variantId);
            const existingIndex = next.findIndex(
              (x) => getKey(x.id, x.variantId) === key,
            );

            if (existingIndex >= 0) {
              // Actualizar existente
              next[existingIndex] = {
                ...next[existingIndex],
                qty: next[existingIndex].qty + newItem.qty,
                selected: true, // Marcar como seleccionado
              };
            } else {
              // Agregar nuevo
              next.push({
                ...newItem,
                selected: true,
              });
            }
          });

          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        toggleCheckoutSelect: (key) => {
          _tripwire("toggleCheckoutSelect", key);
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.map((x) =>
            getKey(x.id, x.variantId) === key
              ? { ...x, selected: !x.selected }
              : x,
          );
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        setCheckoutQty: (key, qty) => {
          _tripwire("setCheckoutQty", { key, qty });
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.map((x) =>
            getKey(x.id, x.variantId) === key ? { ...x, qty } : x,
          );
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        removeFromCheckout: (key) => {
          _tripwire("removeFromCheckout", key);
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.filter(
            (x) => getKey(x.id, x.variantId) !== key,
          );
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        clearUnselected: () => {
          _tripwire("clearUnselected");
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.filter((x) => x.selected);
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        clearCheckout: () => {
          _tripwire("clearCheckout");
          if (get().checkoutItems.length === 0) return;
          _safeSet({ checkoutItems: [] });
        },

        selectAllCheckout: () => {
          _tripwire("selectAllCheckout");
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.map((x) => ({ ...x, selected: true }));
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        deselectAllCheckout: () => {
          _tripwire("deselectAllCheckout");
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.map((x) => ({ ...x, selected: false }));
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },
      };
    },
    {
      name: "cart-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cartItems: s.cartItems,
        checkoutItems: s.checkoutItems,
      }),
      // Nada de onRehydrateStorage
    },
  ),
);

// 1.3 Selectores primitivos exportables
export const selectCartItems = (s: CartStore) => s.cartItems;
export const selectCheckoutItems = (s: CartStore) => s.checkoutItems;
export const selectCheckoutSelectedCount = (s: CartStore) =>
  s.checkoutItems.filter((i) => i.selected).length;
export const selectCheckoutSelectedTotal = (s: CartStore) =>
  s.checkoutItems.reduce((a, i) => (i.selected ? a + i.price * i.qty : a), 0);
