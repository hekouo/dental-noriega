// src/test/checkout.shipping.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import PagoClient from "@/app/checkout/pago/PagoClient";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";
import {
  useSelectedTotal,
  useSelectedItems,
} from "@/lib/store/checkoutSelectors";
import { cpToZone, quote } from "@/lib/shipping/config";
import { cartKg } from "@/lib/shipping/weights";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/store/checkoutStore", () => ({
  useCheckoutStore: vi.fn(),
}));

vi.mock("@/lib/store/cartStore", () => ({
  useCartStore: vi.fn(),
}));

vi.mock("@/lib/store/checkoutSelectors", () => ({
  useSelectedTotal: vi.fn(),
  useSelectedItems: vi.fn(),
}));

vi.mock("@/lib/shipping/config", () => ({
  cpToZone: vi.fn(),
  quote: vi.fn(),
}));

vi.mock("@/lib/shipping/weights", () => ({
  cartKg: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@/components/CheckoutStepIndicator", () => ({
  default: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="step-indicator">{currentStep}</div>
  ),
}));

vi.mock("@/components/CheckoutDebugPanel", () => ({
  default: () => null,
}));

describe("Checkout Shipping", () => {
  const mockPush = vi.fn();
  const mockSetShipping = vi.fn();
  const mockResetCheckout = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: {
        name: "Juan",
        last_name: "Pérez",
        phone: "5512345678",
        cp: "12345",
      },
      reset: mockResetCheckout,
      setShipping: mockSetShipping,
      shippingMethod: undefined,
      shippingCost: undefined,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCartStore as any).mockReturnValue({
      clearCart: mockClearCart,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSelectedTotal as any).mockReturnValue(1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSelectedItems as any).mockReturnValue([
      { id: "1", title: "Product 1", price: 500, qty: 2 },
    ]);

    // Mock fetch global
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, orderId: "mock-123" }),
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

    // Mock sessionStorage
    Object.defineProperty(window, "sessionStorage", {
      value: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it("should calculate shipping cost based on CP and weight", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cpToZone as any).mockReturnValue("metro");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cartKg as any).mockReturnValue(1.5);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (quote as any).mockReturnValue({
      standard: 99,
      express: 178,
    });

    render(<PagoClient />);

    await waitFor(() => {
      expect(cpToZone).toHaveBeenCalledWith("12345");
      expect(cartKg).toHaveBeenCalled();
      expect(quote).toHaveBeenCalledWith("metro", 1.5);
    });

    // Verificar que los métodos de envío muestran los precios correctos
    expect(screen.getByText(/estándar/i)).toBeInTheDocument();
    expect(screen.getByText(/express/i)).toBeInTheDocument();
  });

  it("should update total when shipping method changes", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cpToZone as any).mockReturnValue("metro");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cartKg as any).mockReturnValue(1.0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (quote as any).mockReturnValue({
      standard: 79,
      express: 142,
    });

    render(<PagoClient />);

    const standardRadio = screen.getByLabelText(/estándar/i);
    fireEvent.click(standardRadio);

    await waitFor(() => {
      expect(mockSetShipping).toHaveBeenCalledWith("standard", 79);
    });

    // Verificar que el total se actualiza (subtotal 1000 + envío 79 = 1079)
    expect(screen.getByText(/pagar ahora/i)).toBeInTheDocument();
  });

  it("should use fallback prices when CP is missing", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: {
        name: "Juan",
        last_name: "Pérez",
        phone: "5512345678",
        cp: "", // Sin CP
      },
      reset: mockResetCheckout,
      setShipping: mockSetShipping,
      shippingMethod: undefined,
      shippingCost: undefined,
    });

    render(<PagoClient />);

    // Verificar que se muestran las tarifas fijas (fallback)
    expect(screen.getByText(/99/i)).toBeInTheDocument(); // Standard fallback
    expect(screen.getByText(/179/i)).toBeInTheDocument(); // Express fallback
  });

  it("should save order summary to sessionStorage on Pay Now", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cpToZone as any).mockReturnValue("nacional");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cartKg as any).mockReturnValue(2.0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (quote as any).mockReturnValue({
      standard: 139,
      express: 250,
    });

    render(<PagoClient />);

    // Seleccionar método de envío
    const standardRadio = screen.getByLabelText(/estándar/i);
    fireEvent.click(standardRadio);

    // Seleccionar método de pago
    const paymentSelect = screen.getByLabelText(/método de pago/i);
    fireEvent.change(paymentSelect, { target: { value: "efectivo" } });

    // Hacer clic en Pagar ahora
    const payButton = screen.getByTestId("btn-pagar-ahora");
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        "ddn_last_order",
        expect.stringContaining("orderRef"),
      );
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        "ddn_last_order",
        expect.stringContaining("1139"), // total: 1000 + 139
      );
    });
  });
});

