// src/test/search.page.renders.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BuscarPage from "@/app/buscar/page";

// Mock fetch global
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

describe("BuscarPage renders", () => {
  it("should render empty state when q is empty", async () => {
    const result = await BuscarPage({ searchParams: {} });
    const { container } = await import("@testing-library/react").then((m) =>
      m.render(result),
    );

    expect(container.textContent).toContain("Escribe algo para buscar");
  });

  it("should render results with highlight when fetch returns items", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "1",
            section: "ortodoncia",
            product_slug: "arco-niti",
            title: "Arco Niti",
            price: 100,
            image_url: null,
          },
        ],
        total: 1,
        page: 1,
        perPage: 20,
      }),
    });

    const result = await BuscarPage({
      searchParams: { q: "arco" },
    });
    const { container } = await import("@testing-library/react").then((m) =>
      m.render(result),
    );

    expect(container.textContent).toContain("Arco Niti");
    expect(container.textContent).toContain("1 resultado");
  });

  it("should render no results message when fetch returns empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        total: 0,
        page: 1,
        perPage: 20,
      }),
    });

    const result = await BuscarPage({
      searchParams: { q: "xyz123" },
    });
    const { container } = await import("@testing-library/react").then((m) =>
      m.render(result),
    );

    expect(container.textContent).toContain("No encontramos resultados");
  });
});

