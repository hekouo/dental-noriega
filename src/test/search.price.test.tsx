// src/test/search.price.test.tsx
import { describe, it, expect } from "vitest";
import { formatMXN, toNumberSafe } from "@/lib/utils/money";

describe("money utils", () => {
  it("formatea números y strings válidos", () => {
    expect(formatMXN(90)).toContain("$");
    expect(formatMXN("90")).toContain("$");
    expect(formatMXN("90.00")).toContain("$");
  });

  it("resiste basura y no muestra NaN", () => {
    expect(formatMXN(undefined)).toBe("—");
    expect(formatMXN(null)).toBe("—");
    expect(formatMXN("N/A")).toBe("—");
  });

  it("toNumberSafe limpia strings con símbolos", () => {
    expect(toNumberSafe("$90.00 MXN")).toBe(90);
    expect(toNumberSafe("90")).toBe(90);
    expect(toNumberSafe(90)).toBe(90);
    expect(toNumberSafe(null)).toBeNull();
    expect(toNumberSafe(undefined)).toBeNull();
  });
});

