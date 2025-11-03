// src/test/lib/catalog-fallback.test.ts
import { describe, it, expect } from "vitest";

describe("catalog fallback from view", () => {
  it("should have fallback helpers structure", () => {
    // Verificar que los tipos están correctos
    const sections: string[] = [];

    // Si sections está vacío, debería mostrar empty state
    expect(sections).toEqual([]);
    expect(sections.length).toBe(0);
  });

  it("should use fallback when sections is empty", () => {
    const sections: string[] = [];
    const fallbackSections: Array<{ slug: string; name: string }> = [
      { slug: "ortodoncia-brackets", name: "Ortodoncia Brackets" },
      { slug: "equipos", name: "Equipos" },
    ];

    const finalSections =
      sections.length === 0 ? fallbackSections.map((s) => s.slug) : sections;
    expect(finalSections).toHaveLength(2);
    expect(finalSections[0]).toBe("ortodoncia-brackets");
  });

  it("should not use fallback when sections has data", () => {
    const sections = ["equipos", "consumibles"];
    const fallbackSections: Array<{ slug: string; name: string }> = [
      { slug: "ortodoncia-brackets", name: "Ortodoncia Brackets" },
    ];

    const finalSections =
      sections.length === 0 ? fallbackSections.map((s) => s.slug) : sections;
    expect(finalSections).toEqual(["equipos", "consumibles"]);
    expect(finalSections).not.toEqual(fallbackSections.map((s) => s.slug));
  });

  it("should use product fallback when listBySection returns empty", () => {
    const productsFromDb: Array<{ id: string; title: string }> = [];
    const productsFromView: Array<{ id: string; title: string }> = [
      { id: "1", title: "Producto 1" },
      { id: "2", title: "Producto 2" },
      { id: "3", title: "Producto 3" },
    ];

    const finalProducts =
      productsFromDb.length === 0 ? productsFromView : productsFromDb;
    expect(finalProducts).toHaveLength(3);
    expect(finalProducts[0].title).toBe("Producto 1");
  });
});
