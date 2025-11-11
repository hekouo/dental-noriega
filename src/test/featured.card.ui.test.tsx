// src/test/featured.card.ui.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FeaturedCardControls from "@/components/FeaturedCardControls";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

// Mock del store del carrito
const mockAddToCart = vi.fn();
vi.mock("@/lib/store/cartStore", () => ({
  useCartStore: vi.fn(() => ({
    addToCart: mockAddToCart,
  })),
}));

// Mock de lucide-react
vi.mock("lucide-react", () => ({
  ShoppingCart: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="shopping-cart-icon" />
  ),
}));

describe("FeaturedCardControls UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows quantity input and Add button with cart icon when price_cents=100 and in_stock=true", () => {
    const item: FeaturedItem = {
      product_id: "1",
      product_slug: "test-product",
      section: "test-section",
      title: "Test Product",
      description: null,
      price_cents: 100, // 100 centavos = 1 MXN
      currency: "mxn",
      image_url: undefined,
      in_stock: true,
      is_active: true,
      position: 0,
    };

    render(<FeaturedCardControls item={item} compact />);

    // Verificar input de cantidad
    const qtyInput = screen.getByLabelText(/cantidad/i);
    expect(qtyInput).toBeInTheDocument();
    expect(qtyInput).toHaveValue(1);

    // Verificar botón Agregar
    const addButton = screen.getByRole("button", { name: /agregar/i });
    expect(addButton).toBeInTheDocument();

    // Verificar ícono de carrito
    const cartIcon = screen.getByTestId("shopping-cart-icon");
    expect(cartIcon).toBeInTheDocument();
  });

  it("shows WhatsApp link when env is present", () => {
    const originalEnv = process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE = "525531033715";

    const item: FeaturedItem = {
      product_id: "1",
      product_slug: "test-product",
      section: "test-section",
      title: "Test Product",
      description: null,
      price_cents: 100,
      currency: "mxn",
      image_url: undefined,
      in_stock: true,
      is_active: true,
      position: 0,
    };

    render(<FeaturedCardControls item={item} compact />);

    const whatsappLink = screen.getByText(/consultar por whatsapp/i);
    expect(whatsappLink).toBeInTheDocument();

    // Restaurar env
    if (originalEnv) {
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
    }
  });

  it("shows 'Agotado' when in_stock is false", () => {
    const item: FeaturedItem = {
      product_id: "1",
      product_slug: "test-product",
      section: "test-section",
      title: "Test Product",
      description: null,
      price_cents: 100,
      currency: "mxn",
      image_url: undefined,
      in_stock: false,
      is_active: true,
      position: 0,
    };

    render(<FeaturedCardControls item={item} compact />);

    const agotadoText = screen.getByText(/agotado/i);
    expect(agotadoText).toBeInTheDocument();

    // No debe haber botón de agregar
    const addButton = screen.queryByRole("button", { name: /agregar/i });
    expect(addButton).not.toBeInTheDocument();
  });
});
