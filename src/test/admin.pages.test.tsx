import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAdminAccess } from "@/lib/admin/access";

// Mock de Supabase
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server-actions", () => ({
  createActionSupabase: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("Admin Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe denegar acceso si ADMIN_ALLOWED_EMAILS no está configurado", async () => {
    delete process.env.ADMIN_ALLOWED_EMAILS;
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          email: "user@example.com",
        },
      },
    });

    const result = await checkAdminAccess();

    expect(result.status).toBe("forbidden");
  });

  it("debe denegar acceso si el email no está en la lista", async () => {
    process.env.ADMIN_ALLOWED_EMAILS = "admin@example.com,otro@example.com";
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          email: "user@example.com",
        },
      },
    });

    const result = await checkAdminAccess();

    expect(result.status).toBe("forbidden");
  });

  it("debe permitir acceso si el email está en la lista", async () => {
    process.env.ADMIN_ALLOWED_EMAILS = "admin@example.com,otro@example.com";
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          email: "admin@example.com",
        },
      },
    });

    const result = await checkAdminAccess();

    expect(result.status).toBe("allowed");
    if (result.status === "allowed") {
      expect(result.userEmail).toBe("admin@example.com");
    }
  });

  it("debe manejar emails con mayúsculas/minúsculas", async () => {
    process.env.ADMIN_ALLOWED_EMAILS = "admin@example.com";
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          email: "ADMIN@EXAMPLE.COM",
        },
      },
    });

    const result = await checkAdminAccess();

    expect(result.status).toBe("allowed");
    if (result.status === "allowed") {
      expect(result.userEmail).toBe("admin@example.com");
    }
  });

  it("debe denegar acceso si el usuario no está autenticado", async () => {
    process.env.ADMIN_ALLOWED_EMAILS = "admin@example.com";
    mockGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const result = await checkAdminAccess();

    expect(result.status).toBe("unauthenticated");
  });
});

