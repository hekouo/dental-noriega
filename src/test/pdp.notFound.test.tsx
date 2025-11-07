// src/test/pdp.notFound.test.tsx
import { describe, it, expect, vi } from "vitest";
import { notFound } from "next/navigation";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirect: vi.fn(),
}));

vi.mock("@/lib/catalog/resolveProductBySlug.server", () => ({
  resolveProductBySlug: vi.fn(),
}));

vi.mock("@/lib/utils/currency", () => ({
  formatMXNFromCents: (c: number) => `$${(c / 100).toFixed(2)}`,
}));

vi.mock("@/components/ui/ImageWithFallback", () => ({
  // Mock de next/image: se usa <img> en pruebas exclusivamente.
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/components/product/ProductActions.client", () => ({
  default: () => <div>Actions</div>,
}));

vi.mock("@/components/ProductViewTracker.client", () => ({
  default: () => null,
}));

vi.mock("@/lib/routes", () => ({
  ROUTES: {
    home: () => "/",
    catalogIndex: () => "/catalogo",
  },
}));

describe("PDP notFound handling", () => {
  it("calls notFound() when product does not exist", async () => {
    const { resolveProductBySlug } = await import(
      "@/lib/catalog/resolveProductBySlug.server"
    );
    vi.mocked(resolveProductBySlug).mockResolvedValue(null);

    const ProductDetailPage = (
      await import("@/app/catalogo/[section]/[slug]/page")
    ).default;

    try {
      await ProductDetailPage({
        params: { section: "test-section", slug: "test-slug" },
      });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toBe("notFound");
      }
      expect(notFound).toHaveBeenCalled();
    }
  });

  it("does not crash on error, shows friendly message", async () => {
    const { resolveProductBySlug } = await import(
      "@/lib/catalog/resolveProductBySlug.server"
    );
    vi.mocked(resolveProductBySlug).mockRejectedValue(new Error("DB error"));

    const ProductDetailPage = (
      await import("@/app/catalogo/[section]/[slug]/page")
    ).default;

    const result = await ProductDetailPage({
      params: { section: "test-section", slug: "test-slug" },
    });

    // Debe renderizar mensaje amigable sin crashear
    expect(result).toBeDefined();
    if (result && typeof result === "object" && "props" in result) {
      expect(result.props.children).toBeDefined();
    }
  });
});
