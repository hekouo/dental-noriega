import { describe, expect, it } from "vitest";

import { normalizeShippingMetadata } from "@/lib/shipping/normalizeShippingMetadata";

/** Fixture que reproduce el bug de producción: pricing con números, rate_used nulls, _last_write apply-rate */
const PRODUCTION_FIXTURE = {
  shipping_pricing: {
    carrier_cents: 14964,
    packaging_cents: 2000,
    margin_cents: 3671,
    total_cents: 21635,
  },
  shipping: {
    rate_used: {
      external_rate_id: "rate_xyz",
      provider: "skydropx",
      service: "express",
      carrier_cents: null,
      price_cents: null,
      customer_total_cents: null,
    },
    _last_write: { route: "apply-rate", at: "2025-01-22T00:00:00.000Z", sha: "abc1234" },
  },
} as const;

describe("normalizeShippingMetadata", () => {
  it("reproducción prod: pricing con números + rate_used nulls → normalizar rellena rate_used", () => {
    const metadata = { ...PRODUCTION_FIXTURE };
    const result = normalizeShippingMetadata(metadata, { source: "admin", orderId: "test" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.price_cents).toBe(21635);
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.customer_total_cents).toBe(21635);
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
  });

  it("backfill desde shipping_pricing aunque rate_used venga con nulls", () => {
    const metadata = {
      shipping_pricing: {
        carrier_cents: 10000,
        packaging_cents: 2000,
        margin_cents: 500,
        total_cents: 12500,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_123",
          provider: "skydropx",
          service: "express",
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
        },
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(10000);
    expect(rateUsed.price_cents).toBe(12500);
    expect(rateUsed.customer_total_cents).toBe(12500);
  });

  it("sobrescribe rate_used desde shipping_pricing incluso si venía con valores incorrectos", () => {
    const metadata = {
      shipping_pricing: {
        carrier_cents: 14964,
        packaging_cents: 2000,
        margin_cents: 3306,
        total_cents: 20270,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_456",
          provider: "skydropx",
          service: "standard",
          carrier_cents: 5000, // valor incorrecto
          price_cents: 8000, // valor incorrecto
          customer_total_cents: 9000, // valor incorrecto
        },
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    // Debe sobrescribir con valores de shipping_pricing (overwrite forzado)
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(20270);
    expect(rateUsed.customer_total_cents).toBe(20270);
  });

  it("garantiza que rate_used nunca queda con nulls cuando shipping_pricing existe (caso merge)", () => {
    // Simula un caso donde un endpoint hace merge después de normalizar
    const metadata = {
      shipping_pricing: {
        carrier_cents: 14964,
        packaging_cents: 2000,
        margin_cents: 3306,
        total_cents: 20270,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_789",
          provider: "skydropx",
          service: "express",
          carrier_cents: null, // null explícito
          price_cents: null, // null explícito
          customer_total_cents: null, // null explícito
        },
        // Simula que otro campo se agregó después
        tracking_number: "TRACK123",
      },
    };

    // Primera normalización
    const result1 = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    // Simula un merge incorrecto (bug que queremos prevenir)
    const badMerge = {
      ...metadata,
      shipping: {
        ...metadata.shipping,
        ...result1.shippingMeta,
        // Bug: reintroduce rate_used con nulls
        rate_used: {
          ...metadata.shipping.rate_used,
          tracking_number: "TRACK123", // campo adicional
        },
      },
    };

    // Re-normalizar después del merge (esto es lo que debe hacer cada endpoint)
    const result2 = normalizeShippingMetadata(badMerge, {
      source: "admin",
    });

    const rateUsed = result2.shippingMeta.rate_used as Record<string, unknown>;
    // Debe forzar overwrite incluso después del merge incorrecto
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(20270);
    expect(rateUsed.customer_total_cents).toBe(20270);
    // No debe quedar null nunca
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
  });

  it("Test B: con shipping_pricing y rate_used nulls → rate_used.price_cents === total_cents, rate_used.carrier_cents === carrier_cents", () => {
    const metadata = {
      shipping_pricing: { carrier_cents: 14964, packaging_cents: 2000, margin_cents: 3306, total_cents: 20270 },
      shipping: {
        rate_used: {
          external_rate_id: "r",
          provider: "skydropx",
          service: "s",
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
        },
      },
    };
    const result = normalizeShippingMetadata(metadata, { source: "admin" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.price_cents).toBe(metadata.shipping_pricing.total_cents);
    expect(rateUsed.carrier_cents).toBe(metadata.shipping_pricing.carrier_cents);
    expect(rateUsed.customer_total_cents).toBe(metadata.shipping_pricing.total_cents);
  });

  it("merge bug: pricing ok pero rate_used null → overwrite forzado rellena sin nulls", () => {
    const metadata = {
      shipping_pricing: { carrier_cents: 14964, total_cents: 20270 },
      shipping: {
        rate_used: { provider: "skydropx", service: "s", carrier_cents: null, price_cents: null, customer_total_cents: null },
        _last_write: { route: "apply-rate" },
      },
    };
    const result = normalizeShippingMetadata(metadata, { source: "admin" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(20270);
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
  });

  it("string numbers (JSON/DB): shipping_pricing total_cents/carrier_cents como string → rellena rate_used", () => {
    const metadata = {
      shipping_pricing: { carrier_cents: "14964" as unknown, total_cents: "21635" as unknown },
      shipping: { rate_used: { provider: "skydropx", service: "s", carrier_cents: null, price_cents: null } },
    };
    const result = normalizeShippingMetadata(metadata, { source: "admin" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(21635);
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
  });

  it("fallback: si falta shipping_pricing pero existe shipping.pricing, también rellena rate_used", () => {
    const metadata = {
      shipping: {
        pricing: {
          carrier_cents: 12000,
          packaging_cents: 1500,
          margin_cents: 800,
          total_cents: 14300,
        },
        rate_used: {
          external_rate_id: "rate_fb",
          provider: "skydropx",
          service: "express",
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
        },
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(12000);
    expect(rateUsed.price_cents).toBe(14300);
    expect(rateUsed.customer_total_cents).toBe(14300);
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
  });
});
