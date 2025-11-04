// src/lib/discounts/coupons.ts
/**
 * Sistema de cupones frontend-only
 */

export type CouponType = "percent" | "fixed";

export type Coupon = {
  code: string;
  type: CouponType;
  value: number;
  label: string;
  expiresAt?: string;
  minSubtotal?: number;
  appliesToSection?: string;
};

export const COUPONS: Coupon[] = [
  { code: "DENT10", type: "percent", value: 10, label: "10% de descuento" },
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

export type CouponContext = {
  subtotal: number;
  shipping?: number;
  items: Array<{ section?: string; price: number; qty: number }>;
};

export type CouponValidation = {
  ok: boolean;
  discount: number;
  scope: "subtotal" | "shipping" | "none";
  reason?: string;
  appliedCode?: string;
};

/**
 * Valida y aplica un cupón
 */
export function validateCoupon(
  code: string,
  ctx: CouponContext,
): CouponValidation {
  const coupon = COUPONS.find((c) => c.code === code.toUpperCase());

  if (!coupon) {
    return {
      ok: false,
      discount: 0,
      scope: "none",
      reason: "Cupón no válido",
    };
  }

  // Validar expiración
  if (coupon.expiresAt) {
    const expires = new Date(coupon.expiresAt).getTime();
    if (Date.now() > expires) {
      return {
        ok: false,
        discount: 0,
        scope: "none",
        reason: "Cupón expirado",
      };
    }
  }

  // Validar subtotal mínimo
  if (coupon.minSubtotal && ctx.subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      discount: 0,
      scope: "none",
      reason: `Mínimo de compra: ${coupon.minSubtotal.toFixed(2)} MXN`,
    };
  }

  // Validar sección si aplica
  if (
    coupon.appliesToSection &&
    !ctx.items.some((i) => i.section === coupon.appliesToSection)
  ) {
    return {
      ok: false,
      discount: 0,
      scope: "none",
      reason: "Cupón no aplica a los productos seleccionados",
    };
  }

  // Calcular descuento
  let discount = 0;
  let scope: "subtotal" | "shipping" | "none" = "none";

  if (coupon.type === "percent") {
    discount = (ctx.subtotal * coupon.value) / 100;
    scope = "subtotal";
  } else if (coupon.type === "fixed") {
    // ENVIO99 aplica a shipping
    if (code.toUpperCase() === "ENVIO99") {
      discount = Math.min(coupon.value, ctx.shipping ?? 0);
      scope = "shipping";
    } else {
      discount = Math.min(coupon.value, ctx.subtotal);
      scope = "subtotal";
    }
  }

  return {
    ok: true,
    discount,
    scope,
    appliedCode: coupon.code,
  };
}

