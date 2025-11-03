// src/test/search.page.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import BuscarPage from "@/app/buscar/page";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/components/SearchInput.client", () => ({
  __esModule: true,
  default: () => <input data-testid="search-input" />,
}));

vi.mock("@/components/SearchResultCard", () => ({
  __esModule: true,
  default: ({
    item,
    highlightQuery,
  }: {
    item: { title: string };
    highlightQuery?: string;
  }) => (
    <div data-testid="search-result-card">
      <div>{item.title}</div>
      {highlightQuery && <div data-testid="highlight">{highlightQuery}</div>}
    </div>
  ),
}));

vi.mock("@/components/SearchTracker.client", () => ({
  __esModule: true,
  default: () => null,
}));

describe("Search Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch para /api/products/all
    const mockProducts = [
      {
        id: "1",
        section: "materiales",
        product_slug: "producto-1",
        title: "Guantes Nitrilo Azul",
        price_cents: 5000,
        image_url: null,
        in_stock: true,
      },
      {
        id: "2",
        section: "materiales",
        product_slug: "producto-2",
        title: "Guantes Nitrilo Verde",
        price_cents: 5500,
        image_url: null,
        in_stock: true,
      },
      {
        id: "3",
        section: "equipos",
        product_slug: "producto-3",
        title: "Equipo Dental Pro",
        price_cents: 15000,
        image_url: null,
        in_stock: true,
      },
    ];

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;
  });

  it("should paginate results correctly (20 per page)", async () => {
    // Crear 25 productos para probar paginación
    const manyProducts = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      section: "materiales",
      product_slug: `producto-${i + 1}`,
      title: `Producto ${i + 1}`,
      price_cents: 5000,
      image_url: null,
      in_stock: true,
    }));

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(manyProducts),
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "producto";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId("search-result-card");
      // Primera página debe tener máximo 20 resultados
      expect(cards.length).toBeLessThanOrEqual(20);
    });
  });

  it("should highlight search query in titles", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "nitrilo";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      const highlights = screen.getAllByTestId("highlight");
      expect(highlights.length).toBeGreaterThan(0);
      highlights.forEach((highlight) => {
        expect(highlight.textContent).toBe("nitrilo");
      });
    });
  });

  it("should show pagination controls when multiple pages", async () => {
    const manyProducts = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      section: "materiales",
      product_slug: `producto-${i + 1}`,
      title: `Producto ${i + 1}`,
      price_cents: 5000,
      image_url: null,
      in_stock: true,
    }));

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(manyProducts),
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "producto";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      expect(screen.getByText(/página 1 de/i)).toBeInTheDocument();
      expect(screen.getByText(/siguiente/i)).toBeInTheDocument();
    });
  });

  it("should filter products by query in client", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "equipo";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      // Debe mostrar solo el producto que contiene "equipo"
      const cards = screen.getAllByTestId("search-result-card");
      expect(cards.length).toBe(1);
      expect(screen.getByText(/equipo dental pro/i)).toBeInTheDocument();
    });
  });

  it("should show empty state when no results", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "xyz123nonexistent";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/no se encontraron resultados/i),
      ).toBeInTheDocument();
    });
  });
});
