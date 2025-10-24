"use client";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { persist, createJSONStorage } from "zustand/middleware";

// Tipos
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

type Item = {
  id: string;
  qty: number;
  selected?: boolean;
  price?: number;
  title?: string;
  imageUrl?: string;
  variantId?: string;
};

type State = {
  checkoutItems: CheckoutItem[];
  upsertSingleToCheckout: (item: Item, selected?: boolean) => void;
  upsertCheckoutFromCart: (items: Item[], selected?: boolean) => void;
  removeSelected: () => void;
  toggleCheckoutSelect: (productId: string) => void;
  setCheckoutQty: (productId: string, qty: number) => void;
  removeFromCheckout: (productId: string) => void;
  selectAllCheckout: () => void;
  deselectAllCheckout: () => void;
  clearSelectedFromCheckout: () => void;
  clearCheckout: () => void;
};

export const useCheckoutStore = createWithEqualityFn<State>()(
  persist(
    (set, _get) => ({
      checkoutItems: [],

      upsertSingleToCheckout: (item, selected = true) => {
        set((state) => {
          const idx = state.checkoutItems.findIndex((i) => i.id === item.id);
          if (idx === -1) {
            return {
              checkoutItems: [
                ...state.checkoutItems,
                { ...item, selected } as CheckoutItem,
              ],
            };
          }
          const curr = state.checkoutItems[idx];
          const updated = {
            ...curr,
            qty: (curr.qty ?? 0) + (item.qty ?? 1),
            selected,
          };
          if (
            updated.qty === curr.qty &&
            !!updated.selected === !!curr.selected
          )
            return state;
          const next = state.checkoutItems.slice();
          next[idx] = updated;
          return { checkoutItems: next };
        });
      },

      upsertCheckoutFromCart: (items, selected = true) => {
        set((state) => {
          const map = new Map(state.checkoutItems.map((i) => [i.id, i]));
          let changed = false;
          for (const c of items) {
            const prev = map.get(c.id);
            if (!prev) {
              map.set(c.id, { ...c, selected } as CheckoutItem);
              changed = true;
            } else {
              const merged = {
                ...prev,
                qty: (prev.qty ?? 0) + (c.qty ?? 0),
                selected,
              };
              if (
                merged.qty !== prev.qty ||
                !!merged.selected !== !!prev.selected
              ) {
                map.set(c.id, merged);
                changed = true;
              }
            }
          }
          if (!changed) return state;
          return { checkoutItems: Array.from(map.values()) };
        });
      },

      removeSelected: () => {
        set((state) => {
          const next = state.checkoutItems.filter((i) => !i.selected);
          if (next.length === state.checkoutItems.length) return state;
          return { checkoutItems: next };
        });
      },

      toggleCheckoutSelect: (productId) => {
        set((state) => {
          const idx = state.checkoutItems.findIndex((i) => i.id === productId);
          if (idx === -1) return state;
          const item = state.checkoutItems[idx];
          if (item.selected === true) return state;
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

      clearCheckout: () => {
        set((state) => {
          if (state.checkoutItems.length === 0) return state;
          return { checkoutItems: [] };
        });
      },
    }),
    {
      name: "checkout",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (_state) => {
        // No escribir aquí sin condición estricta
      },
      partialize: (s) => ({ checkoutItems: s.checkoutItems }),
    },
  ),
  shallow,
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
