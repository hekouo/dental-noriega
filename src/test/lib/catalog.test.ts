import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isDebugEnabled } from "../../lib/utils/debug";
import {
  getFeaturedProducts,
  listBySection,
  getBySectionSlug,
} from "../../lib/supabase/catalog";

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

