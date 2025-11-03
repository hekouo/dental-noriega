import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
}));

describe("Checkout Copy Improvements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show 'Datos de envío' instead of 'Datos' in step indicator", () => {
    render(<CheckoutStepIndicator currentStep="datos" />);
    expect(screen.getByText(/datos de envío/i)).toBeInTheDocument();
  });

  it("should show 'Pago' label in step indicator", () => {
    render(<CheckoutStepIndicator currentStep="pago" />);
    expect(screen.getByText(/pago/i)).toBeInTheDocument();
  });

  it("should show 'Confirmación' label in step indicator", () => {
    render(<CheckoutStepIndicator currentStep="gracias" />);
    expect(screen.getByText(/confirmación/i)).toBeInTheDocument();
  });
});

