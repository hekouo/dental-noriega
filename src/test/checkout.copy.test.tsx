import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe("Checkout Copy Tweaks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render step indicator with improved labels", () => {
    render(<CheckoutStepIndicator currentStep="datos" />);
    expect(screen.getByText(/datos de envío/i)).toBeInTheDocument();
    expect(screen.getByText(/pago/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmación/i)).toBeInTheDocument();
  });

  it("should show correct step labels in all steps", () => {
    const { rerender } = render(<CheckoutStepIndicator currentStep="datos" />);
    expect(screen.getByText(/datos de envío/i)).toBeInTheDocument();

    rerender(<CheckoutStepIndicator currentStep="pago" />);
    expect(screen.getByText(/pago/i)).toBeInTheDocument();

    rerender(<CheckoutStepIndicator currentStep="gracias" />);
    expect(screen.getByText(/confirmación/i)).toBeInTheDocument();
  });
});

