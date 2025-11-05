// src/test/featured.render.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FeaturedGrid from "@/components/FeaturedGrid";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

// Mock del componente FeaturedCard
vi.mock("@/components/FeaturedCard", () => ({
  default: ({ item }: { item: FeaturedItem }) => (
    <div data-testid="featured-card">{item.title}</div>
  ),
}));

describe("FeaturedGrid render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state without crashing", () => {
    const { container } = render(<FeaturedGrid items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders featured items when provided", () => {
    const items: FeaturedItem[] = [
      {
        product_id: "1",
        product_slug: "test-product",
        section: "test-section",
        title: "Test Product",
        description: null,
        price_cents: 10000,
        currency: "mxn",
        stock_qty: 10,
        image_url: null,
        position: 0,
      },
    ];

    render(<FeaturedGrid items={items} />);
    expect(screen.getByTestId("featured-card")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
  });
});
