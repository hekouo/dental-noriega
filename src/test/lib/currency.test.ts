import { describe, it, expect } from "vitest";
import { formatMXN, formatMXNFromCents } from "../../lib/utils/currency";

describe("formatMXN", () => {
  it("formats positive numbers correctly", () => {
    expect(formatMXN(100)).toBe("$100.00");
  });

  it("handles zero", () => {
    expect(formatMXN(0)).toBe("$0.00");
  });

  it("formats cents correctly", () => {
    expect(formatMXNFromCents(10000)).toBe("$100.00");
  });
});
