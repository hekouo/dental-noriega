// src/test/thanks.summary.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import GraciasPage from "@/app/checkout/gracias/page";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/components/CheckoutStepIndicator", () => ({
  default: ({ currentStep }: { currentStep: string }) => (
    <div data-testid="step-indicator">{currentStep}</div>
  ),
}));

describe("Thanks Summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock sessionStorage
    const mockStorage: Record<string, string> = {};
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        }),
      },
      writable: true,
    });
  });

  it("should read order summary from sessionStorage", async () => {
    const lastOrder = {
      orderRef: "DDN-202511-ABC123",
      total: 1139,
      shippingMethod: "standard" as const,
      shippingCost: 139,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.sessionStorage.getItem as any).mockReturnValue(
      JSON.stringify(lastOrder),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    await waitFor(() => {
      expect(screen.getByText("DDN-202511-ABC123")).toBeInTheDocument();
      expect(screen.getByText(/envío estándar/i)).toBeInTheDocument();
    });
  });

  it("should show pickup method correctly", async () => {
    const lastOrder = {
      orderRef: "DDN-202511-XYZ789",
      total: 1000,
      shippingMethod: "pickup" as const,
      shippingCost: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.sessionStorage.getItem as any).mockReturnValue(
      JSON.stringify(lastOrder),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    await waitFor(() => {
      expect(screen.getByText("DDN-202511-XYZ789")).toBeInTheDocument();
      expect(screen.getByText(/recoger en tienda/i)).toBeInTheDocument();
    });

    // No debe mostrar costo de envío para pickup
    expect(screen.queryByText(/costo de envío/i)).not.toBeInTheDocument();
  });

  it("should show express method correctly", async () => {
    const lastOrder = {
      orderRef: "DDN-202511-EXPRESS",
      total: 1250,
      shippingMethod: "express" as const,
      shippingCost: 250,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.sessionStorage.getItem as any).mockReturnValue(
      JSON.stringify(lastOrder),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    await waitFor(() => {
      expect(screen.getByText("DDN-202511-EXPRESS")).toBeInTheDocument();
      expect(screen.getByText(/envío express/i)).toBeInTheDocument();
    });
  });

  it("should fallback to URL param if sessionStorage is empty", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.sessionStorage.getItem as any).mockReturnValue(null);

    const orderRef = "DDN-202511-FROMURL";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => (key === "orden" ? orderRef : null),
    });

    render(<GraciasPage />);

    await waitFor(() => {
      expect(screen.getByText(orderRef)).toBeInTheDocument();
    });
  });

  it("should handle missing sessionStorage gracefully", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.sessionStorage.getItem as any).mockImplementation(() => {
      throw new Error("Storage error");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    // Debe renderizar sin errores
    expect(screen.getByText(/gracias por tu compra/i)).toBeInTheDocument();
  });
});
