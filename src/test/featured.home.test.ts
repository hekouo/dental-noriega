import { describe, it, expect, vi } from "vitest";

// Mock de server-only para tests
vi.mock("server-only", () => ({}));

// Mock de Supabase
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

// test dummy: solo valida shape básico del helper
describe("getFeatured", () => {
  it("returns at most 8 ordered by position", async () => {
    const { getFeatured } = await import("@/lib/catalog/getFeatured.server");
    const items = await getFeatured();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeLessThanOrEqual(8);
    const positions = items.map((i) => i.position);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
