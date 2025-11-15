/**
 * Helper compartido para obtener items seleccionados del checkout
 * Fuente única de verdad: checkoutStore.checkoutItems con selected=true
 */

import type { CheckoutItem } from "@/lib/store/checkoutStore";

/**
 * Filtra items del checkout para obtener solo los seleccionados
 * @param items - Array de CheckoutItem del checkoutStore
 * @returns Array de CheckoutItem con selected=true
 */
export function getSelectedItems(items: CheckoutItem[]): CheckoutItem[] {
  return items.filter((item) => item.selected === true);
}

/**
 * Calcula el subtotal en centavos de los items seleccionados
 * @param items - Array de CheckoutItem del checkoutStore
 * @returns Subtotal en centavos (number)
 */
export function getSelectedSubtotalCents(items: CheckoutItem[]): number {
  return getSelectedItems(items).reduce((sum, item) => {
    const qty = item.qty ?? 1;
    const priceCents =
      typeof item.price_cents === "number"
        ? item.price_cents
        : typeof item.price === "number"
          ? Math.round(item.price * 100)
          : 0;
    return sum + priceCents * qty;
  }, 0);
}

/**
 * Calcula el subtotal en decimales de los items seleccionados
 * @param items - Array de CheckoutItem del checkoutStore
 * @returns Subtotal en decimales (number)
 */
export function getSelectedSubtotal(items: CheckoutItem[]): number {
  return getSelectedSubtotalCents(items) / 100;
}

/**
 * Obtiene los IDs de los items seleccionados
 * @param items - Array de CheckoutItem del checkoutStore
 * @returns Array de IDs (string[])
 */
export function getSelectedIds(items: CheckoutItem[]): string[] {
  return getSelectedItems(items).map((item) => item.id);
}

