// src/test/coupons.logic.test.ts
import { describe, it, expect } from "vitest";
import { validateCoupon } from "@/lib/discounts/coupons";

describe("Coupon Validation", () => {
  it("DENT10 reduces 10% subtotal", () => {
    const result = validateCoupon("DENT10", {
      subtotal: 1000,
      shipping: 99,
      items: [{ price: 1000, qty: 1 }],
    });

    expect(result.ok).toBe(true);
    expect(result.discount).toBe(100); // 10% de 1000
    expect(result.scope).toBe("subtotal");
  });

  it("PRIMERA fails if subtotal < 500", () => {
    const result = validateCoupon("PRIMERA", {
      subtotal: 400,
      shipping: 99,
      items: [{ price: 400, qty: 1 }],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Mínimo");
  });

  it("PRIMERA applies if subtotal >= 500", () => {
    const result = validateCoupon("PRIMERA", {
      subtotal: 600,
      shipping: 99,
      items: [{ price: 600, qty: 1 }],
    });

    expect(result.ok).toBe(true);
    expect(result.discount).toBe(90); // 15% de 600
  });

  it("ENVIO99 discounts shipping", () => {
    const result = validateCoupon("ENVIO99", {
      subtotal: 1000,
      shipping: 150,
      items: [{ price: 1000, qty: 1 }],
    });

    expect(result.ok).toBe(true);
    expect(result.discount).toBe(99);
    expect(result.scope).toBe("shipping");
  });

  it("invalid coupon returns error", () => {
    const result = validateCoupon("INVALID", {
      subtotal: 1000,
      shipping: 99,
      items: [{ price: 1000, qty: 1 }],
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Cupón no válido");
  });
});

