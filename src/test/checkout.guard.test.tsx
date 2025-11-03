// src/test/checkout.guard.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import PagoPage from "@/app/checkout/pago/page";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import {
  useHasSelected,
  useSelectedTotal,
  useSelectedItems,
} from "@/lib/store/checkoutSelectors";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/store/checkoutStore", () => ({
  useCheckoutStore: vi.fn(),
}));

vi.mock("@/lib/store/checkoutSelectors", () => ({
  useHasSelected: vi.fn(),
  useSelectedTotal: vi.fn(),
  useSelectedItems: vi.fn(),
}));

vi.mock("@/lib/actions/createOrder", () => ({
  createOrderAction: vi.fn(),
}));

describe("PagoPage guard", () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useHasSelected as any).mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSelectedTotal as any).mockReturnValue(1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSelectedItems as any).mockReturnValue([
      { id: "1", title: "Product 1", price: 500, qty: 2 },
    ]);
  });

  it("should redirect to /checkout/datos if datos is null", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: null,
      step: "datos",
      clearCheckout: vi.fn(),
    });

    render(<PagoPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/checkout/datos");
    });
  });

  it("should redirect to /carrito if no items selected", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: {
        name: "Juan",
        last_name: "Pérez",
        email: "juan@example.com",
        phone: "5512345678",
        address: "Calle Principal 123",
        neighborhood: "Centro",
        city: "Ciudad de México",
        state: "Ciudad de México",
        cp: "12345",
      },
      step: "pago",
      clearCheckout: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useHasSelected as any).mockReturnValue(false);

    render(<PagoPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/carrito");
    });
  });

  it("should render form when datos and selected items exist", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: {
        name: "Juan",
        last_name: "Pérez",
        email: "juan@example.com",
        phone: "5512345678",
        address: "Calle Principal 123",
        neighborhood: "Centro",
        city: "Ciudad de México",
        state: "Ciudad de México",
        cp: "12345",
      },
      step: "pago",
      clearCheckout: vi.fn(),
    });

    render(<PagoPage />);

    await waitFor(() => {
      expect(screen.getByText(/confirmar pago/i)).toBeInTheDocument();
      expect(screen.getByText(/datos de envío/i)).toBeInTheDocument();
      expect(screen.getByText(/juan pérez/i)).toBeInTheDocument();
      expect(screen.getByText(/editar datos/i)).toBeInTheDocument();
    });
  });

  it("should show compact shipping summary with datos", async () => {
    const datos = {
      name: "María",
      last_name: "González",
      email: "maria@example.com",
      phone: "5512345678",
      address: "Avenida Reforma 456",
      neighborhood: "Polanco",
      city: "Ciudad de México",
      state: "Ciudad de México",
      cp: "11560",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos,
      step: "pago",
      clearCheckout: vi.fn(),
    });

    render(<PagoPage />);

    await waitFor(() => {
      expect(screen.getByText(/maría gonzález/i)).toBeInTheDocument();
      expect(screen.getByText(/5512345678/i)).toBeInTheDocument();
      expect(screen.getByText(/avenida reforma 456/i)).toBeInTheDocument();
      expect(screen.getByText(/polanco/i)).toBeInTheDocument();
    });
  });

  it("should have edit datos link that navigates to /checkout/datos", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCheckoutStore as any).mockReturnValue({
      datos: {
        name: "Juan",
        last_name: "Pérez",
        email: "juan@example.com",
        phone: "5512345678",
        address: "Calle Principal 123",
        neighborhood: "Centro",
        city: "Ciudad de México",
        state: "Ciudad de México",
        cp: "12345",
      },
      step: "pago",
      clearCheckout: vi.fn(),
    });

    render(<PagoPage />);

    await waitFor(() => {
      const editLink = screen.getByText(/editar datos/i);
      expect(editLink).toBeInTheDocument();
      expect(editLink.closest("a")).toHaveAttribute("href", "/checkout/datos");
    });
  });
});
