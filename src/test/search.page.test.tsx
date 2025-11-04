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

    // Mock fetch para /api/products/search
    const mockSearchResponse = {
      items: [
        {
          id: "1",
          section: "materiales",
          product_slug: "producto-1",
          title: "Guantes Nitrilo Azul",
          price: 50,
          image_url: null,
        },
        {
          id: "2",
          section: "materiales",
          product_slug: "producto-2",
          title: "Guantes Nitrilo Verde",
          price: 55,
          image_url: null,
        },
        {
          id: "3",
          section: "equipos",
          product_slug: "producto-3",
          title: "Equipo Dental Pro",
          price: 150,
          image_url: null,
        },
      ],
      total: 3,
      page: 1,
      perPage: 20,
    };

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/api/products/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
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
      price: 50,
      image_url: null,
    }));

    const mockSearchResponse = {
      items: manyProducts.slice(0, 20),
      total: 25,
      page: 1,
      perPage: 20,
    };

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/api/products/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
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
      price: 50,
      image_url: null,
    }));

    const mockSearchResponse = {
      items: manyProducts.slice(0, 20),
      total: 25,
      page: 1,
      perPage: 20,
    };

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/api/products/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
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

  it("renders /buscar?q=arco with results", async () => {
    const mockSearchResponse = {
      items: [
        {
          id: "1",
          section: "ortodoncia_arcos_y_resortes",
          product_slug: "arco-niti-0-014",
          title: "Arco Niti 0.014",
          price: 150,
          image_url: null,
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    };

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/api/products/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "arco";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      const cards = screen.getAllByTestId("search-result-card");
      expect(cards.length).toBeGreaterThan(0);
      expect(screen.getByText(/arco niti/i)).toBeInTheDocument();
    });
  });

  it("renders /buscar?q=bracket%20ceramico with cerámico result", async () => {
    const mockSearchResponse = {
      items: [
        {
          id: "2",
          section: "ortodoncia_brackets_y_tubos",
          product_slug: "bracket-ceramico-roth-azdent",
          title: "Bracket Cerámico Roth Azdent",
          price: 200,
          image_url: null,
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    };

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/api/products/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSearchParams as any).mockReturnValue({
      get: (key: string) => {
        if (key === "q") return "bracket ceramico";
        if (key === "page") return "1";
        return null;
      },
    });

    render(<BuscarPage />);

    await waitFor(() => {
      expect(screen.getByText(/bracket cerámico/i)).toBeInTheDocument();
    });
  });

  it("should show empty state when no results", async () => {
    const mockSearchResponse = {
      items: [],
      total: 0,
      page: 1,
      perPage: 20,
    };

    const mockFetch = vi.fn((url: string) => {
      if (url.includes("/api/products/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = mockFetch;

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
        screen.getByText(/no encontramos resultados/i),
      ).toBeInTheDocument();
    });
  });
});

