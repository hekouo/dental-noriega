// src/test/pdp.resolve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveProductBySlug } from "@/lib/catalog/resolveProductBySlug.server";

// Mock de Supabase
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { message: "Not found" },
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/catalog", () => ({
  getProductBySlugAnySection: vi.fn(() => null),
}));

describe("resolveProductBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for non-existent product", async () => {
    const result = await resolveProductBySlug("non-existent-slug");
    expect(result).toBeNull();
  });

  it("handles missing envs gracefully", async () => {
    // Simular envs faltantes
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = await resolveProductBySlug("test-slug");
    expect(result).toBeNull();

    // Restaurar envs
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });
});
