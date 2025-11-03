import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("GraciasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render 'Gracias por tu compra' heading", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    expect(screen.getByText(/gracias por tu compra/i)).toBeInTheDocument();
  });

  it("should show orderRef when orden param is present", () => {
    const orderRef = "DDN-202511-ABC123";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => (key === "orden" ? orderRef : null),
    });

    render(<GraciasPage />);

    expect(screen.getByText(orderRef)).toBeInTheDocument();
    expect(screen.getByText(/tu número de orden es/i)).toBeInTheDocument();
  });

  it("should show generic message when no orden param", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    expect(screen.getByText(/registramos tu pedido/i)).toBeInTheDocument();
  });

  it("should show orderRef when order param is present (alternative key)", () => {
    const orderRef = "DDN-202511-XYZ789";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => (key === "order" ? orderRef : null),
    });

    render(<GraciasPage />);

    expect(screen.getByText(orderRef)).toBeInTheDocument();
  });

  it("should render step indicator", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    expect(screen.getByTestId("step-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("step-indicator")).toHaveTextContent("gracias");
  });

  it("should render CTAs for continuing shopping", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    render(<GraciasPage />);

    expect(
      screen.getByRole("link", { name: /seguir comprando/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver catálogo completo/i }),
    ).toBeInTheDocument();
  });

  it("should never show 404 - always renders content", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: () => null,
    });

    const { container } = render(<GraciasPage />);

    // Should render main content, not 404
    expect(container.querySelector("main")).toBeInTheDocument();
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });
});
