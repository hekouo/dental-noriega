// src/test/routes.featured.links.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FeaturedGrid from "@/components/FeaturedGrid";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

const mockItem: FeaturedItem = {
  product_id: "test-123",
  product_slug: "test-product",
  section: "consumibles-y-profilaxis",
  title: "Test Product",
  description: null,
  price_cents: 10000,
  currency: "mxn",
  image_url: "https://example.com/image.jpg",
  in_stock: true,
  is_active: true,
  position: 1,
};

describe("Featured links", () => {
  it("FeaturedGrid renders links with canonical href", () => {
    render(<FeaturedGrid items={[mockItem]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/catalogo/consumibles-y-profilaxis/test-product",
    );
    expect(link).toHaveAttribute("prefetch", "false");
  });

  it("FeaturedGrid falls back to /catalogo if section or slug missing", () => {
    const itemWithoutSection = { ...mockItem, section: "" };
    render(<FeaturedGrid items={[itemWithoutSection]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/catalogo");
  });

  it("FeaturedCarousel renders links with canonical href", () => {
    render(<FeaturedCarousel items={[mockItem]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/catalogo/consumibles-y-profilaxis/test-product",
    );
    expect(link).toHaveAttribute("prefetch", "false");
  });

  it("FeaturedCarousel falls back to /catalogo if section or slug missing", () => {
    const itemWithoutSlug = { ...mockItem, product_slug: "" };
    render(<FeaturedCarousel items={[itemWithoutSlug]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/catalogo");
  });
});
