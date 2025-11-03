// src/test/components/pdp.buyNow.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import ProductActions from "@/components/product/ProductActions.client";
import { useCartStore } from "@/lib/store/cartStore";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/store/cartStore", () => ({
  useCartStore: vi.fn(),
}));

describe("ProductActions buyNow", () => {
  const mockPush = vi.fn();
  const mockAddToCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useCartStore as any).mockReturnValue(mockAddToCart);
  });

  it("should add to cart and navigate to checkout on buyNow", async () => {
    const product = {
      id: "123",
      title: "Test Product",
      section: "test-section",
      product_slug: "test-product",
      price_cents: 1000,
      in_stock: true,
    };

    render(<ProductActions product={product} />);

    const buyNowBtn = screen.getByText("Comprar ya");
    fireEvent.click(buyNowBtn);

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith({
        id: "123",
        title: "Test Product",
        price: 10,
        qty: 1,
        image_url: undefined,
        selected: true,
      });
      expect(mockPush).toHaveBeenCalledWith("/checkout");
    });
  });

  it("should not navigate if product is out of stock", () => {
    const product = {
      id: "123",
      title: "Test Product",
      section: "test-section",
      product_slug: "test-product",
      price_cents: 1000,
      in_stock: false,
    };

    render(<ProductActions product={product} />);

    const buyNowBtn = screen.getByText("Comprar ya");
    expect(buyNowBtn).toBeDisabled();
  });
});
