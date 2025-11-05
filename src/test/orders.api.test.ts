import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/orders/route";

// Mock de Supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
    })),
  })),
}));

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  });

  it("debe validar datos mínimos y retornar 400 si faltan", async () => {
    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Datos de orden inválidos");
  });

  it("debe insertar en Supabase si hay envs", async () => {
    const orderPayload = {
      items: [
        {
          product_id: "prod-1",
          title: "Producto 1",
          price_cents: 10000,
          qty: 2,
        },
      ],
      shipping: { method: "standard" as const, cost_cents: 9900 },
      datos: {
        nombre: "Juan",
        telefono: "1234567890",
        direccion: "Calle 123",
        colonia: "Centro",
        estado: "CDMX",
        cp: "12345",
      },
      totals: {
        subtotal_cents: 10000,
        shipping_cents: 9900,
        total_cents: 19900,
      },
    };

    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
    mockSingle.mockResolvedValue({
      data: { id: "order-uuid-123" },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order_id).toBe("order-uuid-123");
    expect(data.order_ref).toMatch(/^DDN-\d{8}-[A-Z0-9]{5}$/);
  });

  it("debe hacer fallback a mock si no hay envs de Supabase", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const orderPayload = {
      items: [
        {
          product_id: "prod-1",
          title: "Producto 1",
          price_cents: 10000,
          qty: 1,
        },
      ],
      shipping: { method: "pickup" as const, cost_cents: 0 },
      datos: {
        nombre: "Juan",
        telefono: "1234567890",
        direccion: "Calle 123",
        colonia: "Centro",
        estado: "CDMX",
        cp: "12345",
      },
      totals: {
        subtotal_cents: 10000,
        shipping_cents: 0,
        total_cents: 10000,
      },
    };

    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify(orderPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order_id).toBeNull();
    expect(data.order_ref).toMatch(/^DDN-\d{8}-[A-Z0-9]{5}$/);
  });
});

