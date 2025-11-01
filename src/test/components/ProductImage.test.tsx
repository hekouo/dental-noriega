// src/test/components/ProductImage.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProductImage from "@/components/ProductImage";

// Asegura que la normalización no interfiera con el test de UI:
vi.mock("@/lib/img/normalizeImageUrl", () => ({
  normalizeImageUrl: (u: string | null | undefined, _size?: number) =>
    u ?? "/images/fallback-product.png",
}));

describe("ProductImage", () => {
  it("renders with alt text", () => {
    render(
      <ProductImage
        src="/test.jpg"
        alt="Guantes nitrilo azul"
        width={120}
        height={120}
      />,
    );

    const img = screen.getByTestId("product-image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "Guantes nitrilo azul");
    expect(img).toHaveAttribute("src");
    const srcAttr = img.getAttribute("src");
    expect(srcAttr).toBeTruthy();
    expect(srcAttr).toContain("/test.jpg");
  });

  it("renders placeholder when no src", () => {
    render(<ProductImage src="" alt="Sin imagen" width={120} height={120} />);

    const img = screen.getByTestId("product-image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("alt", "Sin imagen");
  });
});
