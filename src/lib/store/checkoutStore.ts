// src/lib/store/checkoutStore.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DatosInput, PagoInput } from "@/lib/validations/checkout";
import type { CartItem } from "@/lib/store/cartStore";

type CheckoutState = {
  items: CartItem[];
  datos: DatosInput | null;
  pago: PagoInput | null;
  orderId: string | null;
  setItems: (items: CartItem[]) => void;
  setDatos: (d: DatosInput) => void;
  setPago: (p: PagoInput) => void;
  setOrderId: (id: string) => void;
  clearAll: () => void;
};

export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      items: [],
      datos: null,
      pago: null,
      orderId: null,
      setItems: (items) => set({ items }),
      setDatos: (d) => set({ datos: d }),
      setPago: (p) => set({ pago: p }),
      setOrderId: (id) => set({ orderId: id }),
      clearAll: () =>
        set({ items: [], datos: null, pago: null, orderId: null }),
    }),
    { name: "checkout-mvp" },
  ),
);
