// src/test/gracias.recos.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Recommended from "@/app/checkout/gracias/Recommended.server";

// Mock getProductsBySectionFromView
vi.mock("@/lib/catalog/getProductsBySectionFromView.server", () => ({
  getProductsBySectionFromView: vi.fn(async (section: string) => {
    return [
      {
        id: "1",
        section,
        product_slug: "producto-1",
        title: "Producto 1",
        price_cents: 10000,
        image_url: null,
        in_stock: null,
        stock_qty: null,
      },
      {
        id: "2",
        section,
        product_slug: "producto-2",
        title: "Producto 2",
        price_cents: 20000,
        image_url: null,
        in_stock: null,
        stock_qty: null,
      },
      {
        id: "3",
        section,
        product_slug: "producto-3",
        title: "Producto 3",
        price_cents: 30000,
        image_url: null,
        in_stock: null,
        stock_qty: null,
      },
      {
        id: "4",
        section,
        product_slug: "producto-4",
        title: "Producto 4",
        price_cents: 40000,
        image_url: null,
        in_stock: null,
        stock_qty: null,
      },
    ];
  }),
}));

describe("Gracias Recommendations", () => {
  it("should render 4 recommended products", async () => {
    const result = await Recommended({ section: "ortodoncia" });
    const { container } = render(result);

    expect(container.textContent).toContain("Productos recomendados para ti");
    expect(container.textContent).toContain("Producto 1");
    expect(container.textContent).toContain("Producto 2");
  });

  it("should exclude purchased product slug", async () => {
    const result = await Recommended({
      section: "ortodoncia",
      excludeSlug: "producto-1",
    });
    const { container } = render(result);

    // producto-1 no debería aparecer
    expect(container.textContent).not.toContain("Producto 1");
    expect(container.textContent).toContain("Producto 2");
  });
});

