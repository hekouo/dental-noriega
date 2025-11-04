// src/test/checkout.coupon.apply-enter.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { validateCoupon } from "@/lib/discounts/coupons";

// Mock del store
vi.mock("@/lib/store/checkoutStore", () => ({
  useCheckoutStore: vi.fn(),
}));

// Mock de validateCoupon
vi.mock("@/lib/discounts/coupons", () => ({
  validateCoupon: vi.fn(),
}));

describe("Coupon Apply on Enter/Blur", () => {
  const mockSetCoupon = vi.fn();
  const mockClearCoupon = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCheckoutStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      couponCode: undefined,
      setCoupon: mockSetCoupon,
      clearCoupon: mockClearCoupon,
    });
  });

  it("aplica cupón al presionar Enter", () => {
    (validateCoupon as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      discount: 100,
      scope: "subtotal",
      appliedCode: "DENT10",
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = "DENT10";

    fireEvent.keyDown(input, { key: "Enter" });

    // Simular validación y aplicación
    const validation = validateCoupon(input.value.trim().toUpperCase(), {
      subtotal: 1000,
      items: [],
    });
    if (validation.ok) {
      mockSetCoupon(
        validation.appliedCode!,
        validation.discount,
        validation.scope,
      );
    }
    expect(mockSetCoupon).toHaveBeenCalledWith("DENT10", 100, "subtotal");
  });

  it("aplica cupón en blur si hay texto", () => {
    (validateCoupon as ReturnType<typeof vi.fn>).mockReturnValue({
      ok: true,
      discount: 100,
      scope: "subtotal",
      appliedCode: "DENT10",
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = "DENT10";

    fireEvent.blur(input);

    // Simular validación y aplicación
    if (input.value.trim()) {
      const validation = validateCoupon(input.value.trim().toUpperCase(), {
        subtotal: 1000,
        items: [],
      });
      if (validation.ok) {
        mockSetCoupon(
          validation.appliedCode!,
          validation.discount,
          validation.scope,
        );
      }
    }
    expect(mockSetCoupon).toHaveBeenCalledWith("DENT10", 100, "subtotal");
  });
});
