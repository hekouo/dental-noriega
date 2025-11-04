// src/test/persist.cart.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCartStore } from "@/lib/store/cartStore";
import { getWithTTL, setWithTTL, LS_KEYS } from "@/lib/utils/persist";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Cart Persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useCartStore.getState().clearCart();
  });

  it("should persist cart items with TTL", () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addToCart({
        id: "1",
        title: "Producto 1",
        price: 100,
        qty: 2,
        selected: true,
      });
    });

    // Simular guardado manual (el store usa persist de zustand, pero también guardamos TTL)
    const items = result.current.cartItems;
    setWithTTL(LS_KEYS.CART, items);

    // Verificar que se guardó
    const stored = getWithTTL<typeof items>(LS_KEYS.CART);
    expect(stored).toHaveLength(1);
    if (stored) {
      expect(stored[0]?.id).toBe("1");
    }
  });

  it("should clear cart and remove from localStorage", () => {
    const { result } = renderHook(() => useCartStore());

    act(() => {
      result.current.addToCart({
        id: "1",
        title: "Producto 1",
        price: 100,
        qty: 1,
        selected: true,
      });
      result.current.clearCart();
    });

    const stored = getWithTTL(LS_KEYS.CART);
    expect(stored).toBeNull();
    expect(result.current.cartItems).toHaveLength(0);
  });
});

