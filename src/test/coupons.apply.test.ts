// src/test/coupons.apply.test.ts
import { describe, it, expect } from "vitest";
import { validateCoupon } from "@/lib/coupons";
import { calculateTotals } from "@/lib/orders/totals";
import type { CartItem } from "@/lib/store/cartStore";

describe("Coupons", () => {
  const mockItems: CartItem[] = [
    { id: "1", title: "Product 1", price: 100, qty: 2, selected: true },
    { id: "2", title: "Product 2", price: 50, qty: 1, selected: true },
  ];

  it("DDN10 applies 10% discount to total", () => {
    const coupon = validateCoupon("DDN10");
    expect(coupon).not.toBeNull();
    expect(coupon?.code).toBe("DDN10");
    expect(coupon?.pct).toBe(10);

    const totals = calculateTotals(mockItems, coupon);
    expect(totals.subtotal).toBe(250); // 100*2 + 50*1
    expect(totals.discount).toBe(25); // 250 * 0.1
    expect(totals.total).toBe(225); // 250 - 25
    expect(totals.couponCode).toBe("DDN10");
  });

  it("invalid coupon does not change total", () => {
    const coupon = validateCoupon("INVALID");
    expect(coupon).toBeNull();

    const totals = calculateTotals(mockItems, coupon);
    expect(totals.subtotal).toBe(250);
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(250);
    expect(totals.couponCode).toBeUndefined();
  });

  it("inactive coupon (DDN15) returns null", () => {
    const coupon = validateCoupon("DDN15");
    expect(coupon).toBeNull();
  });

  it("case-insensitive coupon validation", () => {
    const coupon = validateCoupon("ddn10");
    expect(coupon).not.toBeNull();
    expect(coupon?.code).toBe("DDN10");
  });
});
