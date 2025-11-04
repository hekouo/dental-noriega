// src/lib/discounts/coupons.ts
/**
 * Sistema de cupones frontend-only
 */

export type CouponType = "percent" | "fixed";
export type DiscountScope = "subtotal" | "shipping" | "none";

export type Coupon = {
  code: string;
  type: CouponType;
  value: number;
  label: string;
  expiresAt?: string;
  minSubtotal?: number;
  appliesToSection?: string;
};

/**
 * Semilla de cupones disponibles
 */
export const COUPONS: Coupon[] = [
  {
    code: "DENT10",
    type: "percent",
    value: 10,
    label: "10% de descuento",
  },
  {
    code: "ENVIO99",
    type: "fixed",
    value: 99,
    label: "Descuento de envío",
  },
  {
    code: "PRIMERA",
    type: "percent",
    value: 15,
    label: "15% en tu primera compra",
    minSubtotal: 500,
  },
];

type ValidationContext = {
  subtotal: number;
  shipping?: number;
  items: Array<{ section?: string; price: number; qty: number }>;
};

type ValidationResult = {
  ok: boolean;
  discount: number;
  scope: DiscountScope;
  reason?: string;
  appliedCode?: string;
};

/**
 * Valida y calcula el descuento de un cupón
 */
export function validateCoupon(
  code: string,
  ctx: ValidationContext,
): ValidationResult {
  const coupon = COUPONS.find(
    (c) => c.code.toUpperCase() === code.toUpperCase(),
  );

  if (!coupon) {
    return {
      ok: false,
      discount: 0,
      scope: "none",
      reason: "Cupón no válido",
    };
  }

  // Verificar expiración si existe
  if (coupon.expiresAt) {
    const expires = new Date(coupon.expiresAt);
    if (Date.now() > expires.getTime()) {
      return {
        ok: false,
        discount: 0,
        scope: "none",
        reason: "Cupón expirado",
      };
    }
  }

  // Verificar subtotal mínimo si existe
  if (coupon.minSubtotal && ctx.subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      discount: 0,
      scope: "none",
      reason: `Mínimo de compra: ${coupon.minSubtotal} MXN`,
    };
  }

  // Verificar sección si aplica
  if (coupon.appliesToSection) {
    const hasSection = ctx.items.some(
      (item) => item.section === coupon.appliesToSection,
    );
    if (!hasSection) {
      return {
        ok: false,
        discount: 0,
        scope: "none",
        reason: "Cupón no aplica a estos productos",
      };
    }
  }

  // Calcular descuento
  let discount = 0;
  let scope: DiscountScope = "none";

  if (coupon.code === "ENVIO99") {
    // Descuento fijo en envío
    discount = Math.min(coupon.value, ctx.shipping ?? 0);
    scope = "shipping";
  } else if (coupon.type === "percent") {
    // Descuento porcentual en subtotal
    discount = (ctx.subtotal * coupon.value) / 100;
    scope = "subtotal";
  } else if (coupon.type === "fixed") {
    // Descuento fijo en subtotal
    discount = Math.min(coupon.value, ctx.subtotal);
    scope = "subtotal";
  }

  return {
    ok: true,
    discount: Math.max(0, discount),
    scope,
    appliedCode: coupon.code,
  };
}
