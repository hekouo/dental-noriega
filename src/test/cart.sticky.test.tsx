// src/test/cart.sticky.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import CartSticky from "@/components/cart/CartSticky";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockCartItems = [
  { id: "1", title: "Product 1", price: 100, qty: 2 },
  { id: "2", title: "Product 2", price: 50, qty: 1 },
];

vi.mock("@/lib/store/cartStore", () => ({
  useCartStore: vi.fn((selector) => {
    const state = {
      cartItems: mockCartItems,
    };
    return selector(state);
  }),
}));

describe("CartSticky", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cart sticky with total and count", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<CartSticky />);

    // Verificar que muestra el contador
    expect(screen.getByText(/3 productos/i)).toBeInTheDocument();

    // Verificar que muestra el total (250 MXN)
    expect(screen.getByText(/250/i)).toBeInTheDocument();
  });

  it("does not render on checkout pages", () => {
    vi.mocked(usePathname).mockReturnValue("/checkout/datos");
    const { container } = render(<CartSticky />);
    expect(container.firstChild).toBeNull();
  });

  it("does not render when cart is empty", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    const { useCartStore } = require("@/lib/store/cartStore");
    vi.mocked(useCartStore).mockReturnValueOnce({
      cartItems: [],
    });
    const { container } = render(<CartSticky />);
    expect(container.firstChild).toBeNull();
  });
});
