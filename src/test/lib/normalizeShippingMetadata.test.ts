import { describe, expect, it } from "vitest";

import { normalizeShippingMetadata } from "@/lib/shipping/normalizeShippingMetadata";

describe("normalizeShippingMetadata", () => {
  it("rellena rate_used desde shipping_pricing aunque venía con valores previos o nulls", () => {
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
});
