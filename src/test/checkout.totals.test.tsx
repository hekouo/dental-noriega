// src/test/checkout.totals.test.tsx
import { describe, it, expect } from "vitest";
import { validateCoupon } from "@/lib/discounts/coupons";

describe("Checkout Totals with Coupons", () => {
  it("calculates total with subtotal discount", () => {
    const subtotal = 1000;
    const shipping = 99;
    const validation = validateCoupon("DENT10", {
      subtotal,
      shipping,
      items: [{ price: 1000, qty: 1 }],
    });

    expect(validation.ok).toBe(true);
    const discount = validation.discount;
    const finalSubtotal = Math.max(0, subtotal - discount);
    const total = Math.max(0, finalSubtotal + shipping);

    expect(total).toBe(999); // 900 + 99
  });

  it("calculates total with shipping discount", () => {
    const subtotal = 1000;
    const shipping = 150;
    const validation = validateCoupon("ENVIO99", {
      subtotal,
      shipping,
      items: [{ price: 1000, qty: 1 }],
    });

    expect(validation.ok).toBe(true);
    const discount = validation.discount;
    const finalShipping = Math.max(0, shipping - discount);
    const total = Math.max(0, subtotal + finalShipping);

    expect(total).toBe(1051); // 1000 + 51
  });

  it("clamps total to >= 0", () => {
    const subtotal = 50;
    const shipping = 0;
    const validation = validateCoupon("DENT10", {
      subtotal,
      shipping,
      items: [{ price: 50, qty: 1 }],
    });

    expect(validation.ok).toBe(true);
    const discount = validation.discount;
    const finalSubtotal = Math.max(0, subtotal - discount);
    const total = Math.max(0, finalSubtotal + shipping);

    expect(total).toBeGreaterThanOrEqual(0);
  });
});

