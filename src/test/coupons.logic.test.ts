// src/test/coupons.logic.test.ts
import { describe, it, expect } from "vitest";
import { validateCoupon } from "@/lib/discounts/coupons";

describe("validateCoupon", () => {
  it("DENT10 reduce 10% subtotal", () => {
    const result = validateCoupon("DENT10", {
      subtotal: 1000,
      shipping: 100,
      items: [{ price: 1000, qty: 1 }],
    });
    expect(result.ok).toBe(true);
    expect(result.discount).toBe(100);
    expect(result.scope).toBe("subtotal");
  });

  it("PRIMERA falla si subtotal < 500", () => {
    const result = validateCoupon("PRIMERA", {
      subtotal: 400,
      shipping: 50,
      items: [{ price: 400, qty: 1 }],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("500");
  });

  it("ENVIO99 descuenta shipping", () => {
    const result = validateCoupon("ENVIO99", {
      subtotal: 500,
      shipping: 150,
      items: [{ price: 500, qty: 1 }],
    });
    expect(result.ok).toBe(true);
    expect(result.discount).toBe(99);
    expect(result.scope).toBe("shipping");
  });

  it("cupón inválido retorna error", () => {
    const result = validateCoupon("INVALIDO", {
      subtotal: 1000,
      shipping: 100,
      items: [{ price: 1000, qty: 1 }],
    });
    expect(result.ok).toBe(false);
    expect(result.scope).toBe("none");
  });
});
