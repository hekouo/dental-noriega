import { useCartStore } from "./cartStore";
import { useMemo } from "react";

export function useCartItems() {
  // devuelve siempre la MISMA referencia si no cambió
  return useCartStore(s => s.cartItems);
}

export function useSelectedIds() {
  const items = useCartStore(s => s.cartItems);
  // memorizado por entrada
  return useMemo(() => items.filter(i => i.selected).map(i => i.id), [items]);
}

export function useSelectedCount() {
  return useCartStore(s => s.cartItems.reduce((n, i) => n + (i.selected ? 1 : 0), 0));
}

export function useSelectedTotal() {
  return useCartStore(s => s.cartItems.reduce((sum, i) => sum + (i.selected ? i.price * i.qty : 0), 0));
}

export function useSelectedItems() {
  const items = useCartStore(s => s.cartItems);
  return useMemo(() => items.filter(i => i.selected), [items]);
}

/**
 * Selector para obtener el total de items en el carrito (suma de qty)
 * Zustand optimiza automáticamente los rerenders si el valor calculado no cambia
 */
export function useCartTotalQty() {
  return useCartStore((s) =>
    s.cartItems.reduce((sum, item) => sum + (item.qty ?? 1), 0)
  );
}
