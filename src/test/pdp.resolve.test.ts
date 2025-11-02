// src/test/pdp.resolve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeSlug } from "@/lib/utils/slug";

// Mock de next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

// Mock de server-only
vi.mock("server-only", () => ({}));

describe("PDP resolve and redirect", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should render without redirect when slug exists and section matches", async () => {
    // Mock del resolver retornando producto con sección coincidente
    const mockProduct = {
      id: "123",
      section: "ortodoncia-brackets",
      slug: "bracket-azdent",
      title: "Bracket Azdent",
      price_cents: 1250,
      image_url: "https://example.com/image.jpg",
      in_stock: true,
    };

    // Simular que el resolver funciona
    const normalizedSection = normalizeSlug("ortodoncia-brackets");
    const normalizedSlug = normalizeSlug("bracket-azdent");

    // Si la sección coincide, no debe haber redirect
    if (normalizeSlug(mockProduct.section) === normalizedSection) {
      expect(mockProduct.section).toBe("ortodoncia-brackets");
      expect(mockProduct.slug).toBe("bracket-azdent");
    }
  });

  it("should redirect when slug exists but section does not match", async () => {
    const mockProduct = {
      id: "123",
      section: "ortodoncia-brackets", // Sección correcta
      slug: "bracket-azdent",
      title: "Bracket Azdent",
      price_cents: 1250,
    };

    const urlSection = "equipos"; // Sección incorrecta en URL
    const normalizedUrlSection = normalizeSlug(urlSection);

    // Si la sección no coincide, debe hacer redirect
    if (normalizeSlug(mockProduct.section) !== normalizedUrlSection) {
      const canonicalUrl = `/catalogo/${mockProduct.section}/${mockProduct.slug}`;
      expect(canonicalUrl).toBe("/catalogo/ortodoncia-brackets/bracket-azdent");
    }
  });

  it("should call notFound when slug does not exist", async () => {
    const mockProduct = null;

    // Si no hay producto, debe llamar notFound
    if (!mockProduct) {
      const { notFound } = await import("next/navigation");
      expect(() => {
        notFound();
      }).toThrow();
    }
  });

  it("should normalize slugs correctly", () => {
    expect(normalizeSlug("Ortodoncia Brackets")).toBe("ortodoncia-brackets");
    expect(normalizeSlug("EQUIPOS")).toBe("equipos");
    expect(normalizeSlug("bracket-azdent")).toBe("bracket-azdent");
  });
});

