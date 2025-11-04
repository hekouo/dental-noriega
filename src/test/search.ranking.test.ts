// src/test/search.ranking.test.ts
import { describe, it, expect } from "vitest";
import { getMatchType, normalize } from "@/lib/search/normalize";

describe("Search Ranking", () => {
  it("exact match tiene prioridad sobre beginsWith", () => {
    const exactItem = {
      title: "Aeropulidor Dental",
      product_slug: "aeropulidor-dental",
      section: "consumibles",
    };
    const beginsWithItem = {
      title: "Aeropulidor Pro",
      product_slug: "aeropulidor-pro",
      section: "consumibles",
    };

    const exactMatch = getMatchType(exactItem, "aeropulidor dental");
    const beginsWithMatch = getMatchType(beginsWithItem, "aeropulidor");

    expect(exactMatch.type).toBe("exact");
    expect(beginsWithMatch.type).toBe("beginsWith");
    expect(exactMatch.score).toBeGreaterThan(beginsWithMatch.score);
  });

  it("beginsWith tiene prioridad sobre contains", () => {
    const beginsWithItem = {
      title: "Aeropulidor Dental",
      product_slug: "aeropulidor-dental",
      section: "consumibles",
    };
    const containsItem = {
      title: "Kit Aeropulidor Dental Premium",
      product_slug: "kit-aeropulidor-dental-premium",
      section: "consumibles",
    };

    const beginsWithMatch = getMatchType(beginsWithItem, "aeropulidor");
    const containsMatch = getMatchType(containsItem, "aeropulidor");

    expect(beginsWithMatch.type).toBe("beginsWith");
    expect(containsMatch.type).toBe("contains");
    expect(beginsWithMatch.score).toBeGreaterThan(containsMatch.score);
  });

  it("exact match funciona con título normalizado", () => {
    const item = {
      title: "Aeropulidor Dental",
      product_slug: "aeropulidor",
      section: "consumibles",
    };

    const match = getMatchType(item, normalize("Aeropulidor Dental"));
    expect(match.type).toBe("exact");
  });
});
