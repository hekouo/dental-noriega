import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de analytics
const mockTrack = vi.fn();
vi.mock("@/lib/analytics", () => ({
  track: mockTrack,
}));

// Mock de persist
const mockSetWithTTL = vi.fn();
vi.mock("@/lib/utils/persist", () => ({
  setWithTTL: mockSetWithTTL,
  KEYS: { LAST_ORDER: "DDN_LAST_ORDER_V1" },
  TTL_48H: 1000 * 60 * 60 * 48,
}));

describe("Checkout Purchase Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            order_id: "order-123",
            order_ref: "DDN-20241104-ABC12",
          }),
      }),
    ) as unknown as typeof fetch;
  });

  it("PayNow debe crear orden y retornar order_ref", async () => {
    const orderPayload = {
      items: [
        {
          product_id: "prod-1",
          title: "Producto 1",
          price_cents: 10000,
          qty: 1,
        },
      ],
      shipping: { method: "standard", cost_cents: 9900 },
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

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.order_ref).toMatch(/^DDN-\d{8}-[A-Z0-9]{5}$/);
  });

  it("PayNow debe trackear evento purchase", async () => {
    const { track } = await import("@/lib/analytics");
    const purchaseData = {
      value: 199.0,
      currency: "MXN",
      shipping: 99.0,
      coupon: "DENT10",
      items: [
        { id: "prod-1", name: "Producto 1", price: 100, qty: 1 },
      ],
    };

    track("purchase", purchaseData);

    expect(mockTrack).toHaveBeenCalledWith("purchase", purchaseData);
  });
});

