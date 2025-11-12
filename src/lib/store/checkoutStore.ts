"use client";

import { create } from "zustand";
import {
  getWithTTL,
  setWithTTL,
  removeWithTTL,
  KEYS,
} from "@/lib/utils/persist";
import type { DatosForm } from "@/lib/checkout/schemas";
import type { DiscountScope } from "@/lib/discounts/coupons";

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

type CheckoutPersisted = {
  step: CheckoutStep;
  datos: DatosForm | null;
  shippingMethod?: ShippingMethod;
  shippingCost?: number;
  couponCode?: string;
  discount?: number;
  discountScope?: DiscountScope;
  lastAppliedCoupon?: string; // Último cupón aplicado exitosamente
};

type State = CheckoutPersisted & {
  checkoutItems: CheckoutItem[];
  orderId: string | null;
  lastAppliedCoupon?: string;
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
  setCoupon: (code: string, discount: number, scope: DiscountScope) => void;
  clearCoupon: () => void;
  reset: () => void;
};

// Debounce helper para persistencia
let persistTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 250;

function persistCheckout(state: CheckoutPersisted) {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    setWithTTL(KEYS.CHECKOUT, state);
  }, DEBOUNCE_MS);
}

// Rehidratar desde localStorage al inicializar
function rehydrateCheckout(): Partial<State> {
  if (typeof window === "undefined") return {};
  const stored = getWithTTL<CheckoutPersisted>(KEYS.CHECKOUT);
  if (!stored) return {};
  return {
    step: stored.step || "datos",
    datos: stored.datos || null,
    shippingMethod: stored.shippingMethod,
    shippingCost: stored.shippingCost,
    couponCode: stored.couponCode,
    discount: stored.discount,
    discountScope: stored.discountScope,
    lastAppliedCoupon: stored.lastAppliedCoupon,
  };
}

export const useCheckoutStore = create<State>()((set, _get) => {
  return {
    checkoutItems: [],
    step: "datos",
    datos: null,
    orderId: null,
    shippingMethod: undefined,
    shippingCost: undefined,
    couponCode: undefined,
    discount: undefined,
    discountScope: undefined,
    lastAppliedCoupon: undefined,

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
      set((s) => {
        const next = { ...s, datos, step: "pago" as CheckoutStep };
        persistCheckout({
          step: next.step,
          datos: next.datos,
          shippingMethod: next.shippingMethod,
          shippingCost: next.shippingCost,
          couponCode: next.couponCode,
          discount: next.discount,
          discountScope: next.discountScope,
          lastAppliedCoupon: next.lastAppliedCoupon,
        });
        return next;
      });
    },

    setOrderId: (orderId: string) => {
      set((s) => ({ ...s, orderId }));
    },

    setShipping: (method: ShippingMethod, cost: number) => {
      set((s) => {
        const next = { ...s, shippingMethod: method, shippingCost: cost };
        persistCheckout({
          step: next.step,
          datos: next.datos,
          shippingMethod: next.shippingMethod,
          shippingCost: next.shippingCost,
          couponCode: next.couponCode,
          discount: next.discount,
          discountScope: next.discountScope,
          lastAppliedCoupon: next.lastAppliedCoupon,
        });
        return next;
      });
    },

    setCoupon: (code: string, discount: number, scope: DiscountScope) => {
      set((s) => {
        const next = {
          ...s,
          couponCode: code,
          discount,
          discountScope: scope,
          lastAppliedCoupon: code, // Guardar último cupón aplicado
        };
        persistCheckout({
          step: next.step,
          datos: next.datos,
          shippingMethod: next.shippingMethod,
          shippingCost: next.shippingCost,
          couponCode: next.couponCode,
          discount: next.discount,
          discountScope: next.discountScope,
          lastAppliedCoupon: next.lastAppliedCoupon,
        });
        return next;
      });
    },

    clearCoupon: () => {
      set((s) => {
        const next = {
          ...s,
          couponCode: undefined,
          discount: undefined,
          discountScope: undefined,
          // lastAppliedCoupon se mantiene para referencia
        };
        persistCheckout({
          step: next.step,
          datos: next.datos,
          shippingMethod: next.shippingMethod,
          shippingCost: next.shippingCost,
          couponCode: next.couponCode,
          discount: next.discount,
          discountScope: next.discountScope,
          lastAppliedCoupon: next.lastAppliedCoupon,
        });
        return next;
      });
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
        lastAppliedCoupon: undefined,
      });
      removeWithTTL(KEYS.CHECKOUT);
    },
  };
});

// Rehidratar al montar en cliente
if (typeof window !== "undefined") {
  const rehydrated = rehydrateCheckout();
  if (Object.keys(rehydrated).length > 0) {
    useCheckoutStore.setState(rehydrated);
  }
}

// Selectores primitivos
export const selectCheckoutItems = (state: State) => state.checkoutItems;
export const selectSelectedCount = (state: State) =>
  state.checkoutItems.reduce((a, i) => a + (i.selected ? 1 : 0), 0);
export const selectSelectedTotal = (state: State) =>
  state.checkoutItems.reduce(
    (a, i) => a + (i.selected ? (i.price ?? 0) * (i.qty ?? 1) : 0),
    0,
  );

// Selector para validar que los datos de checkout están completos
export const selectIsCheckoutDataComplete = (state: State): boolean => {
  const { datos, shippingMethod } = state;
  
  if (!datos) return false;
  
  // Validar campos básicos requeridos siempre
  if (!datos.name || datos.name.trim().length < 2) return false;
  if (!datos.email || !datos.email.includes("@")) return false;
  
  // Si el método de envío requiere dirección (no es pickup), validar dirección completa
  if (shippingMethod && shippingMethod !== "pickup") {
    if (!datos.address || datos.address.trim().length < 5) return false;
    if (!datos.neighborhood || datos.neighborhood.trim().length === 0) return false;
    if (!datos.city || datos.city.trim().length === 0) return false;
    if (!datos.state || datos.state.trim().length === 0) return false;
    if (!datos.cp || !/^\d{5}$/.test(datos.cp)) return false;
  }
  
  return true;
};
