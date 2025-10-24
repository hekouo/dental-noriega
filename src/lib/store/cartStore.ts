import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: string;
  code?: string;
  slug?: string;
};

type CheckoutMode = "cart" | "buy-now";

type State = {
  items: CartItem[];
  checkoutMode: CheckoutMode;
  overrideItems: CartItem[] | null;
};

type Actions = {
  addItem: (it: CartItem) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  setCheckoutMode: (m: CheckoutMode) => void;
  setOverrideItems: (arr: CartItem[] | null) => void;
  clearCart: () => void;
  totalQty: () => number;
  subtotal: () => number;
  // Supabase sync (mantener compatibilidad)
  syncWithSupabase: (userId: string) => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;
};

export type CartStore = State & Actions;

const initial: State = {
  items: [],
  checkoutMode: "cart",
  overrideItems: null,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initial,

      addItem: (it) => {
        const items = get().items;
        const idx = items.findIndex((x) => x.id === it.id);
        let next: CartItem[];
        if (idx >= 0) {
          next = items.map((x, i) =>
            i === idx ? { ...x, qty: x.qty + it.qty } : x,
          );
        } else {
          next = [...items, it];
        }
        if (next === items) return;
        set({ items: next });
      },

      updateQty: (id, qty) => {
        const items = get().items;
        const next = items.map((x) => (x.id === id ? { ...x, qty } : x));
        if (next === items) return;
        set({ items: next });
      },

      removeItem: (id) => {
        const items = get().items;
        const next = items.filter((x) => x.id !== id);
        if (next === items) return;
        set({ items: next });
      },

      setCheckoutMode: (m) => {
        if (get().checkoutMode === m) return;
        set({ checkoutMode: m });
      },

      setOverrideItems: (arr) => {
        const prev = get().overrideItems;
        const sameLen = (prev?.length ?? 0) === (arr?.length ?? 0);
        const sameIds =
          sameLen &&
          (prev ?? []).every(
            (p, i) =>
              p.id === (arr ?? [])[i]?.id && p.qty === (arr ?? [])[i]?.qty,
          );
        if (sameLen && sameIds) return;
        set({ overrideItems: arr });
      },

      clearCart: () => {
        if (get().items.length === 0) return;
        set({ items: [] });
      },

      totalQty: () => get().items.reduce((n, x) => n + x.qty, 0),
      subtotal: () => get().items.reduce((n, x) => n + x.price * x.qty, 0),

      syncWithSupabase: async (userId) => {
        const supabase = createClient();
        const items = get().items;

        // Obtener o crear carrito
        let { data: cart } = await supabase
          .from("carts")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!cart) {
          const { data: newCart } = await supabase
            .from("carts")
            .insert({ user_id: userId })
            .select()
            .single();
          cart = newCart;
        }

        if (!cart) return;

        // Limpiar items existentes
        await supabase.from("cart_items").delete().eq("cart_id", cart.id);

        // Insertar items actuales
        if (items.length > 0) {
          await supabase.from("cart_items").insert(
            items.map((item) => ({
              cart_id: cart.id,
              sku: item.id, // Usar id como sku para compatibilidad
              name: item.title,
              price: item.price,
              qty: item.qty,
            })),
          );
        }
      },

      loadFromSupabase: async (userId) => {
        const supabase = createClient();

        const { data: cart } = await supabase
          .from("carts")
          .select("id, cart_items(*)")
          .eq("user_id", userId)
          .single();

        if (cart?.cart_items) {
          const localItems = get().items;
          const supabaseItems = cart.cart_items.map(
            (item: {
              sku: string;
              name: string;
              price: number;
              qty: number;
            }) => ({
              id: item.sku,
              title: item.name,
              price: Number(item.price),
              qty: item.qty,
            }),
          );

          // Fusionar: combinar cantidades si hay duplicados
          const merged = [...supabaseItems];
          localItems.forEach((localItem) => {
            const existing = merged.find((i) => i.id === localItem.id);
            if (existing) {
              existing.qty += localItem.qty;
            } else {
              merged.push(localItem);
            }
          });

          set({ items: merged });

          // Sincronizar de vuelta a Supabase
          await get().syncWithSupabase(userId);
        }
      },
    }),
    {
      name: "cart-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        items: s.items,
        checkoutMode: s.checkoutMode,
        overrideItems: s.overrideItems,
      }),
      // Nada de onRehydrateStorage. Causa loops.
    },
  ),
);

// SELECTORES PRIMITIVOS, ESTABLES (definidos fuera)
export const selectItems = (s: CartStore) => s.items;
export const selectMode = (s: CartStore) => s.checkoutMode;
export const selectOverride = (s: CartStore) => s.overrideItems;
export const selectOps = (s: CartStore) => ({
  addItem: s.addItem,
  updateQty: s.updateQty,
  removeItem: s.removeItem,
  setCheckoutMode: s.setCheckoutMode,
  setOverrideItems: s.setOverrideItems,
  clearCart: s.clearCart,
});
export const selectBadgeQty = (s: CartStore) =>
  s.items.reduce((n, x) => n + x.qty, 0);
