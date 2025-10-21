import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, qty: number) => void;
  clearCart: () => void;
  syncWithSupabase: (userId: string) => Promise<void>;
  loadFromSupabase: (userId: string) => Promise<void>;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.sku === item.sku);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.sku === item.sku ? { ...i, qty: i.qty + item.qty } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (sku) => {
        set((state) => ({
          items: state.items.filter((i) => i.sku !== sku),
        }));
      },

      updateQuantity: (sku, qty) => {
        if (qty <= 0) {
          get().removeItem(sku);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.sku === sku ? { ...i, qty } : i)),
        }));
      },

      clearCart: () => set({ items: [] }),

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
              sku: item.sku,
              name: item.name,
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
          const supabaseItems = cart.cart_items.map((item: any) => ({
            sku: item.sku,
            name: item.name,
            price: Number(item.price),
            qty: item.qty,
          }));

          // Fusionar: combinar cantidades si hay duplicados
          const merged = [...supabaseItems];
          localItems.forEach((localItem) => {
            const existing = merged.find((i) => i.sku === localItem.sku);
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

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.qty, 0);
      },
    }),
    {
      name: "cart-storage",
    },
  ),
);
