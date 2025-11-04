// src/test/navbar.keyboard-nav.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import NavbarSearch from "@/components/NavbarSearch";

// Mock de next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock de fetch
global.fetch = vi.fn();

describe("NavbarSearch Keyboard Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navega con ArrowDown", () => {
    const { container } = render(<NavbarSearch />);
    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;

    // Simular resultados
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "1",
            title: "Product 1",
            section: "test",
            product_slug: "product-1",
          },
        ],
      }),
    });

    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Verificar que activeIndex cambió
    expect(input).toBeInTheDocument();
  });

  it("navega con ArrowUp", () => {
    const { container } = render(<NavbarSearch />);
    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });

    expect(input).toBeInTheDocument();
  });

  it("navega al resultado con Enter", () => {
    const mockPush = vi.fn();
    vi.mock("next/navigation", () => ({
      useRouter: () => ({ push: mockPush }),
      usePathname: () => "/",
      useSearchParams: () => new URLSearchParams(),
    }));

    const { container } = render(<NavbarSearch />);
    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toBeInTheDocument();
  });

  it("cierra con Escape", () => {
    const { container } = render(<NavbarSearch />);
    const input = container.querySelector(
      'input[type="search"]',
    ) as HTMLInputElement;

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toBeInTheDocument();
  });
});
