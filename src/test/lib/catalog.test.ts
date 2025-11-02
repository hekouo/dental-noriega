import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDebugEnabled } from "../../lib/utils/debug";
import {
  getFeaturedProducts,
  listBySection,
  getBySectionSlug,
} from "../../lib/supabase/catalog";
import { normalizeImageUrl } from "../../lib/img/normalizeImageUrl";

describe("isDebugEnabled", () => {
  const originalEnv = process.env.ALLOW_DEBUG_ROUTES;

  beforeEach(() => {
    delete process.env.ALLOW_DEBUG_ROUTES;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOW_DEBUG_ROUTES = originalEnv;
    } else {
      delete process.env.ALLOW_DEBUG_ROUTES;
    }
  });

  it("should return false when ALLOW_DEBUG_ROUTES is not set", () => {
    expect(isDebugEnabled()).toBe(false);
  });

  it("should return false when ALLOW_DEBUG_ROUTES is empty", () => {
    process.env.ALLOW_DEBUG_ROUTES = "";
    expect(isDebugEnabled()).toBe(false);
  });

  it("should return true when ALLOW_DEBUG_ROUTES is '1'", () => {
    process.env.ALLOW_DEBUG_ROUTES = "1";
    expect(isDebugEnabled()).toBe(true);
  });

  it("should return true when ALLOW_DEBUG_ROUTES is 'true'", () => {
    process.env.ALLOW_DEBUG_ROUTES = "true";
    expect(isDebugEnabled()).toBe(true);
  });

  it("should return true when ALLOW_DEBUG_ROUTES is 'TRUE'", () => {
    process.env.ALLOW_DEBUG_ROUTES = "TRUE";
    expect(isDebugEnabled()).toBe(true);
  });

  it("should return false when ALLOW_DEBUG_ROUTES is '0'", () => {
    process.env.ALLOW_DEBUG_ROUTES = "0";
    expect(isDebugEnabled()).toBe(false);
  });
});

describe("catalog functions with null envs", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  });

  it("getFeaturedProducts should return empty array without throwing", async () => {
    const result = await getFeaturedProducts();
    expect(result).toEqual([]);
  });

  it("listBySection should return empty array without throwing", async () => {
    const result = await listBySection("equipos");
    expect(result).toEqual([]);
  });

  it("getBySectionSlug should return null without throwing", async () => {
    const result = await getBySectionSlug("equipos", "test-slug");
    expect(result).toBeNull();
  });
});

describe("catalog edge cases", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  });

  it("listBySection should return empty array for unknown section", async () => {
    const result = await listBySection("seccion-desconocida-12345");
    expect(result).toEqual([]);
  });

  it("listBySection should return empty array for empty section", async () => {
    const result = await listBySection("");
    expect(result).toEqual([]);
  });

  it("getBySectionSlug should return null for unknown section", async () => {
    const result = await getBySectionSlug("seccion-desconocida", "test-slug");
    expect(result).toBeNull();
  });
});

describe("normalizeImageUrl edge cases", () => {
  it("should return fallback for null/undefined", () => {
    expect(normalizeImageUrl(null)).toBe("/images/fallback-product.png");
    expect(normalizeImageUrl(undefined)).toBe("/images/fallback-product.png");
  });

  it("should return fallback for invalid URL", () => {
    expect(normalizeImageUrl("not-a-valid-url")).toBe(
      "/images/fallback-product.png",
    );
    expect(normalizeImageUrl("ht tp://invalid")).toBe(
      "/images/fallback-product.png",
    );
  });

  it("should return original URL for valid non-Drive hosts", () => {
    expect(normalizeImageUrl("https://example.com/image.jpg")).toBe(
      "https://example.com/image.jpg",
    );
    expect(
      normalizeImageUrl("https://lh3.googleusercontent.com/d/abc123"),
    ).toBe("https://lh3.googleusercontent.com/d/abc123");
  });

  it("should normalize Drive URLs with id parameter", () => {
    const driveUrl = "https://drive.google.com/uc?export=view&id=abc123xyz";
    const result = normalizeImageUrl(driveUrl, 512);
    expect(result).toBe(
      "https://lh3.googleusercontent.com/d/abc123xyz=w512-h512-c",
    );
  });

  it("should return original Drive URL if no id parameter", () => {
    const driveUrl = "https://drive.google.com/uc?export=view";
    const result = normalizeImageUrl(driveUrl);
    expect(result).toBe(driveUrl);
  });

  it("should handle image URLs with invalid hosts gracefully", () => {
    // URLs con hosts que no son válidos pero no fallan en parse
    const invalidHostUrl = "https://invalid-host-name-12345.com/image.jpg";
    const result = normalizeImageUrl(invalidHostUrl);
    // Debería retornar la URL original (no es Drive, no tiene fallback)
    expect(result).toBe(invalidHostUrl);
  });
});
