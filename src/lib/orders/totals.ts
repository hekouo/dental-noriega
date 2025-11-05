// src/lib/orders/totals.ts
/**
 * Helper para calcular totales con cupones
 */

import type { CartItem } from "@/lib/store/cartStore";
import type { Coupon } from "@/lib/coupons";

export type TotalsResult = {
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string;
};

/**
 * Calcula subtotal, descuento y total con opcional cupón
 */
export function calculateTotals(
  items: CartItem[],
  coupon?: Coupon | null,
): TotalsResult {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  let discount = 0;
  if (coupon) {
    discount = (subtotal * coupon.pct) / 100;
  }

  const total = Math.max(0, subtotal - discount);

  return {
    subtotal,
    discount,
    total,
    couponCode: coupon?.code,
  };
}
