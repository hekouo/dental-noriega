"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DatosForm } from "@/lib/checkout/schemas";

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

export type CheckoutStep = "datos" | "pago" | "gracias";

export type ShippingMethod = "pickup" | "standard" | "express";

type State = {
  checkoutItems: CheckoutItem[];
  step: CheckoutStep;
  datos: DatosForm | null;
  orderId: string | null;
  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  couponCode?: string;
  discount?: number;
  discountScope?: "subtotal" | "shipping" | "none";
  ingestFromCart: (cartItems: Item[], clearCart?: boolean) => void;
  upsertSingleToCheckout: (item: Item) => void;
  clearCheckout: () => void;
  toggleCheckoutSelect: (productId: string) => void;
  setCheckoutQty: (productId: string, qty: number) => void;
  removeFromCheckout: (productId: string) => void;
  selectAllCheckout: () => void;
  deselectAllCheckout: () => void;
  clearSelectedFromCheckout: () => void;
  setDatos: (datos: DatosForm) => void;
  setOrderId: (orderId: string) => void;
  setShipping: (method: ShippingMethod, cost: number) => void;
  setCoupon: (code: string, discount: number, scope: "subtotal" | "shipping" | "none") => void;
  clearCoupon: () => void;
  reset: () => void;
};

export const useCheckoutStore = create<State>()(
  persist(
    (set, _get) => ({
      checkoutItems: [],
      step: "datos",
      datos: null,
      orderId: null,
      shippingMethod: undefined,
      shippingCost: undefined,
      couponCode: undefined,
      discount: undefined,
      discountScope: undefined,

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

      setDatos: (datos: DatosForm) => {
        set((s) => ({ ...s, datos, step: "pago" }));
      },

      setOrderId: (orderId: string) => {
        set((s) => ({ ...s, orderId }));
      },

      setShipping: (method: ShippingMethod, cost: number) => {
        set((s) => ({ ...s, shippingMethod: method, shippingCost: cost }));
      },

      setCoupon: (code: string, discount: number, scope: "subtotal" | "shipping" | "none") => {
        set((s) => ({ ...s, couponCode: code, discount, discountScope: scope }));
      },

      clearCoupon: () => {
        set((s) => ({ ...s, couponCode: undefined, discount: undefined, discountScope: undefined }));
      },

      reset: () => {
        set({
          checkoutItems: [],
          step: "datos",
          datos: null,
          orderId: null,
          shippingMethod: undefined,
          shippingCost: undefined,
          couponCode: undefined,
          discount: undefined,
          discountScope: undefined,
        });
      },
    }),
    {
      name: "checkout",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {},
      partialize: (s) => ({
        checkoutItems: s.checkoutItems,
        datos: s.datos,
        step: s.step,
        shippingMethod: s.shippingMethod,
        shippingCost: s.shippingCost,
        couponCode: s.couponCode,
        discount: s.discount,
        discountScope: s.discountScope,
      }),
      version: 2, // Incrementar versión por cambios en estructura
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
