// src/test/search.page.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BuscarPage from "@/app/buscar/page";

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

describe("Search Page (RSC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch global para RSC
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
        {
          id: "2",
          section: "ortodoncia_brackets_y_tubos",
          product_slug: "bracket-ceramico-roth-azdent",
          title: "Bracket Cerámico Roth Azdent",
          price: 200,
          image_url: null,
        },
      ],
      total: 2,
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
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("renders /buscar?q=arco with results", async () => {
    const result = await BuscarPage({
      searchParams: { q: "arco", page: "1" },
    });
    const { container } = render(result);

    expect(screen.getByText(/arco niti/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="search-result-card"]').length).toBeGreaterThan(0);
  });

  it("renders /buscar?q=bracket%20ceramico with cerámico result", async () => {
    const result = await BuscarPage({
      searchParams: { q: "bracket ceramico", page: "1" },
    });
    render(result);

    expect(screen.getByText(/bracket cerámico/i)).toBeInTheDocument();
  });

  it("shows empty state when no query", async () => {
    const result = await BuscarPage({
      searchParams: {},
    });
    render(result);

    expect(screen.getByText(/escribe algo para buscar/i)).toBeInTheDocument();
  });

  it("shows empty state when no results", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [], total: 0, page: 1, perPage: 20 }),
      }),
    );

    const result = await BuscarPage({
      searchParams: { q: "xyz123nonexistent", page: "1" },
    });
    render(result);

    expect(screen.getByText(/no encontramos resultados/i)).toBeInTheDocument();
  });
});
