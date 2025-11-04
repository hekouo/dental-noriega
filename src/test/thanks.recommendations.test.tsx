// src/test/thanks.recommendations.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RecommendedClient from "@/app/checkout/gracias/Recommended.client";
import * as persistModule from "@/lib/utils/persist";

// Mock persist
vi.mock("@/lib/utils/persist", () => ({
  getWithTTL: vi.fn(),
  KEYS: {
    LAST_ORDER: "DDN_LAST_ORDER_V1",
  },
}));

const getWithTTL = persistModule.getWithTTL as ReturnType<typeof vi.fn>;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RecommendedClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Caso A: DDN_LAST_ORDER_V1 con section y slug → renderiza 4 productos", async () => {
    getWithTTL.mockReturnValue({
      orderRef: "DDN-202511-TEST",
      items: [
        {
          section: "consumibles-y-profilaxis",
          slug: "aeropulidor",
          title: "Aeropulidor",
          price: 100,
          qty: 1,
        },
      ],
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "1",
            section: "consumibles-y-profilaxis",
            product_slug: "product-1",
            title: "Product 1",
            price_cents: 10000,
            image_url: null,
          },
          {
            id: "2",
            section: "consumibles-y-profilaxis",
            product_slug: "product-2",
            title: "Product 2",
            price_cents: 20000,
            image_url: null,
          },
          {
            id: "3",
            section: "consumibles-y-profilaxis",
            product_slug: "product-3",
            title: "Product 3",
            price_cents: 30000,
            image_url: null,
          },
          {
            id: "4",
            section: "consumibles-y-profilaxis",
            product_slug: "product-4",
            title: "Product 4",
            price_cents: 40000,
            image_url: null,
          },
        ],
      }),
    });

    render(<RecommendedClient />);

    await waitFor(() => {
      expect(
        screen.getByText("Productos recomendados para ti"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Product 2")).toBeInTheDocument();
    expect(screen.getByText("Product 3")).toBeInTheDocument();
    expect(screen.getByText("Product 4")).toBeInTheDocument();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/products/by-section"),
    );
  });

  it("Caso B: sin last order → muestra CTA y no crashea", async () => {
    getWithTTL.mockReturnValue(null);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "1",
            section: "consumibles-y-profilaxis",
            product_slug: "product-1",
            title: "Product 1",
            price_cents: 10000,
            image_url: null,
          },
        ],
      }),
    });

    render(<RecommendedClient />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // No debería crashear, debería mostrar algo
    expect(
      screen.queryByText("Productos recomendados para ti"),
    ).toBeInTheDocument();
  });

  it("Caso C: endpoint devuelve vacío → muestra 'Sin recomendados' y link", async () => {
    getWithTTL.mockReturnValue({
      orderRef: "DDN-202511-TEST",
      items: [{ section: "consumibles-y-profilaxis", slug: "test" }],
    });

    // Primera llamada devuelve vacío
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    // Fallback también devuelve vacío
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<RecommendedClient />);

    await waitFor(() => {
      expect(screen.getByText(/Sin recomendados/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /Ver catálogo completo/i }),
    ).toBeInTheDocument();
  });
});
