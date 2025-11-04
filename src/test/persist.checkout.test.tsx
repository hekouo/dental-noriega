// src/test/persist.checkout.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
// Tests de persistencia checkout

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

describe("Checkout Persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
    useCheckoutStore.getState().reset();
  });

  it("should persist datos and shipping", () => {
    const { result } = renderHook(() => useCheckoutStore());

    act(() => {
      result.current.setDatos({
        name: "Juan",
        last_name: "Pérez",
        email: "juan@example.com",
        phone: "5512345678",
        address: "Calle 123",
        neighborhood: "Colonia",
        city: "CDMX",
        state: "CDMX",
        cp: "01000",
        notes: "",
        aceptaAviso: true,
      });
      result.current.setShipping("standard", 99);
    });

    const datos = result.current.datos;
    const shippingMethod = result.current.shippingMethod;
    const shippingCost = result.current.shippingCost;

    expect(datos?.name).toBe("Juan");
    expect(shippingMethod).toBe("standard");
    expect(shippingCost).toBe(99);
  });
});

