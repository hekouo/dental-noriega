"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Tipos
export type CartItem = {
  id: string;
  title: string;
  price: number;
  image_url?: string;
  variantId?: string;
  qty: number;
};

export type CheckoutItem = CartItem & {
  selected: boolean;
};

type Item = {
  id: string;
  qty: number;
  selected?: boolean;
  price?: number;
  title?: string;
  image_url?: string;
  variantId?: string;
};

type CheckoutData = {
  nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  notas?: string;
};

type State = {
  checkoutItems: CheckoutItem[];
  datos: CheckoutData | null;
  orderId: string | null;
  ingestFromCart: (cartItems: Item[], clearCart?: boolean) => void;
  upsertSingleToCheckout: (item: Item) => void;
  clearCheckout: () => void;
  toggleCheckoutSelect: (productId: string) => void;
  setCheckoutQty: (productId: string, qty: number) => void;
  removeFromCheckout: (productId: string) => void;
  selectAllCheckout: () => void;
  deselectAllCheckout: () => void;
  clearSelectedFromCheckout: () => void;
  setDatos: (datos: CheckoutData) => void;
  setOrderId: (orderId: string) => void;
};

export const useCheckoutStore = create<State>()(
  persist(
    (set, _get) => ({
      checkoutItems: [],
      datos: null,
      orderId: null,

      ingestFromCart: (cartItems, _clearCart = true) => {
        set((s) => {
          if (!cartItems?.length) return s;
          const byId = new Map(s.checkoutItems.map((i) => [i.id, i]));
          let changed = false;
          for (const it of cartItems) {
            const prev = byId.get(it.id);
            if (!prev) {
              byId.set(it.id, { ...it, selected: true } as CheckoutItem);
              changed = true;
            } else {
              const mergedQty = (prev.qty ?? 1) + (it.qty ?? 1);
              if (mergedQty !== prev.qty || !prev.selected) {
                byId.set(it.id, { ...prev, qty: mergedQty, selected: true });
                changed = true;
              }
            }
          }
          if (!changed) return s;
          return { ...s, checkoutItems: Array.from(byId.values()) };
        });
      },

      upsertSingleToCheckout: (item) => {
        set((state) => {
          const idx = state.checkoutItems.findIndex((i) => i.id === item.id);
          if (idx === -1) {
            return {
              checkoutItems: [
                ...state.checkoutItems,
                { ...item, qty: item.qty ?? 1, selected: true } as CheckoutItem,
              ],
            };
          }
          const curr = state.checkoutItems[idx];
          const nextItem = {
            ...curr,
            qty: (curr.qty ?? 0) + (item.qty ?? 1),
            selected: true,
          };
          if (
            nextItem.qty === curr.qty &&
            !!nextItem.selected === !!curr.selected
          )
            return state;
          const next = state.checkoutItems.slice();
          next[idx] = nextItem;
          return { checkoutItems: next };
        });
      },

      clearCheckout: () => {
        set((state) => {
          if (state.checkoutItems.length === 0) return state;
          return { checkoutItems: [] };
        });
      },

      toggleCheckoutSelect: (productId) => {
        set((state) => {
          const idx = state.checkoutItems.findIndex((i) => i.id === productId);
          if (idx === -1) return state;
          const item = state.checkoutItems[idx];
          const next = state.checkoutItems.slice();
          next[idx] = { ...item, selected: !item.selected };
          return { checkoutItems: next };
        });
      },

      setCheckoutQty: (productId, qty) => {
        set((state) => {
          const idx = state.checkoutItems.findIndex((i) => i.id === productId);
          if (idx === -1) return state;
          const item = state.checkoutItems[idx];
          if (item.qty === qty) return state;
          const next = state.checkoutItems.slice();
          next[idx] = { ...item, qty };
          return { checkoutItems: next };
        });
      },

      removeFromCheckout: (productId) => {
        set((state) => {
          const next = state.checkoutItems.filter((i) => i.id !== productId);
          if (next.length === state.checkoutItems.length) return state;
          return { checkoutItems: next };
        });
      },

      selectAllCheckout: () => {
        set((state) => {
          if (state.checkoutItems.every((i) => i.selected)) return state;
          return {
            checkoutItems: state.checkoutItems.map((i) => ({
              ...i,
              selected: true,
            })),
          };
        });
      },

      deselectAllCheckout: () => {
        set((state) => {
          if (state.checkoutItems.every((i) => !i.selected)) return state;
          return {
            checkoutItems: state.checkoutItems.map((i) => ({
              ...i,
              selected: false,
            })),
          };
        });
      },

      clearSelectedFromCheckout: () => {
        set((state) => {
          const next = state.checkoutItems.filter((i) => !i.selected);
          if (next.length === state.checkoutItems.length) return state;
          return { checkoutItems: next };
        });
      },

      setDatos: (datos: CheckoutData) => {
        set((s) => ({ ...s, datos }));
      },

      setOrderId: (orderId: string) => {
        set((s) => ({ ...s, orderId }));
      },
    }),
    {
      name: "checkout",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {},
      partialize: (s) => ({ checkoutItems: s.checkoutItems }),
      version: 1,
    },
  ),
);

// Selectores primitivos
export const selectCheckoutItems = (state: State) => state.checkoutItems;
export const selectSelectedCount = (state: State) =>
  state.checkoutItems.reduce((a, i) => a + (i.selected ? 1 : 0), 0);
export const selectSelectedTotal = (state: State) =>
  state.checkoutItems.reduce(
    (a, i) => a + (i.selected ? (i.price ?? 0) * (i.qty ?? 1) : 0),
    0,
  );
