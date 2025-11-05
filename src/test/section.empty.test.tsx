// src/test/section.empty.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de helpers
vi.mock("@/lib/supabase/catalog", () => ({
  listBySection: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/catalog/getProductsBySectionFromView.server", () => ({
  getProductsBySectionFromView: vi.fn(() => Promise.resolve([])),
}));

// Mock de server-only
vi.mock("server-only", () => ({}));

describe("CatalogoSectionPage empty state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles empty section without crashing", async () => {
    const { default: CatalogoSectionPage } = await import(
      "@/app/catalogo/[section]/page"
    );

    const Page = await CatalogoSectionPage({
      params: { section: "test-section" },
    });

    // Verificar que la función retorna un elemento React válido
    expect(Page).toBeTruthy();
    expect(Page.type).toBeTruthy();
  });

  it("handles invalid section gracefully", async () => {
    const { default: CatalogoSectionPage } = await import(
      "@/app/catalogo/[section]/page"
    );

    const Page = await CatalogoSectionPage({
      params: { section: "" },
    });

    expect(Page).toBeTruthy();
  });
});
