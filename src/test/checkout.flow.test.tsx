// src/test/checkout.flow.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import DatosPageClient from "@/app/checkout/datos/ClientPage";
import PagoClient from "@/app/checkout/pago/PagoClient";
import GuardsClient from "@/app/checkout/pago/GuardsClient";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";
import { useSelectedIds } from "@/lib/store/checkoutSelectors";

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
  useSelectedIds: vi.fn(),
  useSelectedTotal: vi.fn(() => 1000),
  useSelectedItems: vi.fn(() => [
    { id: "1", title: "Product 1", price: 500, qty: 2 },
  ]),
}));

describe("Checkout flow", () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockSetDatos = vi.fn();
  const mockResetCheckout = vi.fn();
  const mockClearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      setDatos: mockSetDatos,
      datos: null,
      reset: mockResetCheckout,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCartStore as any).mockReturnValue({
      cartItems: [{ id: "1", title: "Product 1", price: 500, qty: 2 }],
      clearCart: mockClearCart,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSelectedIds as any).mockReturnValue(["product-1", "product-2"]);

    // Mock fetch global
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, orderId: "mock-123" }),
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;
  });

  it("should submit datos form and navigate to /checkout/pago", async () => {
    const mockGetState = vi.fn(() => ({
      setDatos: mockSetDatos,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).getState = mockGetState;

    render(<DatosPageClient />);

    const nameInput = screen.getByLabelText(/nombre/i);
    const lastnameInput = screen.getByLabelText(/apellido/i);
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const phoneInput = screen.getByLabelText(/teléfono/i);
    const addressInput = screen.getByLabelText(/dirección/i);
    const neighborhoodInput = screen.getByLabelText(/colonia/i);
    const cityInput = screen.getByLabelText(/ciudad/i);
    const stateSelect = screen.getByLabelText(/estado/i);
    const cpInput = screen.getByLabelText(/código postal/i);
    const aceptaAvisoCheckbox = screen.getByLabelText(/acepto el/i);

    fireEvent.change(nameInput, { target: { value: "Juan" } });
    fireEvent.change(lastnameInput, { target: { value: "Pérez" } });
    fireEvent.change(emailInput, { target: { value: "juan@example.com" } });
    fireEvent.change(phoneInput, { target: { value: "5512345678" } });
    fireEvent.change(addressInput, {
      target: { value: "Calle Principal 123" },
    });
    fireEvent.change(neighborhoodInput, { target: { value: "Centro" } });
    fireEvent.change(cityInput, { target: { value: "Ciudad de México" } });
    fireEvent.change(stateSelect, { target: { value: "Ciudad de México" } });
    fireEvent.change(cpInput, { target: { value: "12345" } });
    fireEvent.click(aceptaAvisoCheckbox);

    const submitButton = screen.getByTestId("btn-continuar-pago");
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockGetState).toHaveBeenCalled();
      expect(mockSetDatos).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Juan",
          last_name: "Pérez",
          email: "juan@example.com",
          phone: "5512345678",
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/checkout/pago");
    });
  });

  it("should handle payNow: create order, clear stores, navigate to gracias", async () => {
    const mockDatos = {
      name: "Juan",
      last_name: "Pérez",
      email: "juan@example.com",
      phone: "5512345678",
      address: "Calle Principal 123",
      neighborhood: "Centro",
      city: "Ciudad de México",
      state: "Ciudad de México",
      cp: "12345",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: mockDatos,
      reset: mockResetCheckout,
    });

    render(<PagoClient />);

    const payButton = screen.getByTestId("btn-pagar-ahora");
    fireEvent.click(payButton);

    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((global as any).fetch).toHaveBeenCalledWith(
        "/api/orders/mock",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockResetCheckout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/checkout/gracias");
    });
  });

  it("GuardsClient should redirect to /checkout/datos if no datos", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCartStore as any).mockReturnValue({
      cartItems: [{ id: "1", title: "Product 1", price: 500, qty: 2 }],
    });

    render(
      <GuardsClient>
        <div>Test Content</div>
      </GuardsClient>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/checkout/datos");
    });
  });

  it("GuardsClient should redirect to /carrito if no items", async () => {
    const mockDatos = {
      name: "Juan",
      last_name: "Pérez",
      email: "juan@example.com",
      phone: "5512345678",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: mockDatos,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCartStore as any).mockReturnValue({
      cartItems: [],
    });

    render(
      <GuardsClient>
        <div>Test Content</div>
      </GuardsClient>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/carrito");
    });
  });

  it("GuardsClient should render children when datos and items exist", async () => {
    const mockDatos = {
      name: "Juan",
      last_name: "Pérez",
      email: "juan@example.com",
      phone: "5512345678",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: mockDatos,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCartStore as any).mockReturnValue({
      cartItems: [{ id: "1", title: "Product 1", price: 500, qty: 2 }],
    });

    render(
      <GuardsClient>
        <div>Test Content</div>
      </GuardsClient>,
    );

    await waitFor(() => {
      expect(screen.getByText("Test Content")).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
