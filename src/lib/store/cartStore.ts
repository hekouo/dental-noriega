import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

// Tipos
export type CartItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: string;
  code?: string;
  slug?: string;
};

type CartState = {
  items: CartItem[];
  // checkout mode: 'cart' usa items del carrito; 'buy-now' usa overrideItems
  checkoutMode: "cart" | "buy-now";
  overrideItems: CartItem[] | null;

  addItem: (item: CartItem) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  // checkout helpers
  setCheckoutMode: (mode: "cart" | "buy-now") => void;
  setOverrideItems: (items: CartItem[] | null) => void;

  // util
  totalQty: () => number;
  subtotal: () => number;

  // Supabase sync (mantener compatibilidad)
  syncWithSupabase: (userId: string) => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      checkoutMode: "cart",
      overrideItems: null,

      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, qty: i.qty + item.qty } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        }));
      },

      clearCart: () =>
        set((state) => (state.items.length ? { items: [] } : state)),

      // checkout helpers
      setCheckoutMode: (mode) =>
        set((state) =>
          state.checkoutMode === mode ? state : { checkoutMode: mode },
        ),
      setOverrideItems: (items) =>
        set((state) => {
          // Guarda anti-loop: solo actualizar si realmente cambió
          if (
            state.overrideItems === items ||
            JSON.stringify(state.overrideItems) === JSON.stringify(items)
          ) {
            return state;
          }
          return { overrideItems: items };
        }),

      // util
      totalQty: () => get().items.reduce((a, b) => a + b.qty, 0),
      subtotal: () => get().items.reduce((a, b) => a + b.qty * b.price, 0),

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
      name: "cart-storage",
    },
  ),
);

// Selectores estables para evitar re-renders innecesarios
export const selectCartCore = (s: CartState) => ({
  items: s.items,
  checkoutMode: s.checkoutMode,
  overrideItems: s.overrideItems,
});
export const selectCartOps = (s: CartState) => ({
  addItem: s.addItem,
  updateQty: s.updateQty,
  removeItem: s.removeItem,
  clearCart: s.clearCart,
  setCheckoutMode: s.setCheckoutMode,
  setOverrideItems: s.setOverrideItems,
});
export const selectBadgeQty = (s: CartState) =>
  s.items.reduce((a, b) => a + b.qty, 0);
