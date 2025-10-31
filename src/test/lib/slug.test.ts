import { describe, it, expect } from "vitest";
import { normalizeSlug } from "../../lib/utils/slug";

describe("normalizeSlug", () => {
  it("convierte a minúsculas y reemplaza espacios por guiones", () => {
    expect(normalizeSlug("Nitrilo Azul Talla M")).toBe("nitrilo-azul-talla-m");
  });

  it("elimina acentos/diacríticos", () => {
    expect(normalizeSlug("Guantes Clínicos – Prótesis")).toBe("guantes-clinicos-protesis");
  });

  it("colapsa múltiples separadores en un solo guion", () => {
    expect(normalizeSlug("  A---B__C   ")).toBe("a-b-c");
  });

  it("recorta guiones al inicio/fin", () => {
    expect(normalizeSlug("---Hola Mundo---")).toBe("hola-mundo");
  });

  it("maneja strings vacíos", () => {
    expect(normalizeSlug("")).toBe("");
  });

  it("mantiene números y letras", () => {
    expect(normalizeSlug("Brackets 3M 0.022 MBT")).toBe("brackets-3m-0-022-mbt");
  });
});

