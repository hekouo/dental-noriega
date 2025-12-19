import { describe, it, expect } from "vitest";
import { sortProductImages } from "@/lib/catalog/sortProductImages";

describe("sortProductImages", () => {
  it("debe poner primero las imágenes con is_primary = true", () => {
    const images = [
      { url: "/img2.jpg", is_primary: false },
      { url: "/img1.jpg", is_primary: true },
      { url: "/img3.jpg", is_primary: null },
    ];

    const sorted = sortProductImages(images);

    expect(sorted[0].url).toBe("/img1.jpg");
    expect(sorted[0].is_primary).toBe(true);
  });

  it("debe ordenar por created_at ascendente cuando no hay is_primary", () => {
    const images = [
      { url: "/img2.jpg", created_at: "2024-01-02T00:00:00Z" },
      { url: "/img1.jpg", created_at: "2024-01-01T00:00:00Z" },
      { url: "/img3.jpg", created_at: "2024-01-03T00:00:00Z" },
    ];

    const sorted = sortProductImages(images);

    expect(sorted[0].url).toBe("/img1.jpg");
    expect(sorted[1].url).toBe("/img2.jpg");
    expect(sorted[2].url).toBe("/img3.jpg");
  });

  it("debe combinar is_primary y created_at correctamente", () => {
    const images = [
      { url: "/img2.jpg", is_primary: false, created_at: "2024-01-01T00:00:00Z" },
      { url: "/img1.jpg", is_primary: true, created_at: "2024-01-02T00:00:00Z" },
      { url: "/img3.jpg", is_primary: true, created_at: "2024-01-01T00:00:00Z" },
    ];

    const sorted = sortProductImages(images);

    // Primero las is_primary, ordenadas por created_at
    expect(sorted[0].url).toBe("/img3.jpg"); // is_primary + created_at más antiguo
    expect(sorted[1].url).toBe("/img1.jpg"); // is_primary + created_at más reciente
    expect(sorted[2].url).toBe("/img2.jpg"); // no primary
  });

  it("debe manejar imágenes sin created_at", () => {
    const images = [
      { url: "/img2.jpg", is_primary: false },
      { url: "/img1.jpg", is_primary: true },
    ];

    const sorted = sortProductImages(images);

    expect(sorted[0].url).toBe("/img1.jpg");
    expect(sorted[1].url).toBe("/img2.jpg");
  });

  it("debe mantener el orden si todas tienen is_primary = true", () => {
    const images = [
      { url: "/img2.jpg", is_primary: true, created_at: "2024-01-02T00:00:00Z" },
      { url: "/img1.jpg", is_primary: true, created_at: "2024-01-01T00:00:00Z" },
    ];

    const sorted = sortProductImages(images);

    expect(sorted[0].url).toBe("/img1.jpg");
    expect(sorted[1].url).toBe("/img2.jpg");
  });
});

