// src/test/section.no404.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import CatalogoSectionPage from "@/app/catalogo/[section]/page";

// Mock de las funciones de Supabase
vi.mock("@/lib/supabase/catalog", () => ({
  listBySection: vi.fn(),
}));

vi.mock("@/lib/catalog/getProductsBySectionFromView.server", () => ({
  getProductsBySectionFromView: vi.fn(),
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
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/components/CatalogCardControls", () => ({
  default: () => <div>Controls</div>,
}));

describe("Section page no-404", () => {
  it("renders empty state when section has no products", async () => {
    const { listBySection } = await import("@/lib/supabase/catalog");
    const { getProductsBySectionFromView } = await import(
      "@/lib/catalog/getProductsBySectionFromView.server"
    );

    vi.mocked(listBySection).mockResolvedValue([]);
    vi.mocked(getProductsBySectionFromView).mockResolvedValue([]);

    const result = await CatalogoSectionPage({
      params: { section: "test-section" },
    });
    const html = render(result as React.ReactElement);

    expect(html.getByText("Sin productos en esta sección")).toBeInTheDocument();
    expect(html.getByText("Destacados")).toBeInTheDocument();
    expect(html.getByText("buscar")).toBeInTheDocument();
  });

  it("renders empty state when section is invalid", async () => {
    const result = await CatalogoSectionPage({
      params: { section: "" },
    });
    const html = render(result as React.ReactElement);

    expect(html.getByText("Sección inválida")).toBeInTheDocument();
  });

  it("does not crash on error", async () => {
    const { listBySection } = await import("@/lib/supabase/catalog");
    vi.mocked(listBySection).mockRejectedValue(new Error("DB error"));

    const result = await CatalogoSectionPage({
      params: { section: "test-section" },
    });

    // Debe renderizar sin crashear
    expect(result).toBeDefined();
  });
});
