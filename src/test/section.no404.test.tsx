// src/test/section.no404.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import CatalogoSectionPage from "@/app/catalogo/[section]/page";

// Mock de las funciones de catálogo
vi.mock("@/lib/catalog/getBySection.server", () => ({
  getBySection: vi.fn(),
}));

vi.mock("@/lib/utils/currency", () => ({
  formatMXN: (n: number) => `$${n.toFixed(2)}`,
  mxnFromCents: (c: number) => c / 100,
}));

vi.mock("@/lib/routes", () => ({
  ROUTES: {
    catalogIndex: () => "/catalogo",
  },
}));

vi.mock("@/lib/utils/whatsapp", () => ({
  generateWhatsAppLink: () => "https://wa.me/123",
}));

vi.mock("@/components/ui/ImageWithFallback", () => ({
  // Mock de next/image: usamos <img> simple en tests para evitar dependencias de Next.
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/components/CatalogCardControls", () => ({
  default: () => <div>Controls</div>,
}));

describe("Section page no-404", () => {
  it("renders empty state when section has no products", async () => {
    const { getBySection } = await import("@/lib/catalog/getBySection.server");
    
    vi.mocked(getBySection).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 24,
      hasNextPage: false,
    });

    const result = await CatalogoSectionPage({
      params: { section: "test-section" },
      searchParams: {},
    });
    const html = render(result as React.ReactElement);

    expect(html.getByText("Sin productos en esta sección")).toBeInTheDocument();
    expect(html.getByText("Destacados")).toBeInTheDocument();
    expect(html.getByText("buscar")).toBeInTheDocument();
  });

  it("renders empty state when section is invalid", async () => {
    const result = await CatalogoSectionPage({
      params: { section: "" },
      searchParams: {},
    });
    const html = render(result as React.ReactElement);

    expect(html.getByText("Sección inválida")).toBeInTheDocument();
  });

  it("does not crash on error", async () => {
    const { getBySection } = await import("@/lib/catalog/getBySection.server");
    vi.mocked(getBySection).mockRejectedValue(new Error("DB error"));

    const result = await CatalogoSectionPage({
      params: { section: "test-section" },
      searchParams: {},
    });

    // Debe renderizar sin crashear
    expect(result).toBeDefined();
  });
});
