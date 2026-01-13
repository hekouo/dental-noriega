import { describe, it, expect } from "vitest";
import {
  sanitizeDigits,
  isValidMx10,
  toMxE164,
  toMxWhatsAppDigits,
  normalizeToMx10,
} from "@/lib/phone/mx";

describe("phone/mx", () => {
  describe("sanitizeDigits", () => {
    it("debe eliminar espacios y guiones", () => {
      expect(sanitizeDigits("55 1234 5678")).toBe("5512345678");
      expect(sanitizeDigits("55-1234-5678")).toBe("5512345678");
    });

    it("debe eliminar caracteres no numéricos", () => {
      expect(sanitizeDigits("55a12b34c56d78")).toBe("5512345678");
      expect(sanitizeDigits("+52 55 1234 5678")).toBe("525512345678");
    });

    it("debe preservar solo dígitos", () => {
      expect(sanitizeDigits("5512345678")).toBe("5512345678");
      expect(sanitizeDigits("1234567890")).toBe("1234567890");
    });
  });

  describe("isValidMx10", () => {
    it("debe validar exactamente 10 dígitos", () => {
      expect(isValidMx10("5512345678")).toBe(true);
      expect(isValidMx10("1234567890")).toBe(true);
    });

    it("debe rechazar menos de 10 dígitos", () => {
      expect(isValidMx10("551234567")).toBe(false);
      expect(isValidMx10("12345")).toBe(false);
      expect(isValidMx10("")).toBe(false);
    });

    it("debe rechazar más de 10 dígitos", () => {
      expect(isValidMx10("55123456789")).toBe(false);
      expect(isValidMx10("525512345678")).toBe(false);
    });
  });

  describe("toMxE164", () => {
    it("debe convertir 10 dígitos a formato E.164", () => {
      expect(toMxE164("5512345678")).toBe("+525512345678");
      expect(toMxE164("1234567890")).toBe("+521234567890");
    });

    it("debe lanzar error si no son 10 dígitos", () => {
      expect(() => toMxE164("551234567")).toThrow();
      expect(() => toMxE164("525512345678")).toThrow();
    });
  });

  describe("toMxWhatsAppDigits", () => {
    it("debe convertir 10 dígitos a formato WhatsApp", () => {
      expect(toMxWhatsAppDigits("5512345678")).toBe("5215512345678");
      expect(toMxWhatsAppDigits("1234567890")).toBe("5211234567890");
    });

    it("debe lanzar error si no son 10 dígitos", () => {
      expect(() => toMxWhatsAppDigits("551234567")).toThrow();
      expect(() => toMxWhatsAppDigits("525512345678")).toThrow();
    });
  });

  describe("normalizeToMx10", () => {
    it("debe preservar 10 dígitos exactos", () => {
      expect(normalizeToMx10("5512345678")).toBe("5512345678");
    });

    it("debe limpiar espacios y guiones de 10 dígitos", () => {
      expect(normalizeToMx10("55 1234 5678")).toBe("5512345678");
      expect(normalizeToMx10("55-1234-5678")).toBe("5512345678");
    });

    it("debe extraer últimos 10 dígitos de formato +52", () => {
      expect(normalizeToMx10("+525512345678")).toBe("5512345678");
      expect(normalizeToMx10("525512345678")).toBe("5512345678");
    });

    it("debe extraer últimos 10 dígitos de formato 521 (WhatsApp)", () => {
      expect(normalizeToMx10("5215512345678")).toBe("5512345678");
    });

    it("debe extraer últimos 10 dígitos si hay más de 10", () => {
      expect(normalizeToMx10("5255512345678")).toBe("5512345678");
    });

    it("debe retornar tal cual si tiene menos de 10 dígitos", () => {
      expect(normalizeToMx10("551234567")).toBe("551234567");
      expect(normalizeToMx10("12345")).toBe("12345");
      expect(normalizeToMx10("")).toBe("");
    });

    it("debe manejar input con caracteres no numéricos y código de país", () => {
      expect(normalizeToMx10("+52 55 1234 5678")).toBe("5512345678");
      expect(normalizeToMx10("52 55-1234-5678")).toBe("5512345678");
    });
  });
});
