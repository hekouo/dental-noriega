// src/lib/coupons.ts
/**
 * Cupones básicos en cliente
 */

export type Coupon = {
  code: string;
  pct: number;
  active: boolean;
};

export const COUPONS: Coupon[] = [
  { code: "DDN10", pct: 10, active: true },
  { code: "DDN15", pct: 15, active: false }, // ejemplo desactivado
];

/**
 * Valida un cupón y retorna el cupón si es válido y activo
 */
export function validateCoupon(code: string): Coupon | null {
  const c = COUPONS.find(
    (x) => x.code.toLowerCase() === code.trim().toLowerCase(),
  );
  return c && c.active ? c : null;
}
