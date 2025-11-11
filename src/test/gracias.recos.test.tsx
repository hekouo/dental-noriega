// src/test/gracias.recos.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RecommendedClient from "@/app/checkout/gracias/Recommended.client";

// Mock de persist
vi.mock("@/lib/utils/persist", () => ({
  getWithTTL: vi.fn(),
  KEYS: { LAST_ORDER: "DDN_LAST_ORDER_V1" },
}));

// Mock de FeaturedGrid
vi.mock("@/components/FeaturedGrid", () => ({
  default: ({ items }: { items: any[] }) => (
    <div data-testid="featured-grid">
      {items.map((item) => (
        <div key={item.product_id}>{item.title}</div>
      ))}
    </div>
  ),
}));

// Mock de fetch
global.fetch = vi.fn();

describe("RecommendedClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders recommendations with DDN_LAST_ORDER_V1 simulated", async () => {
    const { getWithTTL } = await import("@/lib/utils/persist");
    vi.mocked(getWithTTL).mockReturnValue({
      orderRef: "DDN-20250101-12345",
      items: [{ section: "ortodoncia-brackets-y-tubos", slug: "test-product" }],
    });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "1",
            slug: "recommended-1",
            section: "ortodoncia-brackets-y-tubos",
            title: "Recommended Product 1",
            price_cents: 10000,
            image_url: null,
            in_stock: true,
            is_active: true,
          },
        ],
      }),
    } as Response);

    render(<RecommendedClient />);

    await waitFor(() => {
      expect(
        screen.getByText(/También te puede interesar/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId("featured-grid")).toBeInTheDocument();
    });
  });

  it("shows CTA when no recommendations available", async () => {
    const { getWithTTL } = await import("@/lib/utils/persist");
    vi.mocked(getWithTTL).mockReturnValue(null);

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);

    render(<RecommendedClient />);

    await waitFor(() => {
      expect(
        screen.getByText(/Sin recomendados disponibles/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Ver destacados/i)).toBeInTheDocument();
      expect(screen.getByText(/Buscar productos/i)).toBeInTheDocument();
    });
  });
});
