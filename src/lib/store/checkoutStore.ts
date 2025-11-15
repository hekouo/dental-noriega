"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  price_cents?: number; // Precio en centavos (opcional para compatibilidad)
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
  price_cents?: number; // Precio en centavos (opcional para compatibilidad)
  title?: string;
  image_url?: string;
  variantId?: string;
};

export type CheckoutStep = "datos" | "pago" | "gracias";

export type ShippingMethod = "pickup" | "standard" | "express";

type CheckoutPersisted = {
  step: CheckoutStep;
  datos: DatosForm | null;
  checkoutItems: CheckoutItem[]; // Persistir items también
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
  clearSelection: () => void;
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
    checkoutItems: stored.checkoutItems || [], // Restaurar items
    shippingMethod: stored.shippingMethod,
    shippingCost: stored.shippingCost,
    couponCode: stored.couponCode,
    discount: stored.discount,
    discountScope: stored.discountScope,
    lastAppliedCoupon: stored.lastAppliedCoupon,
  };
}

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
    lastAppliedCoupon: undefined,

    ingestFromCart: (cartItems, _clearCart = true) => {
      set((s) => {
        if (!cartItems?.length) return s;
        const byId = new Map(s.checkoutItems.map((i) => [i.id, i]));
        let changed = false;
        for (const it of cartItems) {
          // Calcular price_cents si no existe
          const priceCents =
            typeof it.price_cents === "number"
              ? it.price_cents
              : typeof it.price === "number"
                ? Math.round(it.price * 100)
                : 0;
          
          const enrichedItem = {
            ...it,
            price_cents: priceCents,
            selected: true,
          } as CheckoutItem;
          
          const prev = byId.get(it.id);
          if (!prev) {
            byId.set(it.id, enrichedItem);
            changed = true;
          } else {
            const mergedQty = (prev.qty ?? 1) + (it.qty ?? 1);
            // Preservar price_cents del item previo si existe, sino usar el nuevo
            const mergedPriceCents = prev.price_cents ?? priceCents;
            if (mergedQty !== prev.qty || !prev.selected || mergedPriceCents !== prev.price_cents) {
              byId.set(it.id, { ...prev, qty: mergedQty, selected: true, price_cents: mergedPriceCents });
              changed = true;
            }
          }
        }
        if (!changed) return s;
        const nextItems = Array.from(byId.values());
        // Persistir items también
        persistCheckout({
          step: s.step,
          datos: s.datos,
          checkoutItems: nextItems,
          shippingMethod: s.shippingMethod,
          shippingCost: s.shippingCost,
          couponCode: s.couponCode,
          discount: s.discount,
          discountScope: s.discountScope,
          lastAppliedCoupon: s.lastAppliedCoupon,
        });
        return { ...s, checkoutItems: nextItems };
      });
    },

    upsertSingleToCheckout: (item) => {
      set((state) => {
        // Calcular price_cents si no existe
        const priceCents =
          typeof item.price_cents === "number"
            ? item.price_cents
            : typeof item.price === "number"
              ? Math.round(item.price * 100)
              : 0;
        
        const enrichedItem = {
          ...item,
          price_cents: priceCents,
        };
        
        const idx = state.checkoutItems.findIndex((i) => i.id === item.id);
        let nextItems: CheckoutItem[];
        if (idx === -1) {
          nextItems = [
            ...state.checkoutItems,
            { ...enrichedItem, qty: item.qty ?? 1, selected: true } as CheckoutItem,
          ];
        } else {
          const curr = state.checkoutItems[idx];
          // Preservar price_cents del item existente si existe, sino usar el nuevo
          const finalPriceCents = curr.price_cents ?? priceCents;
          const nextItem = {
            ...curr,
            qty: (curr.qty ?? 0) + (item.qty ?? 1),
            selected: true,
            price_cents: finalPriceCents,
          };
          if (
            nextItem.qty === curr.qty &&
            !!nextItem.selected === !!curr.selected &&
            nextItem.price_cents === curr.price_cents
          )
            return state;
          nextItems = state.checkoutItems.slice();
          nextItems[idx] = nextItem;
        }
        // Persistir items también
        persistCheckout({
          step: state.step,
          datos: state.datos,
          checkoutItems: nextItems,
          shippingMethod: state.shippingMethod,
          shippingCost: state.shippingCost,
          couponCode: state.couponCode,
          discount: state.discount,
          discountScope: state.discountScope,
          lastAppliedCoupon: state.lastAppliedCoupon,
        });
        return { checkoutItems: nextItems };
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

    clearSelection: () => {
      set((state) => {
        // Limpiar completamente checkoutItems y selección después de pago exitoso
        const next = {
          ...state,
          checkoutItems: [],
          couponCode: undefined,
          discount: undefined,
          discountScope: undefined,
          // Mantener datos y shipping por si el usuario quiere hacer otra compra
        };
        persistCheckout({
          step: "datos",
          datos: next.datos,
          checkoutItems: [],
          shippingMethod: next.shippingMethod,
          shippingCost: next.shippingCost,
          couponCode: undefined,
          discount: undefined,
          discountScope: undefined,
          lastAppliedCoupon: next.lastAppliedCoupon,
        });
        return next;
      });
    },

    setDatos: (datos: DatosForm) => {
      set((s) => {
        // Asegurar que checkoutItems esté presente antes de avanzar a pago
        // Si viene del flujo normal (checkout → datos), los items ya deberían estar
        // Si viene de "Comprar ahora", también deberían estar
        // Pero por seguridad, si no hay items, intentar obtenerlos de los seleccionados
        const finalItems = s.checkoutItems;
        if (finalItems.length === 0) {
          // Si no hay items, mantener vacío (el guard en pago lo manejará)
          // No intentar leer de cartStore aquí para evitar dependencias circulares
        }
        const next = { ...s, datos, step: "pago" as CheckoutStep, checkoutItems: finalItems };
        persistCheckout({
          step: next.step,
          datos: next.datos,
          checkoutItems: finalItems,
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
          checkoutItems: next.checkoutItems,
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
          checkoutItems: next.checkoutItems,
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
          checkoutItems: next.checkoutItems,
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
  }),
  {
    name: "ddn_checkout",
    partialize: (state) => ({
      step: state.step,
      datos: state.datos,
      checkoutItems: state.checkoutItems, // Persistir items también
      shippingMethod: state.shippingMethod,
      shippingCost: state.shippingCost,
      couponCode: state.couponCode,
      discount: state.discount,
      discountScope: state.discountScope,
      lastAppliedCoupon: state.lastAppliedCoupon,
    }),
  },
  ),
);

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
  const name = datos.name;
  const email = datos.email;
  const baseOk = !!name && name.trim().length >= 2 && !!email && email.includes("@");
  
  if (!baseOk) return false;
  
  // Si el método de envío es pickup, solo necesitamos nombre y email
  if (shippingMethod === "pickup") {
    return baseOk;
  }
  
  // Si el método de envío requiere dirección (no es pickup), validar dirección completa
  const address = datos.address;
  const city = datos.city;
  const estado = datos.state;
  const zip = datos.cp; // cp es el código postal
  
  return baseOk && !!address && address.trim().length >= 5 && !!city && city.trim().length > 0 && !!estado && estado.trim().length > 0 && !!zip && /^\d{5}$/.test(zip);
};
