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
};

export type CheckoutItem = CartItem & {
  selected: boolean;
};

type CheckoutState = {
  checkoutItems: CheckoutItem[];
};

type CheckoutActions = {
  // Acciones principales
  upsertCheckoutFromCart: (items: CartItem[], makeSelected: boolean) => void;
  upsertSingleToCheckout: (item: CartItem, makeSelected: boolean) => void;
  toggleCheckoutSelect: (productId: string) => void;
  setCheckoutQty: (productId: string, qty: number) => void;
  removeFromCheckout: (productId: string) => void;

  // Acciones de selección
  selectAllCheckout: () => void;
  deselectAllCheckout: () => void;
  clearSelectedFromCheckout: () => void;
  clearCheckout: () => void;
};

export type CheckoutStore = CheckoutState & CheckoutActions;

const initial: CheckoutState = {
  checkoutItems: [],
};

// Helper para generar key única
const getKey = (id: string, variantId?: string) =>
  `${id}:${variantId || "default"}`;

export const useCheckoutStore = create<CheckoutStore>()(
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
      function _safeSet(partial: Partial<CheckoutState>) {
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

        // Acciones principales
        upsertCheckoutFromCart: (items, makeSelected) => {
          _tripwire("upsertCheckoutFromCart", { items, makeSelected });
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
                selected: makeSelected,
              };
            } else {
              // Agregar nuevo
              next.push({
                ...newItem,
                selected: makeSelected,
              });
            }
          });

          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        upsertSingleToCheckout: (item, makeSelected) => {
          _tripwire("upsertSingleToCheckout", { item, makeSelected });
          const checkoutItems = get().checkoutItems;
          const key = getKey(item.id, item.variantId);
          const existingIndex = checkoutItems.findIndex(
            (x) => getKey(x.id, x.variantId) === key,
          );

          let next: CheckoutItem[];
          if (existingIndex >= 0) {
            // Actualizar existente
            next = checkoutItems.map((x, i) =>
              i === existingIndex
                ? { ...x, qty: x.qty + item.qty, selected: makeSelected }
                : x,
            );
          } else {
            // Agregar nuevo
            next = [...checkoutItems, { ...item, selected: makeSelected }];
          }

          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        toggleCheckoutSelect: (productId) => {
          _tripwire("toggleCheckoutSelect", productId);
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.map((x) =>
            getKey(x.id, x.variantId) === productId
              ? { ...x, selected: !x.selected }
              : x,
          );
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        setCheckoutQty: (productId, qty) => {
          _tripwire("setCheckoutQty", { productId, qty });
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.map((x) =>
            getKey(x.id, x.variantId) === productId ? { ...x, qty } : x,
          );
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        removeFromCheckout: (productId) => {
          _tripwire("removeFromCheckout", productId);
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.filter(
            (x) => getKey(x.id, x.variantId) !== productId,
          );
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        // Acciones de selección
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

        clearSelectedFromCheckout: () => {
          _tripwire("clearSelectedFromCheckout");
          const checkoutItems = get().checkoutItems;
          const next = checkoutItems.filter((x) => !x.selected);
          if (next === checkoutItems) return;
          _safeSet({ checkoutItems: next });
        },

        clearCheckout: () => {
          _tripwire("clearCheckout");
          if (get().checkoutItems.length === 0) return;
          _safeSet({ checkoutItems: [] });
        },
      };
    },
    {
      name: "checkout-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        checkoutItems: s.checkoutItems,
      }),
      // Nada de onRehydrateStorage
    },
  ),
);

// Selectores primitivos exportables
export const selectCheckoutItems = (s: CheckoutStore) => s.checkoutItems;
export const selectSelectedItems = (s: CheckoutStore) =>
  s.checkoutItems.filter((i) => i.selected);
export const selectSelectedCount = (s: CheckoutStore) =>
  s.checkoutItems.filter((i) => i.selected).length;
export const selectSelectedTotal = (s: CheckoutStore) =>
  s.checkoutItems.reduce((a, i) => (i.selected ? a + i.price * i.qty : a), 0);
