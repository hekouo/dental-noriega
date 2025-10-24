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

type Mode = "cart" | "buy-now";

type CartState = {
  items: CartItem[];
  checkoutMode: Mode;
  overrideItems: CartItem[] | null;

  addItem: (i: CartItem) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  setCheckoutMode: (m: Mode) => void;
  setOverrideItems: (list: CartItem[] | null) => void;

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

      addItem: (i) => {
        set((s) => {
          const idx = s.items.findIndex((x) => x.id === i.id);
          if (idx === -1) return { items: [...s.items, i] };
          const next = [...s.items];
          next[idx] = { ...next[idx], qty: next[idx].qty + i.qty };
          return { items: next };
        });
      },
      updateQty: (id, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearCart: () => set((s) => (s.items.length ? { items: [] } : s)),

      setCheckoutMode: (m) =>
        set((s) => (s.checkoutMode === m ? s : { checkoutMode: m })),
      setOverrideItems: (list) => {
        // Guardas idempotentes: comparar con estado actual
        const curr = get().overrideItems;
        const same =
          (curr === null && list === null) ||
          (Array.isArray(curr) &&
            Array.isArray(list) &&
            curr.length === list.length &&
            curr.every((x, k) => x.id === list[k].id && x.qty === list[k].qty));
        if (same) return;
        set({ overrideItems: list });
      },

      totalQty: () => get().items.reduce((a, b) => a + b.qty, 0),
      subtotal: () => get().items.reduce((a, b) => a + b.price * b.qty, 0),

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
      // NO sets aquí. Cualquier migración se hace con "partialize" o "version/migrate".
      version: 1,
      // No set en onRehydrateStorage, deja vacío
      onRehydrateStorage: () => () => {},
      // Evita que funciones se serialicen
      partialize: (s) => ({
        items: s.items,
        checkoutMode: s.checkoutMode,
        overrideItems: s.overrideItems,
      }),
    },
  ),
);

// Selectores estables: no crear objetos nuevos
export const selectItems = (s: CartState) => s.items;
export const selectMode = (s: CartState) => s.checkoutMode;
export const selectOverride = (s: CartState) => s.overrideItems;
export const selectOps = (s: CartState) => ({
  addItem: s.addItem,
  updateQty: s.updateQty,
  removeItem: s.removeItem,
  clearCart: s.clearCart,
  setCheckoutMode: s.setCheckoutMode,
  setOverrideItems: s.setOverrideItems,
});
export const selectBadgeQty = (s: CartState) =>
  s.items.reduce((a, b) => a + b.qty, 0);
